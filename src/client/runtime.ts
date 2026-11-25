import { Store } from "./store";

export const globalStore = new Store();

// ---------------------------------------------------------------------------
// Registries
// ---------------------------------------------------------------------------

export interface ComponentContext {
  /** The component's root element. */
  el: HTMLElement;
  /** Values from `data-prop-*` attributes (JSON-parsed when possible). */
  props: Record<string, unknown>;
  /** This component's scope. Reads fall back to parent scopes, then global state. */
  state: Store;
  /** The page-wide store. */
  global: Store;
  /** Elements inside the component with `data-ref="name"`. */
  refs: Record<string, HTMLElement | null>;
  /** Listen to an event on the root (optionally delegated to a selector). Auto-removed. */
  on(event: string, handler: (e: Event, target: Element) => void): void;
  on(event: string, selector: string, handler: (e: Event, target: Element) => void): void;
  /** Run `fn` whenever a state path changes. Auto-removed. */
  watch(path: string, fn: (value: unknown) => void): void;
  /** Register cleanup to run when the element leaves the page. */
  onCleanup(fn: () => void): void;
  /** Dispatch a bubbling CustomEvent from the root. */
  emit(name: string, detail?: unknown): void;
}

export type Methods = Record<string, (event: Event, el: Element) => unknown>;
export type Setup = (ctx: ComponentContext) => void | Methods | (() => void);
type Formatter = (value: unknown) => unknown;

/** Built-in scope kinds (fetch, form) plug in here. */
export interface ScopeKind {
  attr: string;
  defaults(el: HTMLElement): Record<string, unknown>;
  init(el: HTMLElement, store: Store, cleanup: (fn: () => void) => void): Methods | void;
}

const components = new Map<string, Setup>();
// Page scripts re-run on every router visit, so only warn about duplicates within one page.
let registeredThisPage = new Set<string>();
const actions = new Map<string, (event: Event, el: Element) => unknown>();
const formatters = new Map<string, Formatter>([
  ["json", (v) => JSON.stringify(v)],
  ["upper", (v) => String(v ?? "").toUpperCase()],
  ["lower", (v) => String(v ?? "").toLowerCase()],
  ["length", (v) => (v as any)?.length ?? 0],
]);
const kinds: ScopeKind[] = [];

const scopes = new WeakMap<Element, Store>();
const methods = new WeakMap<Element, Methods>();
const cleanups = new WeakMap<Element, Array<() => void>>();
const mounted = new WeakSet<Element>();
const started = new WeakSet<Element>();

export function registerKind(kind: ScopeKind) {
  kinds.push(kind);
}

export function reportError(err: unknown) {
  const w = window as any;
  if (typeof w.reportError === "function") w.reportError(err);
  else setTimeout(() => { throw err; });
}

export function addCleanup(el: Element, fn: () => void) {
  let list = cleanups.get(el);
  if (!list) cleanups.set(el, (list = []));
  list.push(fn);
}

/** The scope store that applies to `el` (its own, or the nearest ancestor's, or global). */
export function scopeOf(el: Element | null): Store {
  for (let n: Element | null = el; n; n = n.parentElement) {
    const s = scopes.get(n);
    if (s) return s;
  }
  return globalStore;
}

// ---------------------------------------------------------------------------
// Public registration API
// ---------------------------------------------------------------------------

export function component(name: string, setup: Setup) {
  if (registeredThisPage.has(name)) console.warn(`rx: component "${name}" registered twice; replacing`);
  registeredThisPage.add(name);
  components.set(name, setup);
  if (document.readyState !== "loading") {
    document.querySelectorAll<HTMLElement>(`[data-component="${CSS.escape(name)}"]`).forEach((el) => {
      if (mounted.has(el)) startScope(el);
    });
  }
}

export function action(name: string, fn: (event: Event, el: Element) => unknown) {
  actions.set(name, fn);
}

