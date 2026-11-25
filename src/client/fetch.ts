import { registerKind } from "./runtime";
import type { Store } from "./store";

interface CacheEntry {
  at: number;
  data: Promise<unknown>;
}
const cache = new Map<string, CacheEntry>();

/** Clear cached responses (all, or one URL). */
export function clearFetchCache(url?: string) {
  if (url === undefined) cache.clear();
  else cache.delete(new URL(url, location.href).href);
}

export class FetchError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function load(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json", "X-RX-Request": "fetch" },
    credentials: "same-origin",
  });
  const text = await res.text();
  let body: unknown = text;
  if ((res.headers.get("content-type") || "").includes("json")) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new FetchError(`Invalid JSON from ${url}`, res.status);
    }
  }
  if (!res.ok) {
    const msg = (body as any)?.error ?? `Request failed (${res.status})`;
    throw new FetchError(String(msg), res.status);
  }
  return body;
}

registerKind({
  attr: "data-fetch",
  defaults: () => ({ loading: true, error: null, data: null }),
  init(el, store: Store, cleanup) {
    let controller: AbortController | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const run = async (force = false) => {
      const raw = el.getAttribute("data-fetch") || "";
      let url: URL;
      try {
        url = new URL(raw, location.href);
      } catch {
        store.patch({ loading: false, error: `Invalid URL: ${raw}` });
        return;
      }
      if (url.origin !== location.origin && !el.hasAttribute("data-cross-origin")) {
        store.patch({ loading: false, error: "Cross-origin data-fetch blocked (add data-cross-origin to allow)" });
        return;
      }
      const ttl = Number(el.getAttribute("data-cache") || 0);
      const key = url.href;
      controller?.abort();
      controller = new AbortController();
      const ctrl = controller;
      store.patch({ loading: true, error: null });
      el.setAttribute("aria-busy", "true");

      let entry = cache.get(key);
      if (force || !entry || !ttl || Date.now() - entry.at > ttl) {
        // Cached requests are shared between elements, so one element can't abort them.
        entry = { at: Date.now(), data: load(key, ttl ? new AbortController().signal : ctrl.signal) };
        if (ttl) cache.set(key, entry);
        // Don't keep failures in the cache.
        entry.data.catch(() => cache.get(key) === entry && cache.delete(key));
      }
      try {
        const data = await entry.data;
        if (ctrl.signal.aborted) return;
        store.patch({ data, loading: false, error: null });
        el.dispatchEvent(new CustomEvent("rx:loaded", { detail: { data }, bubbles: true }));
      } catch (err) {
        if (ctrl.signal.aborted || (err as Error).name === "AbortError") return;
        const message = (err as Error).message || "Request failed";
        store.patch({ loading: false, error: message });
        el.dispatchEvent(new CustomEvent("rx:error", { detail: { error: err }, bubbles: true }));
      } finally {
        if (!ctrl.signal.aborted) el.removeAttribute("aria-busy");
      }
    };

    run();
    const poll = Number(el.getAttribute("data-poll") || 0);
    if (poll > 0) pollTimer = setInterval(() => run(true), poll);
    cleanup(() => {
      controller?.abort();
      if (pollTimer) clearInterval(pollTimer);
    });

    return {
      refresh: () => run(true),
    };
  },
});
