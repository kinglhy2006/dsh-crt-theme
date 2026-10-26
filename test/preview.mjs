// 用假 React 把仪表盘组件渲染成静态 SVG，便于用浏览器截图核对版面。
// 运行：node test/preview.mjs <输出 html 路径>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? join(here, "..", "preview.html");
const source = readFileSync(join(here, "..", "client.js"), "utf8");

let captured = null;
const noop = () => {};
globalThis.window = {
  __ModuleLoader__: { load: config => { captured = config; } },
  addEventListener: noop,
  removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
};
globalThis.document = {
  head: { appendChild: noop },
  body: {
    hasAttribute: () => false,
    setAttribute: noop,
    removeAttribute: noop,
  },
  visibilityState: "visible",
  createElement: () => ({ setAttribute: noop, appendChild: noop, remove: noop, style: {} }),
  getElementById: () => null,
  querySelector: () => null,
};
globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: false }) });
globalThis.setInterval = (fn) => 0;
globalThis.clearInterval = noop;
globalThis.setTimeout = (fn) => 0;
globalThis.clearTimeout = noop;
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = noop;

const SEED_STATS = {
  loading: false,
  speed: 252,
  speedLast: 198,
  cpu: 31,
  mem: { percent: 43, usedGB: 14.1, totalGB: 32.8 },
  tokens: { ready: true, today: 1_240_000, total: 38_751_791, output: 169_014, allTime: 262_556_092 },
  todaySpent: 3.59,
  balance: { total: "68.97" },
};

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: initial => {
    const value = typeof initial === "function" ? initial() : initial;
    // 预览时直接把"还没拉数据"的初始状态换成一份样例读数
    if (value && typeof value === "object" && value.loading === true) return [SEED_STATS, noop];
    return [value, noop];
  },
  useEffect: noop,
  useMemo: fn => fn(),
  useCallback: fn => fn,
  useRef: value => ({ current: value }),
};

new Function("window", "document", "navigator", source)(globalThis.window, globalThis.document, { onLine: true });

const plugin = captured.factory(name => {
  if (name === "react") return reactStub;
  throw new Error(`unexpected module: ${name}`);
});

let dashboard = null;
plugin.apply({
  effect: callback => callback(),
  get: () => undefined,
  slots: {
    inject: (name, callback) => callback(),
    register: (options, component) => {
      if (options.name === "sidebar.footer.action") dashboard = component;
      return noop;
    },
  },
});

const ATTRIBUTE_NAMES = {
  className: "class",
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  textAnchor: "text-anchor",
  fontFamily: "font-family",
  fontSize: "font-size",
  fontWeight: "font-weight",
  letterSpacing: "letter-spacing",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  patternUnits: "patternUnits",
  viewBox: "viewBox",
};

function escape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function styleText(style) {
  return Object.entries(style)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}:${value}`)
    .join(";");
}

function serialize(node) {
  if (node === null || node === undefined || node === false) return "";
  if (Array.isArray(node)) return node.map(serialize).join("");
  if (typeof node === "string" || typeof node === "number") return escape(node);
  const { type, props, children } = node;
  if (typeof type === "function") return serialize(type(props));
  const attributes = [];
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "children" || key === "key") continue;
    if (key === "style" && typeof value === "object") {
      attributes.push(`style="${escape(styleText(value))}"`);
      continue;
    }
    attributes.push(`${ATTRIBUTE_NAMES[key] ?? key}="${escape(value)}"`);
  }
  const inner = (children || []).map(serialize).join("");
  return `<${type}${attributes.length ? ` ${attributes.join(" ")}` : ""}>${inner}</${type}>`;
}

const tree = dashboard({ wide: true });
const svg = serialize(tree.children[0]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#010503}
body{padding:0;font-family:"Cascadia Mono",Consolas,monospace}
.frame{width:182px;padding:4px;box-sizing:border-box}
svg{display:block;width:100%;height:auto}
</style></head><body><div class="frame">${svg}</div></body></html>`;

writeFileSync(out, html, "utf8");
console.log(`wrote ${out} (${html.length} bytes)`);



