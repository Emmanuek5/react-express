import { cleanupPage, mount, reportError, runPageHooks, setPageReady, teardown } from "./runtime";

const CONTENT = "[data-content]";
let controller: AbortController | null = null;
const prefetched = new Map<string, { at: number; res: Promise<Response> }>();
const PREFETCH_TTL = 10_000;

function routerEnabledFor(a: HTMLAnchorElement): boolean {
  if (a.hasAttribute("data-no-route")) return false;
  if (a.hasAttribute("data-route")) return true;
  return !!a.closest("[data-router]");
}

/** Should this click be handled client-side? */
export function shouldIntercept(e: MouseEvent, a: HTMLAnchorElement): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (!routerEnabledFor(a)) return false;
  if (a.target && a.target !== "_self") return false;
  if (a.hasAttribute("download")) return false;
  const url = new URL(a.href, location.href);
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.origin !== location.origin) return false;
  // Pure hash change on the same page: let the browser scroll.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return false;
  return true;
}

function saveScroll() {
  const state = { ...(history.state || {}), rx: true, scrollX, scrollY };
  history.replaceState(state, "");
}

function fetchPage(url: string, signal?: AbortSignal) {
  return fetch(url, {
    signal,
    headers: { Accept: "text/html", "X-RX-Request": "navigate" },
    credentials: "same-origin",
  });
}

export function prefetch(url: string) {
  const u = new URL(url, location.href);
  if (u.origin !== location.origin) return;
  const hit = prefetched.get(u.href);
  if (hit && Date.now() - hit.at < PREFETCH_TTL) return;
  const res = fetchPage(u.href);
  res.catch(() => prefetched.delete(u.href));
  prefetched.set(u.href, { at: Date.now(), res });
}

function isRxScript(s: HTMLScriptElement) {
  return s.id === "rx-config" || s.hasAttribute("data-rx-client");
}

/** Re-create a script so the browser executes it. */
function activate(old: HTMLScriptElement): HTMLScriptElement {
  const s = document.createElement("script");
  for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
  const nonce = (document.querySelector("script[data-rx-client]") as HTMLScriptElement | null)?.nonce;
  if (nonce && !s.nonce) s.nonce = nonce;
  const type = (old.type || "").trim().toLowerCase();
  const classic = !old.src && (type === "" || type === "text/javascript" || type === "application/javascript");
  // Classic inline scripts share one global scope; wrapping them in a block lets
  // top-level let/const run again on a later visit without "already declared" errors.
  s.textContent = classic ? `{\n${old.textContent}\n}` : old.textContent;
  return s;
}

/** Run scripts sequentially (preserving order, waiting for external ones). */
async function runScripts(scripts: HTMLScriptElement[]) {
  for (const old of scripts) {
    const s = activate(old);
    const external = !!old.src && !old.async;
    const done = external
      ? new Promise<void>((r) => {
          s.onload = () => r();
          s.onerror = () => r();
        })
      : null;
    old.replaceWith(s);
    if (done) await done;
  }
}

function mergeHead(next: Document) {
  const have = new Set<string>();
  document.head.querySelectorAll("link[rel=stylesheet], style, script[src]").forEach((n) => have.add(key(n)));
  const toRun: HTMLScriptElement[] = [];
  next.head.querySelectorAll("link[rel=stylesheet], style, script[src]").forEach((n) => {
    if (n instanceof HTMLScriptElement && isRxScript(n)) return;
    if (have.has(key(n))) return;
    const imported = document.importNode(n, true) as Element;
    document.head.appendChild(imported);
    if (imported instanceof HTMLScriptElement) toRun.push(imported);
  });
  return toRun;
}

function key(n: Element) {
  if (n instanceof HTMLLinkElement) return "l:" + n.href;
  if (n instanceof HTMLScriptElement) return "s:" + n.src;
  return "t:" + n.textContent;
}

export interface SwapOptions {
  /** Keep current scroll position (used by hot reload). */
  keepScroll?: boolean;
  scrollTo?: { x: number; y: number } | null;
  hash?: string;
}

