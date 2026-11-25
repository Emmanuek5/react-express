import { Store } from "./store";
import {
  action,
  callMethod,
  component,
  formatter,
  globalStore,
  mount,
  onPage,
  reportError,
  runPageHooks,
  scopeOf,
  teardown,
} from "./runtime";
import { clearFetchCache } from "./fetch";
import { validator, formValues } from "./forms";
import { navigate, prefetch, startRouter } from "./router";
import { animate, show, hide } from "./animate";
import { showError, startEvents, startOverlay } from "./dev";

interface Config {
  dev: boolean;
  live: boolean;
  base: string;
  state: Record<string, unknown>;
}

function readConfig(): Config {
  const el = document.getElementById("rx-config");
  const fallback: Config = { dev: false, live: false, base: "/__rx", state: {} };
  if (!el) return fallback;
  try {
    return { ...fallback, ...JSON.parse(el.textContent || "{}") };
  } catch {
    return fallback;
  }
}

const config = readConfig();
globalStore.patch(config.state || {});

function resolveEl(target: Element | string): Element | null {
  return typeof target === "string" ? document.querySelector(target) : target;
}

declare const __RX_VERSION__: string;

const rx = {
  version: __RX_VERSION__,
  /** Page-wide state. */
  state: globalStore,
  get: <T = unknown>(path: string) => globalStore.get<T>(path),
  set: (key: string, value: unknown) => globalStore.set(key, value),
  update: <T = unknown>(key: string, fn: (prev: T) => T) => globalStore.update(key, fn),
  subscribe: (path: string, fn: (v: unknown) => void) => globalStore.subscribe(path, fn),
  /** Scope store that applies to an element. */
  scope: (target: Element | string) => {
    const el = resolveEl(target);
    return el ? scopeOf(el) : globalStore;
  },
  component,
  action,
  formatter,
  validator,
  formValues,
  onPage,
  navigate,
  prefetch,
  animate,
  show,
  hide,
  /** Re-run a data-fetch element (bypasses cache). */
  refresh: (target: Element | string) => {
    const el = resolveEl(target);
    if (!el) return Promise.resolve();
    return Promise.resolve(callMethod(el, "refresh"));
  },
  clearFetchCache,
  /** Manually activate / deactivate DOM you inserted yourself (normally automatic). */
  mount,
  teardown,
  Store,
  config,
};

declare global {
  interface Window {
    rx: typeof rx;
  }
}

if ((window as any).rx && (window as any).rx !== rx) {
  console.warn("rx: window.rx was already defined; react-express is replacing it");
}
window.rx = rx;
// 1.x name, kept so existing `ReactExpress.*` lookups don't throw.
(window as any).ReactExpress ??= rx;

if (config.dev) startOverlay();

function observe() {
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      r.removedNodes.forEach((n) => {
        if (n instanceof Element && !n.isConnected && !n.hasAttribute("data-rx-overlay")) teardown(n);
      });
    }
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n instanceof Element && n.isConnected) mount(n);
      });
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

function boot() {
  mount(document.body);
  observe();
  startRouter();
  if (config.dev || config.live) {
    try {
      startEvents(config.base, config, globalStore);
    } catch (err) {
      reportError(err);
    }
  }
  runPageHooks();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();

export { rx, showError };
