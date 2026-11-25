export type Listener = (value: unknown) => void;

const splitPath = (p: string) => p.split(".").filter(Boolean);

export function readPath(obj: unknown, parts: string[]): unknown {
  let cur: any = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * A key/value store. Stores can be nested: a child store reads keys it does not own
 * from its parent, and writes to an existing parent key go to the parent. This is how
 * component scopes inherit values (context) without global lookups.
 *
 * All change notifications go through the root store; each subscriber re-reads its
 * path through its own scope, so it always sees the value that applies to it.
 */
export class Store {
  private data: Record<string, unknown>;
  private subs?: Map<string, Set<() => void>>;
  readonly parent?: Store;

  constructor(initial: Record<string, unknown> = {}, parent?: Store) {
    this.data = { ...initial };
    this.parent = parent;
  }

  /** The nearest store (this or an ancestor) that owns `key`. */
  owner(key: string): Store | undefined {
    let s: Store | undefined = this;
    while (s) {
      if (Object.prototype.hasOwnProperty.call(s.data, key)) return s;
      s = s.parent;
    }
    return undefined;
  }

  has(key: string): boolean {
    return !!this.owner(key);
  }

  /** Read a key or dotted path, e.g. `user.name`. */
  get<T = unknown>(path: string): T {
    const [top, ...rest] = splitPath(path);
    if (top === undefined) return undefined as T;
    const o = this.owner(top);
    if (!o) return undefined as T;
    return readPath(o.data[top], rest) as T;
  }

  /** Set a top-level key. Writes go to the store that already owns the key, else this one. */
  set(key: string, value: unknown): void {
    if (key.includes(".")) throw new Error(`rx: set() takes a top-level key, got "${key}"`);
    const o = this.owner(key) ?? this;
    const prev = o.data[key];
    if (Object.is(prev, value) && (typeof value !== "object" || value === null)) return;
    o.data[key] = value;
    this.root().emit(key);
  }

  /** Update a key with a function of its previous value. */
  update<T = unknown>(key: string, fn: (prev: T) => T): void {
    this.set(key, fn(this.get<T>(key)));
  }

  /** Set several keys at once. */
  patch(values: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(values)) this.set(k, v);
  }

  /** Declare a key on this store (shadowing any parent key). Notifies subscribers. */
  define(key: string, value: unknown): void {
    this.data[key] = value;
    this.root().emit(key);
  }

  /**
   * Subscribe to a key or dotted path, resolved through this store's scope.
   * The callback runs when the resolved value changes. Returns an unsubscribe function.
   */
  subscribe(path: string, fn: Listener): () => void {
    const [top] = splitPath(path);
    const root = this.root();
    root.subs ??= new Map();
    let set = root.subs.get(top);
    if (!set) root.subs.set(top, (set = new Set()));
    let last = this.get(path);
    const check = () => {
      const next = this.get(path);
      if (Object.is(next, last) && (typeof next !== "object" || next === null)) return;
      last = next;
      fn(next);
    };
    set.add(check);
    return () => set!.delete(check);
  }

  /** Snapshot of the keys this store owns. */
  toJSON(): Record<string, unknown> {
    return { ...this.data };
  }

  root(): Store {
    let s: Store = this;
    while (s.parent) s = s.parent;
    return s;
  }

  private emit(key: string) {
    const set = this.subs?.get(key);
    if (set) [...set].forEach((fn) => fn());
  }
}