export function formatter(name: string, fn: Formatter) {
  formatters.set(name, fn);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonAttr(el: Element, attr: string): Record<string, unknown> {
  const raw = el.getAttribute(attr);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch (e) {
    reportError(new Error(`rx: invalid JSON in ${attr} on <${el.tagName.toLowerCase()}>: ${raw}`));
    return {};
  }
}

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Parse "path | fmt1 | fmt2" or "!path". */
function parseExpr(expr: string) {
  const [pathPart, ...fmts] = expr.split("|").map((s) => s.trim());
  const negate = pathPart.startsWith("!");
  const path = negate ? pathPart.slice(1).trim() : pathPart;
  return { path, negate, fmts };
}

function evaluate(store: Store, expr: ReturnType<typeof parseExpr>, value = store.get(expr.path)) {
  let v: unknown = value;
  for (const f of expr.fmts) {
    const fn = formatters.get(f);
    if (!fn) {
      reportError(new Error(`rx: unknown formatter "${f}"`));
      continue;
    }
    v = fn(v);
  }
  // `!items` on an empty array must be true, matching data-show's truthiness.
  return expr.negate ? !truthy(v) : v;
}

function truthy(v: unknown) {
  return Array.isArray(v) ? v.length > 0 : !!v;
}

const URL_ATTRS = new Set(["href", "src", "action", "formaction", "xlink:href", "poster", "srcset"]);
export function safeUrl(value: string): boolean {
  const v = value.replace(/[\u0000-\u0020]/g, "").toLowerCase();
  return !/^(javascript|vbscript|data):/.test(v) || /^data:image\/(png|gif|jpe?g|webp|avif);/.test(v);
}

function watchExpr(el: Element, store: Store, expr: ReturnType<typeof parseExpr>, apply: (v: unknown) => void) {
  const [top] = expr.path.split(".");
  if (store.has(top)) apply(evaluate(store, expr));
  addCleanup(el, store.subscribe(expr.path, (raw) => apply(evaluate(store, expr, raw))));
}

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

function bindText(el: HTMLElement, store: Store) {
  const expr = parseExpr(el.getAttribute("data-text")!);
  watchExpr(el, store, expr, (v) => {
    el.textContent = v == null ? "" : String(v);
  });
}

function bindVisibility(el: HTMLElement, store: Store, attr: "data-show" | "data-hide") {
  const expr = parseExpr(el.getAttribute(attr)!);
  const orig = el.style.getPropertyValue("display");
  const origPrio = el.style.getPropertyPriority("display");
  const apply = (v: unknown) => {
    const visible = attr === "data-show" ? truthy(v) : !truthy(v);
    if (visible) {
      if (orig) el.style.setProperty("display", orig, origPrio);
      else el.style.removeProperty("display");
      el.removeAttribute("hidden");
    } else {
      el.style.setProperty("display", "none", "important");
      el.setAttribute("hidden", "");
    }
  };
  const [top] = expr.path.split(".");
  apply(store.has(top) ? evaluate(store, expr) : undefined);
  addCleanup(el, store.subscribe(expr.path, (raw) => apply(evaluate(store, expr, raw))));
}

function bindAttrs(el: HTMLElement, store: Store) {
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith("data-attr-")) {
      const name = attr.name.slice(10);
      if (name.startsWith("on")) {
        reportError(new Error(`rx: refusing to bind event-handler attribute "${name}"`));
        continue;
      }
      const expr = parseExpr(attr.value);
      watchExpr(el, store, expr, (v) => {
        if (v == null || v === false) return el.removeAttribute(name);
        const s = v === true ? "" : String(v);
        if (URL_ATTRS.has(name) && !safeUrl(s)) {
          reportError(new Error(`rx: blocked unsafe URL in ${name}: ${s.slice(0, 40)}`));
          return el.removeAttribute(name);
        }
        el.setAttribute(name, s);
        if (name === "value" && "value" in el) (el as HTMLInputElement).value = s;
      });
    } else if (attr.name.startsWith("data-class-")) {
      const cls = attr.name.slice(11);
      const expr = parseExpr(attr.value);
      watchExpr(el, store, expr, (v) => el.classList.toggle(cls, truthy(v)));
    }
  }
}

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function bindModel(el: FormControl, store: Store) {
  const key = el.getAttribute("data-model")!.trim();
  if (key.includes(".")) {
    reportError(new Error(`rx: data-model needs a top-level key, got "${key}"`));
    return;
  }
  const type = (el as HTMLInputElement).type;
  const isCheckbox = type === "checkbox";
  const isGroup = isCheckbox && el.hasAttribute("value");
  const isRadio = type === "radio";
  const isNumber = type === "number" || type === "range";
  const isMulti = el instanceof HTMLSelectElement && el.multiple;
  const input = el as HTMLInputElement;

  const read = (): unknown => {
    if (isGroup) {
      const cur = store.get<unknown[]>(key);
      const arr = Array.isArray(cur) ? cur.filter((x) => x !== input.value) : [];
      return input.checked ? [...arr, input.value] : arr;
    }
    if (isCheckbox) return input.checked;
    if (isRadio) return input.value;
    if (isNumber) return el.value === "" ? null : input.valueAsNumber;
    if (isMulti) return Array.from((el as HTMLSelectElement).selectedOptions, (o) => o.value);
    return el.value;
  };
  const write = (v: unknown) => {
    if (isGroup) input.checked = Array.isArray(v) && v.map(String).includes(input.value);
    else if (isCheckbox) input.checked = !!v;
    else if (isRadio) input.checked = v != null && String(v) === input.value;
    else if (isMulti) {
      const vals = Array.isArray(v) ? v.map(String) : [];
      for (const o of Array.from((el as HTMLSelectElement).options)) o.selected = vals.includes(o.value);
    } else {
      const s = v == null ? "" : String(v);
      if (el.value !== s) el.value = s;
    }
  };

  // Seed: existing state wins; otherwise the server-rendered control value becomes state.
  if (store.has(key)) write(store.get(key));
  else if (isGroup) {
    store.set(key, input.checked ? [input.value] : []);
  } else if (isRadio) {
    if (input.checked) store.set(key, input.value);
  } else store.set(key, read());

  const event = isCheckbox || isRadio || el instanceof HTMLSelectElement ? "change" : "input";
  const onEvent = () => store.set(key, read());
  el.addEventListener(event, onEvent);
  addCleanup(el, () => el.removeEventListener(event, onEvent));
  addCleanup(el, store.subscribe(key, write));
}

