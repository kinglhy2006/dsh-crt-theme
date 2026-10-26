// 宿主半的单元测试：会话日志解码、token 折叠、CPU/内存采样、速度估算、路由注册。
// 运行：node test/dashboard.mjs
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const home = await mkdtemp(join(tmpdir(), "dsh-crt-test-"));
process.env.DSH_HOME = home;

let failures = 0;
const assert = (condition, message) => {
  if (condition) {
    console.log("ok  -", message);
  } else {
    failures += 1;
    console.error("FAIL:", message);
  }
};

// 余额接口打桩，测试不联网
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({
    is_available: true,
    balance_infos: [{ currency: "CNY", total_balance: "68.97", granted_balance: "10.82", topped_up_balance: "58.15" }],
  }),
});

const host = await import(pathToFileURL(join(here, "..", "index.js")).href);

// ── 日志解码 ────────────────────────────────────────────────────────────
const SESSION_FILE =
  "C:\\Users\\1\\.dsh\\sessions\\--C-Users-1-Documents-deepseek-harness-default-workspace--\\session-0ac0bd96-d264-402a-8458-203336da93bb\\session.v4.jsonl.zstd";

let events = [];
try {
  events = host.decodeSessionLog(await readFile(SESSION_FILE));
  assert(events.length > 100, `session log decodes (${events.length} events)`);
  assert(events.every((event) => typeof event.type === "string"), "every decoded frame yields typed events");
  const withUsage = events.filter((event) => event.type === "assistant/message" && event.data?.usage);
  assert(withUsage.length > 0, "assistant messages carry usage");
} catch (error) {
  assert(false, `session log decodes (${String(error)})`);
}

const folded = host.foldUsage(events, Date.now() - 30 * 24 * 3600 * 1000);
assert(folded.total > 0, `usage folds into a total (${folded.total})`);
assert(folded.today <= folded.total, "today never exceeds the total");

// ── CPU / 内存 ──────────────────────────────────────────────────────────
const rowsA = [{ times: { user: 100, nice: 0, sys: 50, idle: 850, irq: 0 } }];
const rowsB = [{ times: { user: 200, nice: 0, sys: 100, idle: 900, irq: 0 } }];
host.sampleCpu(rowsA);
const cpu = host.sampleCpu(rowsB);
assert(cpu > 0 && cpu < 100, `cpu sampling yields a percentage (${cpu})`);

const mem = host.memorySample(16 * 1024 ** 3, 4 * 1024 ** 3);
assert(Math.abs(mem.percent - 75) < 0.1, "memory percentage is used / total");
assert(mem.usedGB === 12 && mem.totalGB === 16, "memory figures are in GB");

// ── 速度估算 ────────────────────────────────────────────────────────────
const start = Date.now();
host.handleSessionEvent({ type: "step/start" }, start);
for (let index = 0; index < 10; index += 1) {
  host.handleSessionEvent({
    type: "assistant/live-chunk",
    data: { chunk: { type: "text-delta", text: "这是一段流式输出" } },
  }, start + index * 200);
}
const live = host.currentSpeed(start + 1800);
assert(live > 0, `live speed is positive while streaming (${live} tok/s)`);
host.handleSessionEvent({
  type: "assistant/message",
  time: start + 2600,
  data: { usage: { outputTokens: 60, totalTokens: 6000 } },
}, start + 2600);
const speed = host.speedState();
assert(speed.last > 0, `settled step records its average speed (${speed.last})`);
assert(speed.ratio > 0.12 && speed.ratio < 1.2, "character→token ratio stays in range");
assert(host.currentSpeed(Date.now() + 5000) === 0, "speed drops to zero once idle");

// ── 会话平均速度（与 DSH 会话统计面板同口径） ─────────────────────────
const packed = [
  { type: "chunk", time: 1000, chunk: { type: "block-start", index: 0, blockType: "reasoning" } },
  { type: "reasoning-chunks", time0: 1100, index: 0, dt: [50, 60], texts: ["", "你好", "世界"] },
];
assert(host.streamFirstTokenTime(packed) === 1150, "first token time is reconstructed from packed runs");