/** Replace the current page's content with `next`. Used by the router and hot reload. */
export async function swap(next: Document, opts: SwapOptions = {}) {
  const curTarget = document.querySelector(CONTENT);
  const newTarget = next.querySelector(CONTENT);
  const useContent = !!(curTarget && newTarget);
  const from = useContent ? curTarget! : document.body;
  const to = useContent ? newTarget! : next.body;
  const sx = scrollX;
  const sy = scrollY;

  document.dispatchEvent(new CustomEvent("rx:beforeswap"));
  cleanupPage();
  setPageReady(false);
  teardown(from);

  if (next.title) document.title = next.title;
  const headScripts = mergeHead(next);

  let incoming: HTMLElement;
  if (useContent) {
    incoming = document.importNode(to, true) as HTMLElement;
    from.replaceWith(incoming);
  } else {
    // Keep <body> itself (listeners on it survive); replace its children and attributes.
    for (const a of Array.from(document.body.attributes)) document.body.removeAttribute(a.name);
    for (const a of Array.from(to.attributes)) document.body.setAttribute(a.name, a.value);
    document.body.replaceChildren(...Array.from(to.childNodes, (n) => document.importNode(n, true)));
    incoming = document.body;
  }

  // Scripts inside the new content, plus body scripts outside [data-content] that are new.
  const scripts = Array.from(incoming.querySelectorAll("script")).filter((s) => !isRxScript(s));
  // Parsed scripts are inert; runScripts re-creates them so they execute, in order.
  await runScripts([...headScripts, ...scripts]);

  mount(incoming);
  runPageHooks();

  if (opts.keepScroll) scrollTo(sx, sy);
  else if (opts.scrollTo) scrollTo(opts.scrollTo.x, opts.scrollTo.y);
  else if (opts.hash) document.getElementById(decodeURIComponent(opts.hash.slice(1)))?.scrollIntoView();
  else scrollTo(0, 0);

  // Move focus for screen readers: to [autofocus], else the content container.
  const focusTarget = incoming.querySelector<HTMLElement>("[autofocus]") ?? (useContent ? incoming : null);
  if (focusTarget) {
    if (!focusTarget.hasAttribute("tabindex") && !focusTarget.matches("[autofocus]")) focusTarget.setAttribute("tabindex", "-1");
    focusTarget.focus({ preventScroll: true });
  }
}

export interface NavigateOptions {
  replace?: boolean;
  /** Internal: called from popstate. */
  pop?: boolean;
  scroll?: { x: number; y: number } | null;
}

/** Navigate to `url` without a full page load. Falls back to a normal load on anything unusual. */
export async function navigate(url: string, opts: NavigateOptions = {}): Promise<void> {
  const target = new URL(url, location.href);
  if (target.origin !== location.origin) {
    location.assign(target.href);
    return;
  }
  const ev = new CustomEvent("rx:navigate", { detail: { url: target.href }, cancelable: true });
  if (!document.dispatchEvent(ev)) return;

  controller?.abort();
  const ctrl = (controller = new AbortController());
  document.documentElement.classList.add("rx-navigating");
  if (!opts.pop) saveScroll();

  try {
    const hit = prefetched.get(target.href);
    prefetched.delete(target.href);
    const res = hit && Date.now() - hit.at < PREFETCH_TTL ? await hit.res : await fetchPage(target.href, ctrl.signal);
    if (ctrl.signal.aborted) return;
    const finalUrl = new URL(res.url || target.href);
    const type = res.headers.get("content-type") || "";
    if (!type.includes("text/html") || finalUrl.origin !== location.origin) {
      location.assign(target.href);
      return;
    }
    const html = await res.text();
    if (ctrl.signal.aborted) return;
    const next = new DOMParser().parseFromString(html, "text/html");
    const shown = finalUrl.pathname + finalUrl.search + target.hash;

    if (opts.pop) {
      // URL already changed by the browser.
    } else if (opts.replace) history.replaceState({ rx: true }, "", shown);
    else history.pushState({ rx: true }, "", shown);

    await swap(next, { scrollTo: opts.scroll ?? null, hash: target.hash });
    document.dispatchEvent(new CustomEvent("rx:navigated", { detail: { url: location.href, status: res.status } }));
  } catch (err) {
    if ((err as Error).name === "AbortError" || ctrl.signal.aborted) return;
    reportError(err);
    location.assign(target.href);
  } finally {
    if (controller === ctrl) {
      controller = null;
      document.documentElement.classList.remove("rx-navigating");
    }
  }
}

export function startRouter() {
  if (!history.state?.rx) history.replaceState({ ...(history.state || {}), rx: true }, "");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !shouldIntercept(e, a)) return;
    e.preventDefault();
    navigate(a.href);
  });

  const maybePrefetch = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.("a[data-prefetch][href]") as HTMLAnchorElement | null;
    if (a && routerEnabledFor(a)) prefetch(a.href);
  };
  document.addEventListener("pointerenter", maybePrefetch, true);
  document.addEventListener("focusin", maybePrefetch);

  addEventListener("popstate", (e) => {
    if (!e.state?.rx) return; // hash changes or entries we didn't create
    navigate(location.href, { pop: true, scroll: { x: e.state.scrollX ?? 0, y: e.state.scrollY ?? 0 } });
  });

  addEventListener("pagehide", saveScroll);
  let t: ReturnType<typeof setTimeout> | undefined;
  addEventListener("scroll", () => {
    clearTimeout(t);
    t = setTimeout(saveScroll, 150);
  }, { passive: true });
}
