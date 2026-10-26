/**
 * Host half of the CRT skin bundle.
 *
 * 皮肤与仪表盘都在 client.js 里；这里做三件事：
 * 1. 提供只读路由，让页面拿到 DeepSeek 账户余额（密钥只留在宿主进程里，不进浏览器）；
 * 2. 采集本机状态：CPU 占用、内存占用、当前输出速度（tok/s）、累计 token；
 * 3. 收浏览器半的上报，页面出问题时不用开控制台也能诊断。
 *
 * 速度是怎么来的：助手流式输出时会连续写 `assistant/live-chunk` 事件，
 * 这里按字符数做滑动窗口；每个 step 结束时拿到提供方的精确 outputTokens，
 * 用它反过来校准"每个字符大概几个 token"，所以中文、英文混排也能贴近真实值。
 */
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, cpus, freemem, totalmem } from 'node:os';
import * as zlib from 'node:zlib';

const CONFIG_PATH =
  process.env.DSH_BALANCE_CONFIG || join(homedir(), '.dsh', 'deepseek-balance.json');
const BALANCE_URL = 'https://api.deepseek.com/user/balance';
const CACHE_MS = 60_000;
const ROUTE_PATH = '/dsh-crt-theme/balance';
const STATS_PATH = '/dsh-crt-theme/stats';
const VERSION_PATH = '/dsh-crt-theme/version';
const REPORT_PATH = '/dsh-crt-theme/report';
const DIAG_PATH = '/dsh-crt-theme/diag';
const REPORT_LIMIT = 12;
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const SPEND_DIR = join(DSH_HOME, 'crt-theme');
const SPEND_FILE = join(SPEND_DIR, 'spend.json');
const SESSIONS_DIR = join(DSH_HOME, 'sessions');
const CLIENT_FILE = fileURLToPath(new URL('./client.js', import.meta.url));

const cache = { at: 0, payload: null, todaySpent: undefined };
const reports = [];
const bootErrors = [];

function recordReport(entry) {
  reports.push({ at: new Date().toISOString(), ...entry });
  while (reports.length > REPORT_LIMIT) reports.shift();
}

async function readApiKey() {
  const raw = await readFile(CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const key = typeof parsed.api_key === 'string' ? parsed.api_key.trim() : '';
  if (key === '') throw new Error('余额配置里没有 api_key');
  return key;
}

async function fetchBalance() {
  const key = await readApiKey();
  const response = await fetch(BALANCE_URL, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`余额接口返回 HTTP ${response.status}`);
  const payload = await response.json();
  const infos = Array.isArray(payload?.balance_infos) ? payload.balance_infos : [];
  const cny = infos.find((info) => info?.currency === 'CNY') ?? infos[0] ?? null;
  return {
    isAvailable: payload?.is_available === true,
    currency: cny?.currency ?? null,
    total: cny?.total_balance ?? null,
    granted: cny?.granted_balance ?? null,
    toppedUp: cny?.topped_up_balance ?? null,
  };
}

/** 北京时间的日期键，用于判断"今天"。 */
export function beijingDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(date);
}

/**
 * 用"余额比上一次少了多少"累计今日消费。
 * 余额变多视为充值：只更新基线，不记成消费。
 */
export function nextSpendState(previous, dateKey, current) {
  const round = (value) => Math.round(value * 10_000) / 10_000;
  if (!previous || previous.date !== dateKey || typeof previous.last !== 'number') {
    return { date: dateKey, last: current, spent: 0 };
  }
  const delta = previous.last - current;
  if (delta > 0.000001) {
    return { date: dateKey, last: current, spent: round((previous.spent || 0) + delta) };
  }
  return { date: dateKey, last: current, spent: round(previous.spent || 0) };
}