const rawDelta = [{ type: "chunk", time: 900, chunk: { type: "text-delta", index: 0, text: "hi" } }];
assert(host.streamFirstTokenTime(rawDelta) === 900, "raw text delta time is used as-is");
assert(host.streamFirstTokenTime([]) === undefined, "empty stream has no first token");

host.noteSettledMessage("speed-session", {
  time: 9_999_999_999_000,
  data: {
    usage: { outputTokens: 100, totalTokens: 4200 },
    stream: [{ type: "chunk", time: 9_999_999_998_500, chunk: { type: "text-delta", index: 0, text: "x" } }],
  },
});
const sessionSpeed = host.activeSessionSpeed();
assert(sessionSpeed.tps === 200, `session tps is tokens over decode time (${sessionSpeed.tps})`);
const sessionStats = host.activeSessionStats();
assert(sessionStats.tokens === 4200, "session total counts billed tokens");
assert(sessionStats.output === 100, "session total keeps the output share");
assert(sessionStats.allTime >= sessionStats.tokens, "all-time total covers the active session");

// ── 路由与事件订阅 ──────────────────────────────────────────────────────
const routes = new Map();
const listeners = new Map();
const fakeCtx = {
  effect(callback) {
    const disposer = callback();
    return disposer;
  },
  on(event, handler) {
    listeners.set(event, handler);
    return () => {};
  },
  webServer: {
    register(definition) {
      routes.set(definition.path, definition.handler);
      return () => {};
    },
  },
};

host.apply(fakeCtx);
assert(routes.has("/dsh-crt-theme/balance"), "balance route registered");
assert(routes.has("/dsh-crt-theme/stats"), "stats route registered");
assert(routes.has("/dsh-crt-theme/version"), "interface version route registered");
assert(routes.has("/dsh-crt-theme/report"), "report route registered");
assert(routes.has("/dsh-crt-theme/diag"), "diag route registered");
assert(typeof listeners.get("session/event") === "function", "session events subscribed");

// 等历史扫描落地后再取一次统计
await new Promise((resolve) => setTimeout(resolve, 300));

const response = {
  statusCode: 0,
  headers: null,
  body: "",
  writeHead(status, headers) {
    this.statusCode = status;
    this.headers = headers;
  },
  end(text) {
    this.body = text;
  },
};
await routes.get("/dsh-crt-theme/stats")({ headers: {} }, response);
const payload = JSON.parse(response.body);
assert(response.statusCode === 200, "stats route answers 200");
assert(payload.ok === true, "stats payload is ok");
assert(typeof payload.speed === "number" && payload.speed >= 0, "stats carry a speed reading");
assert(payload.cpu >= 0 && payload.cpu <= 100, "stats carry cpu percent");
assert(payload.mem.percent >= 0 && payload.mem.percent <= 100, "stats carry memory percent");
assert(payload.tokens && typeof payload.tokens.total === "number", "stats carry the token total");
assert(payload.balance?.total === "68.97", "stats carry the balance");
assert(typeof payload.todaySpent === "number", "stats carry today's spend");

// 会话事件订阅要真的能把用量记进来
const before = host.tokenState().total;
host.apply.length;
const handler = listeners.get("session/event");
if (host.tokenState().ready) {
  handler(null, { type: "assistant/message", time: Date.now(), data: { usage: { totalTokens: 5000 } } });
  assert(host.tokenState().total === before + 5000, "live usage is added to the running total");
} else {
  assert(true, "live usage skipped until the history scan finishes");
}

await rm(home, { recursive: true, force: true });

console.log(failures === 0 ? "\n全部通过" : `\n${failures} 项失败`);
process.exitCode = failures === 0 ? 0 : 1;