function findMethod(from: Element, name: string) {
  for (let n: Element | null = from; n; n = n.parentElement) {
    const m = methods.get(n)?.[name];
    if (m) return { fn: m, owner: n };
  }
  const a = actions.get(name);
  return a ? { fn: a, owner: null } : null;
}

/** Call a method exposed by the scope on `el` (or an ancestor), e.g. a data-fetch "refresh". */
export function callMethod(el: Element, name: string, event: Event = new Event("rx:call")) {
  const found = findMethod(el, name);
  if (!found) throw new Error(`rx: no method "${name}" for element`);
  return found.fn(event, el);
}

function bindOn(el: HTMLElement) {
  const spec = el.getAttribute("data-on")!;
  for (const part of spec.split(/[;,]/)) {
    const [evRaw, nameRaw] = part.split(":");
    const ev = evRaw?.trim();
    const name = nameRaw?.trim();
    if (!ev || !name) continue;
    const handler = (e: Event) => {
      const found = findMethod(el, name);
      if (!found) return reportError(new Error(`rx: no method or action named "${name}"`));
      if (ev === "submit" || (ev === "click" && el.tagName === "A")) e.preventDefault();
      try {
        const r = found.fn(e, el);
        if (r && typeof (r as Promise<unknown>).catch === "function") (r as Promise<unknown>).catch(reportError);
      } catch (err) {
        reportError(err);
      }
    };
    el.addEventListener(ev, handler);
    addCleanup(el, () => el.removeEventListener(ev, handler));
  }
}

