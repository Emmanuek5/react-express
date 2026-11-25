import { swap } from "./router";
import type { Store } from "./store";

// ---------------------------------------------------------------------------
// Error overlay (dev only). Rendered in a shadow root, text only.
// ---------------------------------------------------------------------------

let host: HTMLElement | null = null;
let list: HTMLElement | null = null;

function ensureOverlay() {
  if (host?.isConnected) return;
  host = document.createElement("rx-error-overlay");
  host.setAttribute("data-rx-overlay", "");
  const root = host.attachShadow({ mode: "open" });
  const style = new CSSStyleSheet();
  style.replaceSync(`
    :host{position:fixed;inset:auto 16px 16px 16px;z-index:2147483647;font:13px/1.45 ui-monospace,Menlo,Consolas,monospace}
    .box{background:#1e1e1e;color:#f5f5f5;border-left:4px solid #ef4444;border-radius:8px;max-height:45vh;overflow:auto;box-shadow:0 8px 30px rgba(0,0,0,.35)}
    header{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#2a2a2a;position:sticky;top:0}
    button{background:none;border:1px solid #555;color:#ddd;border-radius:4px;cursor:pointer;padding:2px 8px}
    .err{padding:8px 12px;border-top:1px solid #333;white-space:pre-wrap;word-break:break-word}
    .msg{color:#fca5a5;font-weight:600}.stack{color:#a3a3a3;margin-top:4px}`);
  root.adoptedStyleSheets = [style];
  const box = document.createElement("div");
  box.className = "box";
  const header = document.createElement("header");
  const title = document.createElement("span");
  title.textContent = "react-express: runtime error";
  const close = document.createElement("button");
  close.textContent = "Dismiss";
  close.onclick = () => host?.remove();
  header.append(title, close);
  list = document.createElement("div");
  box.append(header, list);
  root.append(box);
  document.documentElement.appendChild(host);
}

export function showError(err: unknown) {
  ensureOverlay();
  const e = err instanceof Error ? err : new Error(String(err));
  const item = document.createElement("div");
  item.className = "err";
  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = `${e.name}: ${e.message}`;
  const stack = document.createElement("div");
  stack.className = "stack";
  stack.textContent = (e.stack || "").split("\n").slice(1, 8).join("\n");
  item.append(msg, stack);
  list!.prepend(item);
}

export function startOverlay() {
  addEventListener("error", (e) => showError(e.error ?? e.message));
  addEventListener("unhandledrejection", (e) => showError(e.reason));
}

// ---------------------------------------------------------------------------
// Event stream: hot reload (dev) + live state (when enabled on the server).
// ---------------------------------------------------------------------------

async function reloadView() {
  try {
    const res = await fetch(location.href, { headers: { Accept: "text/html", "X-RX-Request": "reload" } });
    if (!(res.headers.get("content-type") || "").includes("text/html")) return location.reload();
    const next = new DOMParser().parseFromString(await res.text(), "text/html");
    await swap(next, { keepScroll: true });
    document.dispatchEvent(new CustomEvent("rx:hot-reload"));
  } catch {
    location.reload();
  }
}

function reloadCss() {
  document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]").forEach((l) => {
    const u = new URL(l.href);
    if (u.origin !== location.origin) return;
    u.searchParams.set("rx", String(Date.now()));
    l.href = u.href;
  });
}

export function startEvents(base: string, opts: { dev: boolean; live: boolean }, store: Store) {
  const es = new EventSource(`${base}/events`);
  if (opts.live) {
    es.addEventListener("state", (e) => {
      try {
        const { key, value } = JSON.parse((e as MessageEvent).data);
        store.set(key, value);
      } catch {
        /* ignore malformed */
      }
    });
  }
  if (opts.dev) {
    es.addEventListener("reload", (e) => {
      const { kind } = JSON.parse((e as MessageEvent).data);
      if (kind === "css") reloadCss();
      else if (kind === "view") reloadView();
      else location.reload();
    });
  }
  return es;
}