async function readSpendState() {
  try {
    const raw = await readFile(SPEND_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeSpendState(state) {
  try {
    await mkdir(SPEND_DIR, { recursive: true });
    const temp = `${SPEND_FILE}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(state), 'utf8');
    await rename(temp, SPEND_FILE);
  } catch {
    // 记账失败不影响余额显示
  }
}

/** 余额（60 秒缓存）+ 今日已花，两者一起算一次，避免每秒读取磁盘。 */
async function balanceSnapshot() {
  if (cache.payload === null || Date.now() - cache.at > CACHE_MS) {
    cache.payload = await fetchBalance();
    cache.at = Date.now();

    let todaySpent;
    const current = Number.parseFloat(cache.payload?.total);
    if (Number.isFinite(current)) {
      const previous = await readSpendState();
      const state = nextSpendState(previous, beijingDateKey(), current);
      const changed = !previous
        || previous.date !== state.date
        || previous.last !== state.last
        || previous.spent !== state.spent;
      if (changed) await writeSpendState(state);
      todaySpent = state.spent;
    }
    cache.todaySpent = todaySpent;
  }
  return { payload: cache.payload, todaySpent: cache.todaySpent };
}

// ── 本机状态 ────────────────────────────────────────────────────────────

const cpuSampler = { previous: null, percent: 0 };

/** 两次采样之间的 CPU 占用；第一次只能给 0。 */
export function sampleCpu(rows = cpus()) {
  let idle = 0;
  let total = 0;
  for (const row of rows) {
    const times = row?.times;
    if (!times) continue;
    idle += times.idle || 0;
    total += (times.user || 0) + (times.nice || 0) + (times.sys || 0) + (times.idle || 0) + (times.irq || 0);
  }
  if (cpuSampler.previous !== null) {
    const dIdle = idle - cpuSampler.previous.idle;
    const dTotal = total - cpuSampler.previous.total;
    if (dTotal > 0) cpuSampler.percent = Math.min(100, Math.max(0, (1 - dIdle / dTotal) * 100));
  }
  cpuSampler.previous = { idle, total };
  return cpuSampler.percent;
}

export function memorySample(total = totalmem(), free = freemem()) {
  const used = Math.max(0, total - free);
  return {
    percent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
    usedGB: Math.round((used / 1024 ** 3) * 10) / 10,
    totalGB: Math.round((total / 1024 ** 3) * 10) / 10,
  };
}

// ── 输出速度（tok/s）与 token 计数 ──────────────────────────────────────

const WINDOW_MS = 1500;
const IDLE_MS = 900;

const speed = {
  chars: 0,      // 本 step 累计字符（用于校准）
  firstAt: 0,
  lastAt: 0,
  window: [],    // { t, n }
  ratio: 0.55,   // tokens / 字符，逐步校准
  last: 0,       // 上一个 step 的平均速度，空闲时显示
};

const tokenTotals = {
  ready: false,
  total: 0,
  today: 0,
  scannedAt: 0,
  message: undefined,
};

function resetSpeed() {
  speed.chars = 0;
  speed.firstAt = 0;
  speed.window = [];
}

export function noteChunk(text, now = Date.now()) {
  if (typeof text !== 'string' || text === '') return;
  if (speed.firstAt === 0) speed.firstAt = now;
  speed.lastAt = now;
  speed.chars += text.length;
  speed.window.push({ t: now, n: text.length });
  while (speed.window.length > 0 && now - speed.window[0].t > WINDOW_MS) speed.window.shift();
}

/** 当前输出速度；超过 IDLE_MS 没有新字符就算 0。 */
export function currentSpeed(now = Date.now()) {
  if (speed.lastAt === 0 || now - speed.lastAt > IDLE_MS) return 0;
  while (speed.window.length > 0 && now - speed.window[0].t > WINDOW_MS) speed.window.shift();
  if (speed.window.length === 0) return 0;
  const chars = speed.window.reduce((sum, item) => sum + item.n, 0);
  const span = Math.max(0.4, Math.min(WINDOW_MS, now - speed.window[0].t + 60) / 1000);
  return Math.round((chars / span) * speed.ratio);
}

/**
 * step 落定：用精确 outputTokens 校准字符→token 比例，并记住这一步的平均速度。
 */
export function settleSpeed(usage, now = Date.now()) {
  const tokens = Number(usage?.outputTokens);
  const seconds = (speed.lastAt - speed.firstAt) / 1000;
  if (Number.isFinite(tokens) && speed.chars >= 20) {
    const ratio = tokens / speed.chars;
    if (ratio > 0.12 && ratio < 1.2) speed.ratio = speed.ratio * 0.5 + ratio * 0.5;
  }
  if (Number.isFinite(tokens) && seconds > 0.3) {
    speed.last = Math.round(tokens / seconds);
  }
  resetSpeed();
  void now;
}

function todayStart(now = Date.now()) {
  const key = beijingDateKey(new Date(now));
  return new Date(`${key}T00:00:00+08:00`).getTime();
}

// ── 会话平均输出速度（和 DSH 会话统计面板同一口径） ────────────────────
// 口径来自 dsh-session-stats：每一步 decodeMs = 消息落定时间 − 首个 token 时间，
// decodeTokens = 提供方报告的 outputTokens，速度 = decodeTokens / (decodeMs/1000)。
// 首个 token 的时间要从落定消息里内嵌的 compact stream 还原（和 dsh-llm 的算法一致），
// 这样表盘读数和统计面板里的 TPS 能对上。

const sessionStatsBySession = new Map();

function hasNonWhitespace(text) {
  return typeof text === 'string' && /\S/.test(text);
}

function isTokenDelta(chunk) {
  switch (chunk?.type) {
    case 'text-delta':
    case 'reasoning-delta':
      return typeof chunk.text === 'string' && chunk.text !== '';
    case 'tool-call-delta':
      return chunk.argumentsDelta !== '' || chunk.name !== undefined;
    default:
      return false;
  }
}

/** 一段打包增量里第一个满足条件的片段的时间（time0 + 前面各段的 dt）。 */
function runFirstMemberTime(run, predicate) {
  const fragments = run?.type === 'tool-call-chunks' ? run.args : run?.texts;
  if (!Array.isArray(fragments)) return undefined;
  let time = Number(run.time0);
  if (!Number.isFinite(time)) return undefined;
  const dt = Array.isArray(run.dt) ? run.dt : [];
  for (let index = 0; index < fragments.length; index += 1) {
    if (index > 0) time += Number(dt[index - 1]) || 0;
    if (predicate(fragments[index])) return time;
  }
  return undefined;
}

/** 一条落定消息的 compact stream 里首个 token 的时间。 */
export function streamFirstTokenTime(stream) {
  if (!Array.isArray(stream)) return undefined;
  for (const record of stream) {
    const time = record?.type === 'chunk'
      ? (isTokenDelta(record.chunk) ? record.time : undefined)
      : runFirstMemberTime(record, (fragment) => fragment !== '');
    if (time !== undefined) return time;
  }
  return undefined;
}

function sessionEntry(sessionId) {
  let entry = sessionStatsBySession.get(sessionId);
  if (entry === undefined) {
    entry = { tokens: 0, output: 0, decodeTokens: 0, decodeMs: 0, lastTime: 0 };
    sessionStatsBySession.set(sessionId, entry);
  }
  return entry;
}

/**
 * 把一条已落定的 assistant/message 计入它所属的会话：
 * tokens = 这一步计费的 token（输入 + 输出，含缓存命中），和 DSH 底部的会话合计同口径；
 * decodeTokens / decodeMs 用来算平均输出速度。
 */
export function noteSettledMessage(sessionId, event) {
  const usage = event?.data?.usage;
  const total = Number(usage?.totalTokens);
  const output = Number(usage?.outputTokens);
  const completed = Number(event?.time);
  const entry = sessionEntry(sessionId ?? 'unknown');

  if (Number.isFinite(total) && total > 0) entry.tokens += total;
  if (Number.isFinite(output) && output >= 0) entry.output += output;
  if (Number.isFinite(completed)) entry.lastTime = Math.max(entry.lastTime, completed);

  if (!Number.isFinite(output) || output < 0) return;
  const first = streamFirstTokenTime(event?.data?.stream);
  if (first === undefined || !Number.isFinite(first) || !Number.isFinite(completed) || completed < first) return;
  entry.decodeTokens += output;
  entry.decodeMs += completed - first;
}

/** 最近还在活动的那个会话（现在打开的就是它）的读数。 */
export function activeSessionStats() {
  let activeId = null;
  let best = null;
  for (const [id, entry] of sessionStatsBySession) {
    if (best === null || entry.lastTime > best.lastTime) {
      best = entry;
      activeId = id;
    }
  }
  if (best === null) {
    return { id: null, tps: 0, tokens: 0, output: 0, decodeTokens: 0, decodeMs: 0, allTime: 0 };
  }
  let allTime = 0;
  for (const entry of sessionStatsBySession.values()) allTime += entry.tokens;
  return {
    id: activeId,
    tps: best.decodeMs > 0 ? Math.round(best.decodeTokens / (best.decodeMs / 1000)) : 0,
    tokens: best.tokens,
    output: best.output,
    decodeTokens: best.decodeTokens,
    decodeMs: best.decodeMs,
    allTime,
  };
}

/** 只要平均速度的旧名字。 */
export function activeSessionSpeed() {
  const stats = activeSessionStats();
  return { tps: stats.tps, tokens: stats.decodeTokens, ms: stats.decodeMs };
}

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

/**
 * 会话日志是"一条事件一帧"的 zstd 拼接，Node 的 zstdDecompressSync 只解第一帧，
 * 所以按魔数切开逐帧解。切错的帧会解析失败，直接跳过，不影响统计。
 */
export function decodeSessionLog(buffer) {
  // 运行时没有 zstd 时就当历史读不到，仪表盘退回"从现在开始计数"，不能让插件起不来
  const inflate = typeof zlib.zstdDecompressSync === 'function' ? zlib.zstdDecompressSync : null;
  if (inflate === null) return [];
  const offsets = [];
  let at = 0;
  for (;;) {
    const hit = buffer.indexOf(ZSTD_MAGIC, at);
    if (hit < 0) break;
    offsets.push(hit);
    at = hit + ZSTD_MAGIC.length;
  }
  const events = [];
  for (let index = 0; index < offsets.length; index += 1) {
    const slice = buffer.subarray(offsets[index], index + 1 < offsets.length ? offsets[index + 1] : buffer.length);
    let text;
    try {
      text = inflate(slice).toString('utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // 半行或损坏的行跳过
      }
    }
  }
  return events;
}

async function listSessionLogs(dir) {
  const found = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.endsWith('.jsonl.zstd')) found.push(full);
    }
  }
  return found;
}

export function foldUsage(events, since) {
  let total = 0;
  let today = 0;
  for (const event of events) {
    if (event?.type !== 'assistant/message') continue;
    const tokens = Number(event?.data?.usage?.totalTokens);
    if (!Number.isFinite(tokens) || tokens <= 0) continue;
    total += tokens;
    const time = Number(event.time);
    if (Number.isFinite(time) && time >= since) today += tokens;
  }
  return { total, today };
}

let scanPromise = null;

async function scanTokens() {
  if (scanPromise !== null) return scanPromise;
  scanPromise = (async () => {
    const since = todayStart();
    const startedAt = Date.now();
    let total = 0;
    let today = 0;
    try {
      const files = await listSessionLogs(SESSIONS_DIR);
      for (const file of files) {
        // 会话文件特别多时别把启动拖住：扫满 4 秒就先用已扫到的数
        if (Date.now() - startedAt > 4000) break;
        let buffer;
        try {
          buffer = await readFile(file);
        } catch {
          continue;
        }
        const events = decodeSessionLog(buffer);
        const folded = foldUsage(events, since);
        total += folded.total;
        today += folded.today;

        // 顺手把这个会话的解码统计算出来，表盘才能和会话统计面板对得上
        let sessionId = file;
        for (const event of events) {
          if (event.type === 'session' && typeof event.id === 'string') {
            sessionId = event.id;
            break;
          }
        }
        for (const event of events) {
          if (event.type === 'assistant/message') noteSettledMessage(sessionId, event);
        }
      }
      tokenTotals.total = total;
      tokenTotals.today = today;
      tokenTotals.ready = true;
      tokenTotals.message = undefined;
    } catch (error) {
      tokenTotals.message = error instanceof Error ? error.message : String(error);
    }
    tokenTotals.scannedAt = Date.now();
  })();
  return scanPromise;
}

function countUsage(event) {
  if (!tokenTotals.ready) return;
  const time = Number(event?.time);
  if (!Number.isFinite(time) || time < tokenTotals.scannedAt) return;
  const tokens = Number(event?.data?.usage?.totalTokens);
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  tokenTotals.total += tokens;
  if (time >= todayStart()) tokenTotals.today += tokens;
}

/** 会话事件入口：流式字符、落定用量、解码速度都在这里喂给仪表盘。 */
export function handleSessionEvent(event, now = Date.now(), sessionId = undefined) {
  switch (event?.type) {
    case 'step/start':
      resetSpeed();
      break;
    case 'assistant/live-chunk': {
      const chunk = event?.data?.chunk;
      if (chunk?.type === 'text-delta' || chunk?.type === 'reasoning-delta') noteChunk(chunk.text, now);
      break;
    }
    case 'assistant/message':
      countUsage(event);
      noteSettledMessage(sessionId, event);
      settleSpeed(event?.data?.usage, now);
      break;
    case 'turn/end':
      resetSpeed();
      break;
    default:
      break;
  }
}

export function speedState() {
  return { ratio: speed.ratio, last: speed.last, chars: speed.chars };
}

export function tokenState() {
  return { ...tokenTotals };
}

// ── HTTP ────────────────────────────────────────────────────────────────

function sendJson(response, status, body) {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  });
  response.end(text);
}

function sameOrigin(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (typeof origin !== 'string' || origin === '') return true;
  if (typeof host !== 'string') return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readBody(request, limit = 16_384) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('body too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveBalance(response) {
  try {
    const snapshot = await balanceSnapshot();
    sendJson(response, 200, { ok: true, fetchedAt: cache.at, todaySpent: snapshot.todaySpent, ...snapshot.payload });
  } catch (error) {
    sendJson(response, 200, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** 仪表盘每秒拉一次：速度、CPU、内存、token、余额一起给。 */
export async function statsPayload(now = Date.now()) {
  let balance = null;
  let todaySpent;
  let balanceError;
  try {
    const snapshot = await balanceSnapshot();
    balance = snapshot.payload;
    todaySpent = snapshot.todaySpent;
  } catch (error) {
    balanceError = error instanceof Error ? error.message : String(error);
  }
  const session = activeSessionStats();
  return {
    ok: true,
    at: now,
    // speed 是"本次会话平均输出速度"，口径和 DSH 会话统计面板一致
    speed: session.tps,
    speedTokens: session.decodeTokens,
    speedMs: session.decodeMs,
    // speedLive 只是给悬停提示看的即时估算，不上表盘
    speedLive: currentSpeed(now),
    cpu: Math.round(sampleCpu() * 10) / 10,
    mem: memorySample(),
    tokens: {
      ready: tokenTotals.ready,
      today: tokenTotals.today,
      // total 是当前会话合计（输入 + 输出，含缓存命中），和 DSH 底部那个"xx tok"同口径
      total: session.tokens,
      output: session.output,
      allTime: session.allTime,
      message: tokenTotals.message,
    },
    balance,
    todaySpent,
    balanceError,
  };
}

async function serveStats(response) {
  try {
    sendJson(response, 200, await statsPayload());
  } catch (error) {
    sendJson(response, 200, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

// client.js 的版本戳：桌面版没有"刷新页面"菜单，浏览器半靠它发现界面文件被改过并自动刷新。
const stampCache = { at: 0, stamp: null };

async function clientStamp() {
  if (stampCache.stamp !== null && Date.now() - stampCache.at < 2000) return stampCache.stamp;
  try {
    const info = await stat(CLIENT_FILE);
    stampCache.at = Date.now();
    stampCache.stamp = `${Math.round(info.mtimeMs)}-${info.size}`;
  } catch {
    stampCache.at = Date.now();
    stampCache.stamp = null;
  }
  return stampCache.stamp;
}

export const inject = ['webServer'];

export function apply(ctx) {
  const guard = (label, run) => {
    try {
      return run();
    } catch (error) {
      bootErrors.push({
        at: new Date().toISOString(),
        label,
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  };

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: ROUTE_PATH,
        handler: async (request, response) => {
          if (!sameOrigin(request)) {
            sendJson(response, 403, { ok: false, error: 'forbidden' });
            return;
          }
          await serveBalance(response);
        },
      }),
    'crt-widget: 余额只读路由'
  );

  // 新增的三块（状态路由 / 事件订阅 / 历史扫描）各自兜住异常：
  // 就算某个接口对不上，也只丢仪表盘，不影响皮肤和余额卡片。
  guard('stats-route', () => ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: STATS_PATH,
        handler: async (request, response) => {
          if (!sameOrigin(request)) {
            sendJson(response, 403, { ok: false, error: 'forbidden' });
            return;
          }
          await serveStats(response);
        },
      }),
    'crt-widget: 仪表盘状态路由'
  ));

  guard('version-route', () => ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: VERSION_PATH,
        handler: async (request, response) => {
          if (!sameOrigin(request)) {
            sendJson(response, 403, { ok: false, error: 'forbidden' });
            return;
          }
          sendJson(response, 200, { ok: true, stamp: await clientStamp() });
        },
      }),
    'crt-widget: 界面版本路由'
  ));

  guard('session-events', () => ctx.effect(
    () =>
      ctx.on('session/event', (session, event) => {
        try {
          handleSessionEvent(event, Date.now(), session?.id);
        } catch {
          // 统计失败不影响会话本身
        }
      }),
    'crt-widget: 会话事件订阅'
  ));

  guard('token-scan', () => ctx.effect(() => {
    scanTokens().catch(() => {});
    return () => {};
  }, 'crt-widget: 历史 token 扫描'));

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: REPORT_PATH,
        handler: async (request, response) => {
          if (!sameOrigin(request)) {
            sendJson(response, 403, { ok: false, error: 'forbidden' });
            return;
          }
          try {
            const body = await readBody(request);
            const parsed = body === '' ? {} : JSON.parse(body);
            recordReport({
              stage: typeof parsed.stage === 'string' ? parsed.stage : 'unknown',
              slot: typeof parsed.slot === 'string' ? parsed.slot : undefined,
              message: typeof parsed.message === 'string' ? parsed.message.slice(0, 500) : undefined,
              stack: typeof parsed.stack === 'string' ? parsed.stack.slice(0, 1200) : undefined,
              version: typeof parsed.version === 'string' ? parsed.version : undefined,
            });
            sendJson(response, 200, { ok: true });
          } catch (error) {
            sendJson(response, 400, {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
      }),
    'crt-widget: 浏览器半上报路由'
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: DIAG_PATH,
        handler: (request, response) => {
          if (!sameOrigin(request)) {
            sendJson(response, 403, { ok: false, error: 'forbidden' });
            return;
          }
          sendJson(response, 200, {
            ok: true,
            reports,
            bootErrors,
            balance: cache.payload,
            balanceFetchedAt: cache.at,
            tokens: tokenState(),
            speed: speedState(),
            cpu: cpuSampler.percent,
            mem: memorySample(),
          });
        },
      }),
    'crt-widget: 诊断路由'
  );
}