function bindEach(el: HTMLElement, store: Store) {
  const tpl = el.querySelector<HTMLTemplateElement>(":scope > template");
  if (!tpl) return reportError(new Error("rx: data-each needs a <template> child"));
  const expr = parseExpr(el.getAttribute("data-each")!);
  let rendered: Node[] = [];
  const render = (value: unknown) => {
    rendered.forEach((n) => {
      if (n instanceof Element) teardown(n);
      n.parentNode?.removeChild(n);
    });
    rendered = [];
    const list = Array.isArray(value) ? value : [];
    const frag = document.createDocumentFragment();
    list.forEach((item, index) => {
      const clone = tpl.content.cloneNode(true) as DocumentFragment;
      for (const node of Array.from(clone.childNodes)) {
        if (node instanceof Element) scopes.set(node, new Store({ $item: item, $index: index }, store));
        rendered.push(node);
      }
      frag.appendChild(clone);
    });
    el.appendChild(frag);
    rendered.forEach((n) => n instanceof Element && mount(n));
  };
  render(evaluate(store, expr));
  addCleanup(el, store.subscribe(expr.path, (raw) => render(evaluate(store, expr, raw))));
  addCleanup(el, () => rendered.forEach((n) => n instanceof Element && teardown(n)));
}

function bindElement(el: HTMLElement) {
  const store = scopeOf(el);
  if (el.hasAttribute("data-text")) bindText(el, store);
  if (el.hasAttribute("data-show")) bindVisibility(el, store, "data-show");
  if (el.hasAttribute("data-hide")) bindVisibility(el, store, "data-hide");
  if (el.hasAttribute("data-model")) bindModel(el as unknown as FormControl, store);
  if (el.hasAttribute("data-on")) bindOn(el);
  if (el.hasAttribute("data-each")) bindEach(el, store);
  bindAttrs(el, store);
}

// ---------------------------------------------------------------------------
// Scopes & components
// ---------------------------------------------------------------------------

function isScopeEl(el: Element) {
  return (
    el.hasAttribute("data-component") ||
    el.hasAttribute("data-scope") ||
    kinds.some((k) => el.hasAttribute(k.attr))
  );
}

function createScope(el: HTMLElement) {
  if (scopes.has(el)) return; // e.g. data-each item roots already have one
  const parent = scopeOf(el.parentElement);
  const initial: Record<string, unknown> = {};
  for (const k of kinds) if (el.hasAttribute(k.attr)) Object.assign(initial, k.defaults(el));
  Object.assign(initial, parseJsonAttr(el, "data-state"));
  scopes.set(el, new Store(initial, parent));
}

function startScope(el: HTMLElement) {
  if (started.has(el)) return;
  const store = scopes.get(el);
  if (!store) return;
  const all: Methods = {};
  for (const k of kinds) {
    if (!el.hasAttribute(k.attr)) continue;
    const m = k.init(el, store, (fn) => addCleanup(el, fn));
    if (m) Object.assign(all, m);
  }
  const name = el.getAttribute("data-component");
  if (name) {
    const setup = components.get(name);
    if (!setup) {
      methods.set(el, all);
      return; // started later, when the component registers
    }
    const ctx = makeContext(el, store);
    try {
      const out = setup(ctx);
      if (typeof out === "function") addCleanup(el, out);
      else if (out && typeof out === "object") Object.assign(all, out);
    } catch (err) {
      reportError(err);
    }
  }
  methods.set(el, all);
  started.add(el);
}

