// 无浏览器冒烟测试：模拟 __ModuleLoader__、React 和最小 DOM，
// 确认插件能挂载、能注册状态灯、卸载后清理干净。
// 运行：node test/smoke.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "..", "client.js"), "utf8");

function makeElement(tag) {
  const attributes = new Map();
  const children = [];
  return {
    tagName: tag,
    id: "",
    textContent: "",
    dataset: {},
    attributes,
    children,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    hasAttribute(name) { return attributes.has(name); },
    removeAttribute(name) { attributes.delete(name); },
    appendChild(child) { children.push(child); child.parent = this; return child; },
    remove() {
      if (!this.parent) return;
      const index = this.parent.children.indexOf(this);
      if (index >= 0) this.parent.children.splice(index, 1);
      this.parent = null;
    },
  };
}

const head = makeElement("head");
const body = makeElement("body");
const elements = [];

let captured = null;
globalThis.window = {
  __ModuleLoader__: { load: config => { captured = config; } },
  addEventListener() {},
  removeEventListener() {},
};
globalThis.document = {
  head,
  body,
  createElement(tag) {
    const el = makeElement(tag);
    elements.push(el);
    return el;
  },
  getElementById(id) {
    return elements.find(el => el.id === id && el.parent) || null;
  },
};
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: true },
  configurable: true,
  writable: true,
});
globalThis.fetch = async () => ({ ok: true, status: 401 });
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: initial => [typeof initial === "function" ? initial() : initial, () => {}],
  useEffect: () => {},
  useMemo: fn => fn(),
  useCallback: fn => fn,
  useRef: value => ({ current: value }),
};

const assert = (condition, message) => {
  if (!condition) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("ok  -", message);
  }
};

new Function("window", "document", "navigator", source)(globalThis.window, globalThis.document, globalThis.navigator);

assert(captured && typeof captured.factory === "function", "bundle registers a factory");
assert(captured.id === "dsh-crt-theme", "bundle id matches package name");

const plugin = captured.factory(name => {
  if (name === "react") return reactStub;
  throw new Error(`unexpected module: ${name}`);
});

assert(typeof plugin.apply === "function", "factory returns a plugin with apply()");
assert(Array.isArray(plugin.inject) && plugin.inject.includes("slots"), "plugin injects the slots service");

const disposers = [];
const registrations = [];
const injectedSlots = [];
const ctx = {
  effect(callback) {
    const disposer = callback();
    if (typeof disposer === "function") disposers.push(disposer);
    return disposer;
  },
  get() { return undefined; },
  slots: {
    inject(name, callback) { injectedSlots.push(name); return callback(); },
    register(options, component) {
      registrations.push({ options, component });
      return () => {};
    },
  },
};

plugin.apply(ctx);

const style = elements.find(el => el.id === "dsh-crt-theme-style");
assert(Boolean(style), "style element injected");
assert(style && style.textContent.includes("--dsw-alias-bg-base: #020704"), "palette present in stylesheet");
assert(style && style.textContent.includes("--dsw-alias-button-info-fill: #0c8f45"), "send-button token overridden");
assert(style && style.textContent.includes(".crt-lights"), "status light styles present");
assert(style && style.textContent.includes("BIGPANG!"), "brand wordmark override present");
assert(style && style.textContent.includes("crt-lamp--blink"), "dashboard fault lamps styled");
assert(body.hasAttribute("data-dsh-crt"), "body gets the skin attribute");
assert(body.hasAttribute("data-ds-dark-theme"), "dark branch enabled");

assert(injectedSlots.includes("conversation.input.overlay"), "declares the composer overlay slot");
assert(registrations.length === 2, "registers both slot components");
const registered = registrations.find(r => r.options.name === "conversation.input.overlay");
const dashboard = registrations.find(r => r.options.name === "sidebar.footer.action");
assert(Boolean(registered), "registration targets the composer overlay");
assert(Boolean(dashboard), "registration targets the sidebar footer");
assert(dashboard.options.id === "crt-dash", "dashboard keeps its own slot id");
assert(Boolean(dashboard) && typeof dashboard.component === "function", "dashboard supplies a component");
assert(typeof registered.component === "function", "registration supplies a component");

const rendered = registered.component({});
assert(rendered && rendered.type && typeof rendered.type === "function", "component factory renders the lights element");
assert(rendered.props && rendered.props.status, "component receives the status source");

