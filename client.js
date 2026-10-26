window.__ModuleLoader__.load({
  id: 'dsh-crt-theme',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const CLIENT_VERSION = '0.5.6';
    const REPORT_URL = '/dsh-crt-theme/report';

    // 诊断上报：只发阶段和错误信息，不涉及任何内容数据
    function report(entry) {
      try {
        fetch(REPORT_URL, {
          method: 'POST',
          keepalive: true,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(Object.assign({ version: CLIENT_VERSION }, entry)),
        }).catch(() => {});
      } catch { /* 诊断通道不可用不影响皮肤 */ }
    }

    report({ stage: 'factory' });

    const STYLE_ID = 'dsh-crt-theme-style';

    // 黑底磷光绿：只覆盖 DSH 的设计令牌，不改任何组件结构。
    // 宿主的浅色令牌挂在 body 上、深色令牌挂在 body[data-ds-dark-theme] 上，
    // 所以这里写两份选择器：带深色属性的那份权重更高，能压住深色令牌块。
    const THEME_CSS = `
body[data-dsh-crt],
body[data-dsh-crt][data-ds-dark-theme] {
  --dsw-alias-bg-base: #020704;
  --dsw-alias-bg-layer-1: #04120a;
  --dsw-alias-bg-layer-2: #061a0f;
  --dsw-alias-bg-layer-3: #0a2414;
  --dsw-alias-bg-overlay: #03100a;
  --dsw-alias-bg-document-selection: rgba(0, 255, 65, 0.22);
  --dsw-alias-bg-document-preview: #04120a;
  --dsw-alias-label-document-preview: #b9f8c9;

  --dsw-alias-label-primary: #c6ffd6;
  --dsw-alias-label-secondary: #63e08c;
  --dsw-alias-label-tertiary: #37a866;
  --dsw-alias-label-caption: #25764a;
  --dsw-alias-label-primary-dimmed: #8fe0a6;
  --dsw-alias-label-primary-foreground: #01150a;

  --dsw-alias-border-l1: rgba(0, 255, 65, 0.10);
  --dsw-alias-border-l2: rgba(0, 255, 65, 0.16);
  --dsw-alias-border-l3: rgba(0, 255, 65, 0.24);
  --dsw-alias-border-l4: rgba(0, 255, 65, 0.34);

  --dsw-alias-brand-primary: #00ff41;
  --dsw-alias-button-primary-fill: #00ff41;
  --dsw-alias-button-primary-hover: #4dff7d;
  /* 输入框右侧的圆形发送/主按钮（原先是一颗蓝色），换成深一点的绿，白箭头才看得清 */
  --dsw-alias-button-info-fill: #0c8f45;
  --dsw-alias-button-info-hover: #12aa55;
  --dsw-alias-label-primary-bluish: #96ffb4;
  --dsw-alias-state-business-tertiary: rgba(0, 255, 65, 0.14);
  --dsw-alias-state-business-primary: #00ff41;
  --dsw-alias-state-warn-primary: #ffd400;
  --dsw-alias-state-error-primary: #ff5252;
  --dsw-alias-state-success-primary: #00ff88;

  --dsw-alias-markdown-code-block: #03110a;
  --dsw-alias-markdown-code-block-banner: #062014;
  --dsw-alias-markdown-inline-code: #06180d;
  --dsw-alias-markdown-tag: #081f11;
  --dsw-alias-markdown-citation: #081f11;
  --dsw-alias-markdown-placeholder: #06180d;
  --dsw-alias-markdown-code-segment-selected: #0a2414;
  --dsw-alias-markdown-code-segment-unselected: #06180d;
  --dsw-specific-sidebar-fill: #030b06;
  --dsw-specific-sidebar-nav-item-active: #0a2414;
  --dsw-specific-sidebar-nav-item-hover: #071a10;
  --dsw-specific-sidebar-nav-item-active-accent: rgba(0, 255, 65, 0.16);
  --dsw-specific-menu: #04120a;
  --dsw-specific-selector: #0a2414;
  --dsw-specific-input-major: #05100a;
  --dsw-specific-bubble: #0a2414;
  --dsw-specific-bubble-highlight: #123a1f;
  --dsw-specific-tip: #081f11;
  --dsw-menu-surface-fill: rgba(2, 12, 7, 0.88);
  --dsw-alias-menu-group-header-fill: rgba(2, 12, 7, 0.94);
  --dsw-alias-button-elevated-fill: #0a2414;
  --dsw-alias-button-floating-fill: #081f11;
  --dsw-alias-button-floating-hover: #123a1f;
  --dsw-alias-button-primary-dimmed: #123a1f;
  --dsw-alias-button-ghost-active-fill: #0a2414;
  --dsw-alias-button-ghost-active-hover: #123a1f;
  --dsw-alias-bg-module-platform: #06180d;
  --dsw-alias-bg-multi-select: #06180d;
  --dsw-alias-interactive-bg-hover-solid: #0a2414;
  --dsw-alias-label-primary-inverted: #00ff41;
  --dsw-alias-button-contrast-fill: rgba(2, 12, 7, 0.9);
  --dsw-alias-scrollbar-bg-l1: #123a1f;
  --dsw-alias-scrollbar-bg-l2: #17452a;
  --dsw-alias-scrollbar-hover-l1: #1d6b3a;
  --dsw-alias-scrollbar-hover-l2: #22914e;

  --dsw-alias-menu-icon: #3fcf74;
  --dsw-alias-toast-bg: #05180d;
  --dsw-alias-toast-label: #c6ffd6;
  --dsw-alias-switch-thumb: #00ff41;
  --dsw-alias-tooltip-key-bg: #0a2414;
  --dsw-alias-interactive-bg-hover: rgba(0, 255, 65, 0.07);
  --dsw-alias-interactive-bg-active: rgba(0, 255, 65, 0.13);
  --dsw-alias-turn-trigger-bg: rgba(0, 255, 65, 0.05);
  --dsw-alias-file-diff-added: rgba(0, 255, 65, 0.14);

  --dsh-scrollbar-thumb: #17452a;
  --dsh-scrollbar-thumb-hover: #22914e;

  /* 混排：英文与数字走 Cascadia Mono，中文回退 Noto Sans SC */
  --dsh-font-family-text: "Cascadia Mono", "Noto Sans SC", "Microsoft YaHei", "Microsoft YaHei UI", monospace;
  --dsh-font-family-code: "Cascadia Code", "Cascadia Mono", "Consolas", "Noto Sans SC", "Microsoft YaHei", monospace;
  --dsw-font-family: "Cascadia Mono", "Noto Sans SC", "Microsoft YaHei", "Microsoft YaHei UI", monospace;
  --ds-font-family-code: "Cascadia Code", "Cascadia Mono", "Consolas", "Noto Sans SC", "Microsoft YaHei", monospace;

  background-color: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-variant-ligatures: none;
}

body[data-dsh-crt] ::selection {
  background: rgba(0, 255, 65, 0.28);
  color: #eaffef;
}

/* 细扫描线 + 中心微弱辉光，纯装饰层，不拦截任何点击 */
body[data-dsh-crt]::after {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  background-image:
    radial-gradient(ellipse at 50% 40%, rgba(0, 255, 65, 0.035), rgba(0, 0, 0, 0) 70%),
    repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0px,
      rgba(0, 0, 0, 0) 2px,
      rgba(0, 255, 65, 0.045) 3px,
      rgba(0, 0, 0, 0.05) 4px
    );
}

body[data-dsh-crt] :where(h1, h2, h3) {
  text-shadow: 0 0 8px rgba(0, 255, 65, 0.22);
}

/* 圆形主按钮加一点"通电"的辉光；类名哈希变了也不会出错，只是失去光晕 */
body[data-dsh-crt] :where(button)[class*="_primary"] {
  box-shadow: 0 0 14px rgba(0, 255, 65, 0.28);
}
`;

    // 四盏状态灯
    const LIGHTS_CSS = `
.crt-lights {
  position: absolute;
  top: 7px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0;
  font-family: "Cascadia Mono", "Noto Sans SC", "Microsoft YaHei", monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  line-height: 1.4;
  color: #37a866;
  user-select: none;
  pointer-events: none;
  z-index: 2;
}
/* 灯占用卡片顶部一条，只在卡片里确有灯时才把内容下推，空卡片不受影响 */
body[data-dsh-crt] [data-composer-card]:has([data-crt-lights]) {
  padding-top: 24px;
}
.crt-light {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  color: inherit;
}
.crt-light i {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 1px;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.crt-light b {
  font-weight: 400;
}
.crt-light--ok { color: #00ff41; }
.crt-light--warn { color: #ffd400; }
.crt-light--err { color: #ff5252; }
.crt-light--ask { color: #4de1ff; }
.crt-light--idle { color: #37a866; }
.crt-light--run i { animation: crt-led-blink 900ms steps(1, end) infinite; }
@keyframes crt-led-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.18; }
}
@media (prefers-reduced-motion: reduce) {
  .crt-light--run i { animation: none; }
}
`;

    const PLUGIN_CSS_HEAD = THEME_CSS + LIGHTS_CSS;

    function Light({ tone, label }) {
      return h('span', { className: `crt-light crt-light--${tone}` },
        h('i', null),
        h('b', null, label));
    }

    // 模型 id 缩短成灯牌上要显示的名字：deepseek-flash → FLASH
    function modelTag(modelId) {
      if (typeof modelId !== 'string' || modelId.length === 0) return null;
      const tail = modelId.split(/[-/]/).filter(Boolean).pop() || modelId;
      return tail.toUpperCase();
    }

    // 权限预设 → 灯牌文案与颜色，对齐 Codex 那边的读法
    function permissionLamp(currentValue) {
      switch (currentValue) {
        case 'danger-full-access': return { tone: 'warn', label: 'FULL' };
        case 'read-only': return { tone: 'ok', label: 'READ' };
        case 'workspace-write': return { tone: 'ask', label: 'WRITE' };
        case 'auto': return { tone: 'ask', label: 'AUTO' };
        case 'custom': return { tone: 'ask', label: 'CUSTOM' };
        default: return null;
      }
    }

    function createStatus(ctx) {
      // 订阅任一会话的"运行中"状态；同时维护一次完成后的 OK 提示。
      const subscribeExec = (onChange) => {
        const disposers = [];
        let lastRunning = false;
        let okTimer = null;
        let stopped = false;

        const publish = (running) => {
          if (stopped) return;
          if (running !== lastRunning) {
            lastRunning = running;
            if (okTimer !== null) {
              clearTimeout(okTimer);
              okTimer = null;
            }
            onChange(running ? 'RUN' : 'IDLE');
            if (!running) {
              okTimer = setTimeout(() => {
                okTimer = null;
                if (!stopped) onChange('IDLE');
              }, 2500);
              onChange('OK');
            }
          }
        };

        try {
          const remote = ctx.get('remote');
          if (remote && typeof remote.$on === 'function') {
            disposers.push(remote.$on('api-session/status', (_sessionId, running) => publish(Boolean(running))));
          }
        } catch { /* 没有 remote 时退回快照 */ }

        try {
          const uiSession = ctx.get('uiSession');
          const source = uiSession && uiSession.sessionStatus;
          if (source && typeof source.subscribe === 'function' && typeof source.getSnapshot === 'function') {
            const read = () => {
              const snapshot = source.getSnapshot();
              if (!snapshot || typeof snapshot.forEach !== 'function') return;
              let running = false;
              snapshot.forEach((entry) => {
                if (entry && entry.running) running = true;
              });
              publish(running);
            };
            read();
            disposers.push(source.subscribe(read));
          }
        } catch { /* 快照不可用时保持静默 */ }

        return () => {
          stopped = true;
          if (okTimer !== null) clearTimeout(okTimer);
          for (const dispose of disposers) {
            try { dispose(); } catch { /* 忽略清理异常 */ }
          }
        };
      };

      const subscribeLink = (onChange) => {
        const listeners = [];
        let timer = null;
        let stopped = false;

        const probe = async () => {
          if (stopped) return;
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            onChange(false);
            return;
          }
          try {
            // 401 也算通：只要请求到达宿主就说明链路在
            await fetch('/', { method: 'HEAD', cache: 'no-store' });
            if (!stopped) onChange(true);
          } catch {
            if (!stopped) onChange(false);
          }
        };

        const goOnline = () => probe();
        const goOffline = () => onChange(false);
        if (typeof window !== 'undefined') {
          window.addEventListener('online', goOnline);
          window.addEventListener('offline', goOffline);
          listeners.push(() => window.removeEventListener('online', goOnline));
          listeners.push(() => window.removeEventListener('offline', goOffline));
        }
        probe();
        timer = setInterval(probe, 20000);

        return () => {
          stopped = true;
          if (timer !== null) clearInterval(timer);
          for (const dispose of listeners) dispose();
        };
      };

      return { subscribeExec, subscribeLink, ctx };
    }

    function StatusLights(props) {
      const { status, useProjection } = props;
      const [exec, setExec] = useState('IDLE');
      const [online, setOnline] = useState(
        typeof navigator === 'undefined' ? true : navigator.onLine !== false
      );

      // 会话投影由宿主的标准 session 作用域注入，和内置插件用的是同一个钩子
      let modelSelection;
      let permissions;
      try {
        if (typeof useProjection === 'function') {
          modelSelection = useProjection('modelSelection');
          permissions = useProjection('permissions');
        }
      } catch { /* 投影不可用时留空 */ }

      useEffect(() => status.subscribeExec(setExec), [status]);
      useEffect(() => status.subscribeLink(setOnline), [status]);

      const chosen = modelSelection?.next ?? modelSelection?.lastUsed ?? null;
      const modelTagText = modelTag(chosen?.model);
      const permission = permissionLamp(permissions?.currentValue);

      const linkTone = online ? 'ok' : 'err';
      const linkLabel = online ? 'LINK' : 'OFFLINE';
      const execTone = exec === 'RUN' ? 'run' : exec === 'OK' ? 'ok' : 'idle';
      const execLabel = exec === 'IDLE' ? 'EXEC:IDLE' : exec === 'RUN' ? 'EXEC:RUN' : 'EXEC:OK';
      const flash = modelTagText
        ? h(Light, { tone: 'ok', label: modelTagText })
        : h(Light, { tone: 'idle', label: '—' });

      return h('div', { className: 'crt-lights', 'data-crt-lights': '' },
        h(Light, { tone: linkTone, label: linkLabel }),
        flash,
        h(Light, { tone: execTone, label: execLabel }),
        permission
          ? h(Light, { tone: permission.tone, label: permission.label })
          : h(Light, { tone: 'ask', label: 'ASK' }));
    }


    // ── 侧栏仪表盘：速度 / 内存 / CPU / 余额 / token ──────────────────────
    const DASH_CSS = `
.crt-dash {
  /* 侧栏内容有 12px 内边距，负边距把表盘撑到整栏宽，窄侧栏里能多出十几个像素 */
  width: calc(100% + 2 * var(--dsh-sidebar-inline-padding, 12px));
  margin: 0 calc(-1 * var(--dsh-sidebar-inline-padding, 12px)) 8px;
  padding: 0;
  box-sizing: border-box;
  user-select: none;
  font-family: "Cascadia Mono", "Noto Sans SC", "Microsoft YaHei", monospace;
  filter: drop-shadow(0 0 7px rgba(0, 255, 65, 0.10));
}
.crt-dash svg { display: block; width: 100%; height: auto; }
/* 上电自检：指针扫一遍、屏幕闪两下，像真仪表盘通电 */
.crt-dash--boot svg { animation: crt-dash-flicker 900ms steps(1, end) 1; }
.crt-dash--stale svg { opacity: 0.55; }
@keyframes crt-dash-flicker {
  0%, 12% { opacity: 0.3; }
  13%, 22% { opacity: 1; }
  23%, 29% { opacity: 0.55; }
  30%, 100% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .crt-dash--boot svg { animation: none; }
}
/* 故障灯：正常常亮，告警时按真车仪表那样闪 */
.crt-lamp--blink { animation: crt-lamp-blink 1.1s steps(1, end) infinite; }
@keyframes crt-lamp-blink {
  0%, 45% { opacity: 1; }
  46%, 100% { opacity: 0.12; }
}
@media (prefers-reduced-motion: reduce) {
  .crt-lamp--blink { animation: none; opacity: 0.55; }
}
/* 侧栏品牌字：官方插件占着 sidebar.brand.name 插槽，这里用样式覆盖成 BIGPANG! */
body[data-dsh-crt] [class*="_brandName"] {
  font-family: "Cascadia Mono", "Noto Sans SC", "Microsoft YaHei", monospace;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #c8ffd8;
  text-shadow: 0 0 6px rgba(0, 255, 65, 0.55), 0 0 16px rgba(0, 255, 65, 0.25);
}
body[data-dsh-crt] [class*="_brandName"] > * { display: none !important; }
body[data-dsh-crt] [class*="_brandName"]::before {
  content: "BIGPANG!";
  order: 0;
  white-space: nowrap;
}
body[data-dsh-crt] [class*="_brandName"]::after {
  content: "▌";
  order: 1;
  color: #00ff41;
  animation: crt-led-blink 1s steps(1, end) infinite;
}
@media (prefers-reduced-motion: reduce) {
  body[data-dsh-crt] [class*="_brandName"]::after { animation: none; }
}
/* 附件/文件卡右上角的"移除"小圆点：默认是白底浅绿叉，在深色里看不清 */
body[data-dsh-crt] [class*="_remove"] {
  background: rgba(2, 12, 7, 0.92) !important;
  color: #00ff41 !important;
  box-shadow: 0 0 0 1px rgba(0, 255, 65, 0.6), 0 0 8px rgba(0, 255, 65, 0.35);
}
`;

    const PLUGIN_CSS = PLUGIN_CSS_HEAD + DASH_CSS;

    // 侧栏底部小面板用到的峰谷推算（保留原有算法）
    const PEAK_WINDOWS = [[9 * 60, 12 * 60], [14 * 60, 18 * 60]];

    // 2026 年法定节假日（国办发明电〔2025〕7 号，取放假日）。
    const HOLIDAYS_2026 = new Set([
      '2026-01-01', '2026-01-02', '2026-01-03',
      '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
      '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
      '2026-04-04', '2026-04-05', '2026-04-06',
      '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
      '2026-06-19', '2026-06-20', '2026-06-21',
      '2026-09-25', '2026-09-26', '2026-09-27',
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-06', '2026-10-07',
    ]);

    // deepseek-flash 官方输出价（元 / 百万 tokens）
    const OUTPUT_PRICE = { peak: 8, off: 4 };

    function shanghaiParts(date) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai',
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).formatToParts(date);
      const read = (type) => parts.find((part) => part.type === type)?.value ?? '';
      return {
        weekday: read('weekday'),
        hour: Number.parseInt(read('hour'), 10) || 0,
        minute: Number.parseInt(read('minute'), 10) || 0,
        second: Number.parseInt(read('second'), 10) || 0,
        dateKey: `${read('year')}-${read('month')}-${read('day')}`,
      };
    }

    function isWeekend(weekday) {
      return weekday === 'Sat' || weekday === 'Sun';
    }

    function isOffDay(parts) {
      return isWeekend(parts.weekday) || HOLIDAYS_2026.has(parts.dateKey);
    }

    // 高峰：北京时间工作日 9:00-12:00、14:00-18:00；其余（周末、法定节假日）都在空闲
    function peakState(now) {
      const parts = shanghaiParts(now);
      const minutes = parts.hour * 60 + parts.minute;
      if (isOffDay(parts)) return { peak: false, minutes };
      const peak = PEAK_WINDOWS.some(([from, to]) => minutes >= from && minutes < to);
      return { peak, minutes };
    }

    function formatTokensLeft(total, peak) {
      const value = Number.parseFloat(total);
      if (!Number.isFinite(value) || value <= 0) return '';
      const price = peak ? OUTPUT_PRICE.peak : OUTPUT_PRICE.off;
      const tokens = (value / price) * 1_000_000;
      if (tokens >= 1_000_000) return `≈${Math.round(tokens / 10_000)}万`;
      return `≈${Math.max(1, Math.round(tokens / 1_000))}k`;
    }

    // ── 仪表盘 ────────────────────────────────────────────────────────────
    const DASH_ENDPOINT = '/dsh-crt-theme/stats';
    const VERSION_ENDPOINT = '/dsh-crt-theme/version';
    const STAMP_KEY = 'crt-dash-stamp';
    const DASH_MAX_SPEED = 1000;
    const BALANCE_FULL = 300;
    const DASH_FONT = '"Cascadia Mono", "Noto Sans SC", "Microsoft YaHei", monospace';
    const DASH_FROM = -120;
    const DASH_TO = 120;
    const DASH_LEFT_X = 68;
    const DASH_RIGHT_X = 212;
    const DASH_CY = 90;
    const DASH_R = 54;

    const DASH_COLORS = {
      green: '#00ff41',
      soft: '#c6ffd6',
      dim: '#2b7a4a',
      mid: '#63e08c',
      blue: '#4de1ff',
      warn: '#ffd400',
      bad: '#ff5252',
    };

    function clamp01(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return 0;
      return Math.min(1, Math.max(0, number));
    }

    function dashPoint(cx, cy, r, angle) {
      const radians = ((angle - 90) * Math.PI) / 180;
      return [cx + r * Math.cos(radians), cy + r * Math.sin(radians)];
    }

    function dashArc(cx, cy, r, from, to) {
      const [x1, y1] = dashPoint(cx, cy, r, from);
      const [x2, y2] = dashPoint(cx, cy, r, to);
      const large = Math.abs(to - from) > 180 ? 1 : 0;
      return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    }

    // 12.4M / 845K，指针读数够用又不占地方
    function formatTokensShort(value) {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) return '—';
      if (number >= 1e6) return `${(number / 1e6).toFixed(1)}M`;
      if (number >= 1e3) return `${(number / 1e3).toFixed(1)}K`;
      return String(Math.round(number));
    }

    function prefersReducedMotion() {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch {
        return false;
      }
    }

    /**
     * 桌面版没有"刷新页面"菜单（生产包把 reload 项藏了），
     * 所以这里自己盯着 client.js 的版本戳：文件一改就让页面自我刷新，
     * 改界面不用再重启整个应用。
     */
    function watchInterfaceStamp() {
      if (typeof window === 'undefined' || typeof fetch !== 'function') return () => {};
      let stopped = false;
      let loaded = null;      // 当前这页加载的是哪个版本的界面文件
      let candidate = null;   // 连续两次都读到的新版本才认，避免文件还在写就刷新

      const read = async () => {
        try {
          const response = await fetch(VERSION_ENDPOINT, { cache: 'no-store' });
          const payload = await response.json();
          return typeof payload?.stamp === 'string' ? payload.stamp : null;
        } catch {
          return null;
        }
      };

      const remember = (stamp) => {
        try {
          window.sessionStorage.setItem(STAMP_KEY, stamp);
        } catch {
          // 无痕模式写不了，下次还会刷新一次，不影响使用
        }
      };

      const previousStamp = () => {
        try {
          return window.sessionStorage.getItem(STAMP_KEY);
        } catch {
          return null;
        }
      };

      loaded = previousStamp();

      const check = async () => {
        if (stopped) return;
        const stamp = await read();
        if (stopped || stamp === null) return;

        // 第一次运行：把当前版本记下来，不刷新
        if (loaded === null) {
          loaded = stamp;
          remember(stamp);
          return;
        }
        if (stamp === loaded) {
          candidate = null;
          return;
        }
        // 文件刚被改过：先记下来，下一次还是这个版本才动手（等写完、等文件稳定）
        if (stamp !== candidate) {
          candidate = stamp;
          return;
        }
        remember(stamp);
        try {
          window.location.reload();
        } catch {
          // 刷新失败就等下一次
        }
      };

      check();
      const timer = setInterval(check, 4000);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }

    // 指针的弹簧：有点过冲再回落，像真表针
    function useNeedleSpring(target) {
      const [value, setValue] = useState(target);
      const state = useRef({ value: target, velocity: 0, frame: 0 });

      useEffect(() => {
        if (prefersReducedMotion()) {
          state.current.value = target;
          state.current.velocity = 0;
          setValue(target);
          return undefined;
        }
        const current = state.current;
        let last = null;
        const tick = (now) => {
          if (last === null) last = now;
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          const delta = target - current.value;
          current.velocity += (delta * 120 - current.velocity * 17) * dt;
          current.value += current.velocity * dt;
          setValue(current.value);
          if (Math.abs(target - current.value) < 0.15 && Math.abs(current.velocity) < 0.6) {
            current.value = target;
            current.velocity = 0;
            setValue(target);
            return;
          }
          current.frame = requestAnimationFrame(tick);
        };
        current.frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(current.frame);
      }, [target]);

      return value;
    }

    /**
     * 表盘里的故障灯：油壶（油量）和温度计（水温/CPU）。
     * 尺寸只有十来个像素，所以只画最粗的轮廓，保证一眼能认出来。
     */
    function DashLamp(props) {
      const { x, y, color, blink, tip, kind } = props;
      const icon = kind === 'fuel'
        ? [
          h('rect', { key: 'body', x: 1, y: 4.6, width: 6.6, height: 5.8, rx: 1, fill: 'none', stroke: color, strokeWidth: 1.35 }),
          h('path', { key: 'handle', d: 'M2.7 4.6 V2.9 H6.3 V4.6', fill: 'none', stroke: color, strokeWidth: 1.3, strokeLinejoin: 'round' }),
          h('path', { key: 'spout', d: 'M7.6 6.6 L10.3 4.3', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' }),
          h('circle', { key: 'drop', cx: 10.7, cy: 5.9, r: 1.05, fill: color }),
        ]
        : [
          h('rect', { key: 'stem', x: 4.2, y: 1.4, width: 2.6, height: 7.4, rx: 1.3, fill: 'none', stroke: color, strokeWidth: 1.45 }),
          h('circle', { key: 'bulb', cx: 5.5, cy: 9.6, r: 2.3, fill: 'none', stroke: color, strokeWidth: 1.45 }),
          h('path', { key: 't1', d: 'M7.9 3.5 H9.6', stroke: color, strokeWidth: 1.35, strokeLinecap: 'round' }),
          h('path', { key: 't2', d: 'M7.9 5.9 H9.6', stroke: color, strokeWidth: 1.35, strokeLinecap: 'round' }),
          h('path', { key: 't3', d: 'M7.9 8.3 H9.6', stroke: color, strokeWidth: 1.35, strokeLinecap: 'round' }),
        ];
      return h('g', {
        className: `crt-lamp${blink ? ' crt-lamp--blink' : ''}`,
        transform: `translate(${x} ${y}) scale(1.4)`,
        filter: 'url(#crtDashGlow)',
      },
      h('title', null, tip),
      icon);
    }

    function DashDial(props) {
      const { cx, cy, r, sweep, value, unit, tip, max, minor, labels, warn, lamp } = props;
      const angle = DASH_FROM + (DASH_TO - DASH_FROM) * clamp01(sweep);
      const [nx, ny] = dashPoint(cx, cy, r - 5, angle);
      const [bx, by] = dashPoint(cx, cy, -10, angle);
      const [p1x, p1y] = dashPoint(cx, cy, 3, angle + 90);
      const [p2x, p2y] = dashPoint(cx, cy, 3, angle - 90);

      const marks = [];
      for (let v = 0; v <= max + 0.0001; v += minor) {
        const tickAngle = DASH_FROM + (DASH_TO - DASH_FROM) * (v / max);
        const major = labels.some((item) => Math.abs(item.v - v) < 0.0001);
        const [x1, y1] = dashPoint(cx, cy, r + 1.6, tickAngle);
        const [x2, y2] = dashPoint(cx, cy, r + (major ? 7 : 4), tickAngle);
        marks.push(h('line', {
          key: `tick-${cx}-${v}`,
          x1,
          y1,
          x2,
          y2,
          stroke: major ? '#8dffb0' : 'rgba(99,224,140,0.38)',
          strokeWidth: major ? 1 : 0.55,
        }));
      }
      for (const item of labels) {
        const tickAngle = DASH_FROM + (DASH_TO - DASH_FROM) * (item.v / max);
        const [lx, ly] = dashPoint(cx, cy, r + 9, tickAngle);
        marks.push(h('text', {
          key: `label-${cx}-${item.text}`,
          x: lx,
          y: ly + 2.4,
          fill: 'rgba(141,255,176,0.72)',
          fontSize: 6.8,
          textAnchor: 'middle',
          style: { fontFamily: DASH_FONT },
        }, item.text));
      }

      const over = warn === true;

      return h('g', null,
        h('title', null, tip),
        h('path', {
          d: dashArc(cx, cy, r, DASH_FROM, DASH_TO),
          fill: 'none',
          stroke: 'rgba(0,255,65,0.18)',
          strokeWidth: 1.2,
        }),
        h('path', {
          d: dashArc(cx, cy, r, DASH_FROM + (DASH_TO - DASH_FROM) * 0.8, DASH_TO),
          fill: 'none',
          stroke: 'rgba(255,82,82,0.5)',
          strokeWidth: 3.6,
        }),
        marks,
        // 故障灯画在指针下面：指针扫过来的时候能正常盖住它，不会出现"灯穿模"
        lamp,
        h('polygon', {
          points: `${nx.toFixed(1)},${ny.toFixed(1)} ${p1x.toFixed(1)},${p1y.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`,
          fill: 'url(#crtDashNeedle)',
          filter: 'url(#crtDashGlow)',
        }),
        h('circle', { cx, cy, r: 4.6, fill: '#020a06', stroke: 'rgba(0,255,65,0.6)', strokeWidth: 1 }),
        h('circle', { cx, cy, r: 1.4, fill: DASH_COLORS.green, filter: 'url(#crtDashGlow)' }),
        h('text', {
          x: cx,
          y: cy + 27,
          fill: over ? DASH_COLORS.warn : DASH_COLORS.soft,
          fontSize: 22,
          textAnchor: 'middle',
          style: { fontFamily: DASH_FONT, fontVariantNumeric: 'tabular-nums' },
          filter: 'url(#crtDashGlow)',
        }, value),
        h('text', {
          x: cx,
          y: cy + 38,
          fill: 'rgba(99,224,140,0.7)',
          fontSize: 7.4,
          textAnchor: 'middle',
          style: { fontFamily: DASH_FONT, letterSpacing: '1.2px' },
        }, unit),
      );
    }

    function DashBar(props) {
      const { x, y, w, label, ratio, text, color, min, max, tip } = props;
      const labelWidth = label.length > 1 ? 24 : 20;
      const bx = x + labelWidth;
      const bw = w - labelWidth - 46;
      const px = bx + bw * clamp01(ratio);
      const ticks = [];
      for (let i = 0; i <= 10; i += 1) {
        const tx = bx + (bw * i) / 10;
        ticks.push(h('line', {
          key: `bar-${x}-${i}`,
          x1: tx,
          y1: y,
          x2: tx,
          y2: y + (i % 5 === 0 ? 2.8 : 1.8),
          stroke: 'rgba(99,224,140,0.4)',
          strokeWidth: 0.55,
        }));
      }
      return h('g', null,
        h('title', null, tip),
        h('text', {
          x,
          y: y + 4,
          fill: 'rgba(99,224,140,0.85)',
          fontSize: 7.4,
          style: { fontFamily: DASH_FONT, letterSpacing: '0.6px' },
        }, label),
        h('rect', {
          x: bx,
          y,
          width: bw,
          height: 7,
          rx: 1,
          fill: '#010805',
          stroke: 'rgba(0,255,65,0.22)',
          strokeWidth: 0.7,
        }),
        ticks,
        h('rect', {
          x: bx,
          y,
          width: Math.max(0.8, bw * clamp01(ratio)),
          height: 7,
          rx: 1,
          fill: 'rgba(0,255,65,0.16)',
        }),
        h('polygon', {
          points: `${px},${y + 1.2} ${px - 2.6},${y - 4.6} ${px + 2.6},${y - 4.6}`,
          fill: color,
          filter: 'url(#crtDashGlow)',
        }),
        h('text', {
          x: x + w,
          y: y + 5,
          fill: color,
          fontSize: 10.5,
          textAnchor: 'end',
          style: { fontFamily: DASH_FONT, fontVariantNumeric: 'tabular-nums' },
        }, text),
        h('text', {
          x: bx,
          y: y + 13.5,
          fill: 'rgba(43,122,74,0.95)',
          fontSize: 6.2,
          textAnchor: 'middle',
          style: { fontFamily: DASH_FONT },
        }, min),
        h('text', {
          x: bx + bw,
          y: y + 13.5,
          fill: 'rgba(43,122,74,0.95)',
          fontSize: 6.2,
          textAnchor: 'middle',
          style: { fontFamily: DASH_FONT },
        }, max),
      );
    }

    function Dashboard() {
      const [now, setNow] = useState(() => new Date());
      const [stats, setStats] = useState({ loading: true });
      const [phase, setPhase] = useState(0); // 0 上电中，1 扫表，2 回落，3 正常运行

      useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
      }, []);

      useEffect(() => {
        if (prefersReducedMotion()) {
          setPhase(3);
          return undefined;
        }
        setPhase(1);
        const down = setTimeout(() => setPhase(2), 700);
        const live = setTimeout(() => setPhase(3), 1300);
        return () => {
          clearTimeout(down);
          clearTimeout(live);
        };
      }, []);

      useEffect(() => {
        let stopped = false;

        const load = async () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          try {
            const response = await fetch(DASH_ENDPOINT, {
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            const payload = await response.json();
            if (stopped) return;
            if (payload?.ok) {
              setStats({ loading: false, ...payload });
            } else {
              setStats((previous) => ({ ...previous, loading: false, error: payload?.error ?? '读取失败' }));
            }
          } catch {
            if (!stopped) setStats((previous) => ({ ...previous, loading: false, error: '连接失败' }));
          }
        };

        load();
        const timer = setInterval(load, 1000);
        return () => {
          stopped = true;
          clearInterval(timer);
        };
      }, []);

      const { peak } = peakState(now);

      // speed = 本次会话平均输出速度（和 DSH 会话统计面板同一口径）
      const speed = Number(stats.speed) || 0;
      const speedLive = Number(stats.speedLive) || 0;
      const memPercent = clamp01((Number(stats.mem?.percent) || 0) / 100);
      const cpuPercent = clamp01((Number(stats.cpu) || 0) / 100);
      const balanceValue = Number.parseFloat(stats.balance?.total);
      const balanceRatio = clamp01((Number.isFinite(balanceValue) ? balanceValue : 0) / BALANCE_FULL);
      const todaySpent = typeof stats.todaySpent === 'number' ? stats.todaySpent : undefined;
      const tokensOutput = Number(stats.tokens?.output) || 0;
      const tokensBilled = Number(stats.tokens?.total) || 0;
      const tokenAllTime = Number(stats.tokens?.allTime) || 0;
      const tokenTip = `本机所有会话累计 ${tokenAllTime.toLocaleString('en-US')} tokens（输入含缓存 + 输出）；`
        + `本次会话合计 ${tokensBilled.toLocaleString('en-US')}，其中输出 ${tokensOutput.toLocaleString('en-US')}`;

      const bootTarget = phase === 1 ? 1 : phase === 2 ? 0 : null;
      const speedSweep = useNeedleSpring(bootTarget ?? clamp01(speed / DASH_MAX_SPEED));
      const memSweep = useNeedleSpring(bootTarget ?? memPercent);

      const stale = Boolean(stats.error);
      const balanceText = Number.isFinite(balanceValue) ? `¥${balanceValue.toFixed(2)}` : '—';
      const balanceColor = Number.isFinite(balanceValue) && balanceValue < 10 ? DASH_COLORS.bad : DASH_COLORS.mid;

      // 左表故障灯：CPU 温度（本机读不到传感器时退回占用率），超过 85% 闪红
      const cpuHot = cpuPercent >= 0.85;
      const tempLamp = h(DashLamp, {
        x: DASH_LEFT_X - 8,
        y: DASH_CY - 42,
        kind: 'temp',
        color: cpuHot ? DASH_COLORS.bad : DASH_COLORS.green,
        blink: cpuHot,
        tip: cpuHot
          ? `CPU 占用 ${(cpuPercent * 100).toFixed(0)}%，已到告警线`
          : `CPU 占用 ${(cpuPercent * 100).toFixed(0)}%（温度传感器读不到，这里看占用率）`,
      });

      // 右表故障灯：余额当油量，15% 以下黄灯、5% 以下红灯，都闪
      const fuelColor = balanceRatio < 0.05
        ? DASH_COLORS.bad
        : balanceRatio < 0.15 ? DASH_COLORS.warn : DASH_COLORS.green;
      const fuelLamp = h(DashLamp, {
        x: DASH_RIGHT_X - 8,
        y: DASH_CY - 42,
        kind: 'fuel',
        color: fuelColor,
        blink: balanceRatio < 0.15,
        tip: `余额 ${balanceText}／满油 300 元 = ${Math.round(balanceRatio * 100)}%`
          + (balanceRatio < 0.05 ? '（低于 15 元，红灯）' : balanceRatio < 0.15 ? '（低于 45 元，黄灯）' : ''),
      });
      const cpuColor = cpuPercent > 0.85 ? DASH_COLORS.warn : DASH_COLORS.mid;

      return h('div', {
        className: `crt-dash${phase > 0 && phase < 3 ? ' crt-dash--boot' : ''}${stale ? ' crt-dash--stale' : ''}`,
        'data-crt-dash': '',
      },
      h('svg', {
        viewBox: '0 0 280 198',
        role: 'img',
        'aria-label': `输出速度 ${Math.round(speed)} tok/s，内存 ${Math.round(memPercent * 100)}%，余额 ${balanceText}`,
        xmlns: 'http://www.w3.org/2000/svg',
      },
      h('defs', null,
        h('linearGradient', { id: 'crtDashPanel', x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: 0, stopColor: '#04140b' }),
          h('stop', { offset: 1, stopColor: '#020a06' })),
        h('radialGradient', { id: 'crtDashGlowFill', cx: '50%', cy: '45%', r: '55%' },
          h('stop', { offset: 0, stopColor: '#00ff41', stopOpacity: 0.1 }),
          h('stop', { offset: 0.7, stopColor: '#00ff41', stopOpacity: 0.02 }),
          h('stop', { offset: 1, stopColor: '#00ff41', stopOpacity: 0 })),
        h('linearGradient', { id: 'crtDashNeedle', x1: 0, y1: 1, x2: 0, y2: 0 },
          h('stop', { offset: 0, stopColor: '#00ff41' }),
          h('stop', { offset: 0.5, stopColor: '#b6ffca' }),
          h('stop', { offset: 1, stopColor: '#f2fff6' })),
        h('filter', { id: 'crtDashGlow', x: '-80%', y: '-80%', width: '260%', height: '260%' },
          h('feGaussianBlur', { stdDeviation: 1.3, result: 'blur' }),
          h('feMerge', null,
            h('feMergeNode', { in: 'blur' }),
            h('feMergeNode', { in: 'SourceGraphic' }))),
        h('pattern', { id: 'crtDashScan', width: 4, height: 4, patternUnits: 'userSpaceOnUse' },
          h('rect', { y: 2, width: 4, height: 1, fill: '#00ff41', opacity: 0.05 }))),

      h('rect', { x: 2, y: 2, width: 276, height: 194, rx: 3, fill: 'url(#crtDashPanel)', stroke: 'rgba(0,255,65,0.22)', strokeWidth: 1 }),
      h('rect', { x: 3, y: 3, width: 274, height: 192, rx: 3, fill: 'url(#crtDashGlowFill)' }),
      h('rect', { x: 2, y: 2, width: 276, height: 194, fill: 'url(#crtDashScan)' }),

      // 顶栏
      h('text', { x: 10, y: 17, fill: DASH_COLORS.dim, fontSize: 7.4, style: { fontFamily: DASH_FONT, letterSpacing: '1.2px' } }, 'SYS/DASH'),
      h('circle', { cx: 63, cy: 14, r: 1.9, fill: stale ? DASH_COLORS.warn : DASH_COLORS.green, filter: 'url(#crtDashGlow)' }),
      h('text', { x: 69, y: 17, fill: stale ? DASH_COLORS.warn : DASH_COLORS.mid, fontSize: 7.4, style: { fontFamily: DASH_FONT, letterSpacing: '1px' } }, stale ? 'STALE' : 'LIVE'),
      h('rect', { x: 230, y: 6, width: 40, height: 14, rx: 1, fill: peak ? 'rgba(255,212,0,0.06)' : 'rgba(77,225,255,0.06)', stroke: peak ? DASH_COLORS.warn : DASH_COLORS.blue, strokeWidth: 0.8 }),
      h('text', { x: 250, y: 16, fill: peak ? DASH_COLORS.warn : DASH_COLORS.blue, fontSize: 7.6, textAnchor: 'middle', style: { fontFamily: DASH_FONT, letterSpacing: '1.2px' } }, peak ? '高峰' : '谷时'),

      // 左：输出速度（大表）
      h(DashDial, {
        cx: DASH_LEFT_X,
        cy: DASH_CY,
        r: DASH_R,
        sweep: speedSweep,
        value: String(Math.round(speed)),
        unit: 'TOK/S',
        max: 1000,
        minor: 50,
        warn: speed >= 900,
        labels: [
          { v: 0, text: '0' },
          { v: 250, text: '250' },
          { v: 500, text: '500' },
          { v: 750, text: '750' },
          { v: 1000, text: '1K' },
        ],
        lamp: tempLamp,
        tip: speedLive > 0
          ? `本次会话平均 ${Math.round(speed)} tok/s，当前正在输出约 ${speedLive} tok/s`
          : `本次会话平均输出速度 ${Math.round(speed)} tok/s（与会话统计面板一致）`,
      }),

      // 右：内存（大表）
      h(DashDial, {
        cx: DASH_RIGHT_X,
        cy: DASH_CY,
        r: DASH_R,
        sweep: memSweep,
        value: String(Math.round(memPercent * 100)),
        unit: '% USED',
        max: 100,
        minor: 5,
        warn: memPercent >= 0.85,
        labels: [
          { v: 0, text: '0' },
          { v: 25, text: '25' },
          { v: 50, text: '50' },
          { v: 75, text: '75' },
          { v: 100, text: '100' },
        ],
        lamp: fuelLamp,
        tip: `内存 ${Math.round(memPercent * 100)}%（${stats.mem?.usedGB ?? '—'} / ${stats.mem?.totalGB ?? '—'} GB）`,
      }),

      // 底部左：CPU 小表，下面挂总里程
      h(DashBar, {
        x: 10,
        y: 162,
        w: 124,
        label: 'CPU',
        ratio: cpuPercent,
        text: `${Math.round(cpuPercent * 100)}%`,
        color: cpuColor,
        tip: `CPU 占用 ${(cpuPercent * 100).toFixed(1)}%`,
      }),
      h('g', null,
        h('title', null, tokenTip),
        h('text', { x: 10, y: 186, fill: DASH_COLORS.dim, fontSize: 8.4, style: { fontFamily: DASH_FONT, letterSpacing: '0.6px' } }, '总里程'),
        h('text', { x: 134, y: 186, fill: DASH_COLORS.soft, fontSize: 9.6, textAnchor: 'end', style: { fontFamily: DASH_FONT, fontVariantNumeric: 'tabular-nums' } }, formatTokensShort(tokenAllTime))),

      // 底部右：余额油表，下面挂今日花费
      h(DashBar, {
        x: 146,
        y: 162,
        w: 124,
        label: '余额',
        ratio: balanceRatio,
        text: balanceText,
        color: balanceColor,
        min: 'E',
        max: 'F',
        tip: `DeepSeek 余额 ${balanceText}（表底 0 元，满 300 元）`,
      }),
      h('text', { x: 146, y: 186, fill: DASH_COLORS.dim, fontSize: 8.4, style: { fontFamily: DASH_FONT, letterSpacing: '0.6px' } }, '今日花费'),
      h('text', { x: 270, y: 186, fill: DASH_COLORS.mid, fontSize: 9.6, textAnchor: 'end', style: { fontFamily: DASH_FONT, fontVariantNumeric: 'tabular-nums' } },
        typeof todaySpent === 'number' ? `¥${todaySpent.toFixed(2)}` : '—')),
      );
    }


    function mountTheme() {
      if (document.getElementById(STYLE_ID)) {
        return () => {};
      }
      const body = document.body;
      const hadSkin = body.hasAttribute('data-dsh-crt');
      const hadDark = body.hasAttribute('data-ds-dark-theme');

      body.setAttribute('data-dsh-crt', '');
      // 皮肤是深色的，同时点亮组件层的深色分支
      body.setAttribute('data-ds-dark-theme', '');

      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = PLUGIN_CSS;
      document.head.appendChild(style);

      // 宿主的界面插件会在启动后按"浅色"偏好重设 body 属性，这里把它钉住，
      // 否则输入卡片、气泡这些表面会退回浅色变白。
      const enforce = () => {
        const target = document.body;
        if (!target) return;
        if (target.getAttribute('data-dsh-crt') === null) target.setAttribute('data-dsh-crt', '');
        if (!target.hasAttribute('data-ds-dark-theme')) target.setAttribute('data-ds-dark-theme', '');
      };
      const timer = setInterval(enforce, 2000);
      let observer = null;
      if (typeof MutationObserver === 'function') {
        observer = new MutationObserver(enforce);
        observer.observe(body, {
          attributes: true,
          attributeFilter: ['data-ds-dark-theme', 'data-dsh-crt'],
        });
      }

      return () => {
        clearInterval(timer);
        if (observer) observer.disconnect();
        style.remove();
        if (!hadSkin) body.removeAttribute('data-dsh-crt');
        if (!hadDark) body.removeAttribute('data-ds-dark-theme');
      };
    }

    return {
      name: 'dsh-crt-theme',
      inject: ['slots'],
      apply(ctx) {
        // 每一步单独兜住异常：任何一步失败都只上报，不让整个皮肤被卸载
        const step = (name, run) => {
          try {
            return run();
          } catch (error) {
            report({
              stage: 'error',
              slot: name,
              message: String((error && error.message) || error),
              stack: String((error && error.stack) || '').slice(0, 1200),
            });
            return undefined;
          }
        };

        step('theme', () => ctx.effect(() => mountTheme()));

        const status = createStatus(ctx);

        // 状态灯挂在输入卡片内部左上角（overlay 层由卡片自身绝对定位承载）
        step('conversation.input.overlay', () => ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
          name: 'conversation.input.overlay',
          id: 'crt-status-lights',
          order: 5,
        }, (props) => h(StatusLights, Object.assign({}, props, { status })))));


        // 侧栏底部：汽车仪表盘（速度 / 内存 / CPU / 余额 / token）
        step('sidebar.footer.action', () => ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'crt-dash',
          order: 5,
        }, Dashboard)));

        step('debug', () => ctx.effect(() => {
          const api = {
            on() {
              document.body.setAttribute('data-dsh-crt', '');
              document.body.setAttribute('data-ds-dark-theme', '');
              if (!document.getElementById(STYLE_ID)) {
                const style = document.createElement('style');
                style.id = STYLE_ID;
                style.textContent = PLUGIN_CSS;
                document.head.appendChild(style);
              }
            },
            off() {
              const style = document.getElementById(STYLE_ID);
              if (style) style.remove();
              document.body.removeAttribute('data-dsh-crt');
            },
          };
          // 纯函数挂出来，方便在控制台或测试里核对峰谷推算
          window.__dshCrtHelpers = {
            peakState,
            formatTokensLeft,
            formatTokensShort,
            HOLIDAYS_2026,
          };
          window.dshCrt = api;
          return () => {
            if (window.dshCrt === api) delete window.dshCrt;
            delete window.__dshCrtHelpers;
          };
        }));

        report({ stage: 'applied' });
      },
    };
  },
});
