function makeContext(el: HTMLElement, store: Store): ComponentContext {
  const props: Record<string, unknown> = {};
  for (const a of Array.from(el.attributes)) {
    if (a.name.startsWith("data-prop-")) {
      const key = a.name.slice(10).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      props[key] = parseValue(a.value);
    }
  }
  const refs = new Proxy({} as Record<string, HTMLElement | null>, {
    get: (_t, name) => (typeof name === "string" ? el.querySelector(`[data-ref="${CSS.escape(name)}"]`) : undefined),
  });
  return {
    el,
    props,
    state: store,
    global: globalStore,
    refs,
    on(event: string, a: any, b?: any) {
      const selector: string | null = typeof a === "string" ? a : null;
      const handler: (e: Event, t: Element) => void = selector ? b : a;
      const listener = (e: Event) => {
        if (!selector) return handler(e, el);
        const t = (e.target as Element | null)?.closest?.(selector);
        if (t && el.contains(t)) handler(e, t);
      };
      el.addEventListener(event, listener);
      addCleanup(el, () => el.removeEventListener(event, listener));
    },
    watch(path, fn) {
      addCleanup(el, store.subscribe(path, fn));
    },
    onCleanup(fn) {
      addCleanup(el, fn);
    },
    emit(name, detail) {
      el.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    },
  };
}

// ---------------------------------------------------------------------------
// Mount / teardown
// ---------------------------------------------------------------------------

function collect(root: Element): HTMLElement[] {
  const list: HTMLElement[] = [];
  if (root instanceof HTMLElement) list.push(root);
  root.querySelectorAll<HTMLElement>("*").forEach((el) => list.push(el));
  return list.filter((el) => !mounted.has(el) && !(el.parentElement && isInsideTemplate(el)));
}

function isInsideTemplate(el: Element) {
  return !!el.closest("template");
}

/** Activate everything under `root`. Safe to call repeatedly. */
export function mount(root: Element) {
  const els = collect(root);
  const scopeEls = els.filter(isScopeEl);
  scopeEls.forEach(createScope);
  for (const el of els) {
    mounted.add(el);
    // data-each renders its own children; skip elements it created in this pass.
    if (!el.isConnected && el !== root) continue;
    try {
      bindElement(el);
    } catch (err) {
      reportError(err);
    }
  }
  scopeEls.forEach(startScope);
}

/** Run cleanups for `root` and its descendants. */
export function teardown(root: Element) {
  const els = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of els) {
    const list = cleanups.get(el);
    if (list) {
      cleanups.delete(el);
      for (const fn of list.reverse()) {
        try {
          fn();
        } catch (err) {
          reportError(err);
        }
      }
    }
    mounted.delete(el);
    started.delete(el);
    methods.delete(el);
    scopes.delete(el);
  }
}

// ---------------------------------------------------------------------------
// Page hooks. `onPage(fn)` runs fn once the current page is mounted (immediately if it
// already is). A returned function runs when the user navigates away. Page scripts are
// re-run by the router on each visit, so hooks are per page, not persistent.
// ---------------------------------------------------------------------------

let pending: Array<() => void | (() => void)> = [];
let pageCleanups: Array<() => void> = [];
let pageReady = false;

export function onPage(fn: () => void | (() => void)) {
  if (pageReady) runOne(fn);
  else pending.push(fn);
}

export function setPageReady(ready: boolean) {
  pageReady = ready;
}

function runOne(fn: () => void | (() => void)) {
  try {
    const c = fn();
    if (typeof c === "function") pageCleanups.push(c);
  } catch (err) {
    reportError(err);
  }
}

export function runPageHooks() {
  pageReady = true;
  const list = pending;
  pending = [];
  list.forEach(runOne);
  document.dispatchEvent(new CustomEvent("rx:load"));
}

export function cleanupPage() {
  registeredThisPage = new Set();
  const list = pageCleanups;
  pageCleanups = [];
  list.forEach((c) => {
    try {
      c();
    } catch (err) {
      reportError(err);
    }
  });
}