const widgetTree = dashboard.component({ wide: true });
assert(widgetTree && widgetTree.type, "dashboard renders an element");
assert(widgetTree.props && typeof widgetTree.props.className === "string" && widgetTree.props.className.startsWith("crt-dash"), "dashboard carries its own class");
const card = widgetTree.children?.[0];
assert(card && card.type === "svg", "dashboard draws its cluster as one svg");
assert(card && card.props && card.props.role === "img", "cluster exposes an accessible image role");

// 把子组件也真的执行一遍：表盘和底部油表里出错会在这里暴露
const expandedTypes = new Set();
function expand(node, depth = 0) {
  if (node === null || node === undefined || depth > 8) return node;
  if (Array.isArray(node)) return node.map(child => expand(child, depth));
  if (typeof node !== "object") return node;
  if (typeof node.type === "function") {
    expandedTypes.add(node.type);
    return expand(node.type(node.props || {}), depth + 1);
  }
  return { ...node, children: (node.children || []).map(child => expand(child, depth)) };
}
const expanded = expand(widgetTree);
const texts = [];
const collect = node => {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) { node.forEach(collect); return; }
  if (typeof node === "string" || typeof node === "number") { texts.push(String(node)); return; }
  if (typeof node === "object") collect(node.children);
};
collect(expanded);
const joined = texts.join("|");
assert(expandedTypes.size >= 2, "dial and bar components actually execute");
assert(joined.includes("总里程"), "odometer label renders under the cpu gauge");
assert(joined.includes("今日花费"), "today's spend renders under the balance gauge");
assert(joined.includes("TOK/S"), "speed dial labels its unit");
assert(joined.includes("% USED"), "memory dial labels its unit");
assert(joined.includes("CPU"), "cpu bar renders");
assert(joined.includes("余额"), "balance bar renders");

assert(typeof window.dshCrt === "object" && typeof window.dshCrt.off === "function", "window.dshCrt debug switch exposed");

// ── 峰谷 / 余额 / 估算的纯函数断言 ───────────────────────────────
const H = window.__dshCrtHelpers;
assert(H && typeof H.peakState === "function", "helpers exposed for verification");

const at = iso => new Date(iso);
// 2026-10-19 是星期一，22:00 属于空闲
assert(H.peakState(at("2026-10-19T22:00:00+08:00")).peak === false, "mon 22:00 is off-peak");
// 2026-10-20 星期二 10:00 高峰
assert(H.peakState(at("2026-10-20T10:00:00+08:00")).peak === true, "tue 10:00 is peak");
// 13:00 空闲（午休）
assert(H.peakState(at("2026-10-20T13:00:00+08:00")).peak === false, "tue 13:00 is off-peak");
// 2026-02-17 星期二但在春节假期内 → 空闲
assert(H.peakState(at("2026-02-17T10:00:00+08:00")).peak === false, "spring festival workday is off-peak");
// 2026-10-03 星期六且国庆假期 → 空闲
assert(H.peakState(at("2026-10-03T10:00:00+08:00")).peak === false, "national day saturday is off-peak");
// 剩余可写量：谷时按 4 元/百万，高峰按 8 元/百万
assert(H.formatTokensLeft("74.59", false) === "≈1865万", "off-peak token estimate");
assert(H.formatTokensLeft("74.59", true) === "≈932万", "peak token estimate");
// token 读数压缩成 K / M
assert(H.formatTokensShort(1234) === "1.2K", "small totals read as K");
assert(H.formatTokensShort(12_400_000) === "12.4M", "large totals read as M");
assert(H.formatTokensShort(0) === "—", "empty totals read as a dash");

for (const dispose of disposers) dispose();

assert(!elements.find(el => el.id === "dsh-crt-theme-style" && el.parent), "style removed on dispose");
assert(!body.hasAttribute("data-dsh-crt"), "skin attribute removed on dispose");
assert(!body.hasAttribute("data-ds-dark-theme"), "dark attribute removed on dispose");
assert(typeof window.dshCrt === "undefined", "debug switch removed on dispose");
assert(typeof window.__dshCrtHelpers === "undefined", "helpers removed on dispose");

console.log(process.exitCode ? "\n有断言失败" : "\n全部通过");
