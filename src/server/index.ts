import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface ReactExpressOptions {
  /** Views directory. Defaults to the app's `views` setting. */
  viewsDir?: string;
  /** Dev mode: error overlay + hot reload. Defaults to NODE_ENV !== "production". */
  dev?: boolean;
  /** Alias for `dev` kept for 1.x compatibility. */
  hmr?: boolean;
  /** Extra directories to watch in dev (e.g. your public/ folder). */
  watch?: string[];
  /** Enable server -> client live state (`rx.broadcast`). Default false. */
  live?: boolean;
  /** URL prefix for the client script and event stream. Default "/__rx". */
  basePath?: string;
}

export interface ReactExpressHandle {
  /** Push a state value to every connected browser. Requires `live: true`. */
  broadcast(key: string, value: unknown): void;
  /** Number of connected event-stream clients. */
  readonly clients: number;
  /** Stop file watchers and close event streams. */
  close(): void;
}

declare global {
  namespace Express {
    interface Locals {
      /** Initial client state for this response, merged with `rxState` render option. */
      rxState?: Record<string, unknown>;
      /** CSP nonce added to the injected script tag. */
      cspNonce?: string;
    }
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(here, "../client");

/** Serialize JSON safely for embedding inside an HTML <script> element. */
export function safeJson(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Insert the rx bootstrap right after <head>, falling back to the document start. */
export function injectClient(
  html: string,
  opts: { basePath: string; dev: boolean; live: boolean; state: Record<string, unknown>; nonce?: string; version: string }
): string {
  const config = { dev: opts.dev, live: opts.live, base: opts.basePath, state: opts.state };
  const nonce = opts.nonce ? ` nonce="${escapeAttr(opts.nonce)}"` : "";
  const tags =
    `<script type="application/json" id="rx-config">${safeJson(config)}</script>` +
    `<script src="${opts.basePath}/rx.js?v=${opts.version}" data-rx-client${nonce}></script>`;
  const head = /<head\b[^>]*>/i.exec(html);
  if (head) {
    const at = head.index + head[0].length;
    return html.slice(0, at) + tags + html.slice(at);
  }
  return tags + html;
}

function readVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(here, "../../package.json"), "utf8"));
    return String(pkg.version);
  } catch {
    return "dev";
  }
}

export function reactExpress(options: ReactExpressOptions = {}) {
  const dev = options.dev ?? options.hmr ?? process.env.NODE_ENV !== "production";
  const live = options.live ?? false;
  const basePath = (options.basePath ?? "/__rx").replace(/\/$/, "");
  const version = dev ? String(Date.now()) : readVersion();

  return function attach(app: Express): ReactExpressHandle {
    if (options.viewsDir) app.set("views", options.viewsDir);

    // --- Event stream (dev reload + live state) --------------------------------
    const streams = new Set<Response>();
    const liveSnapshot = new Map<string, unknown>();
    const send = (res: Response, event: string, data: unknown) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    // --- Client script ----------------------------------------------------------
    app.use(
      basePath,
      express.static(clientDir, { index: false, maxAge: dev ? 0 : "1h", fallthrough: true })
    );

    if (dev || live) {
      app.get(`${basePath}/events`, (req: Request, res: Response) => {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        res.write("retry: 1000\n\n");
        streams.add(res);
        for (const [key, value] of liveSnapshot) send(res, "state", { key, value });
        req.on("close", () => streams.delete(res));
      });
    }
    const heartbeat = setInterval(() => streams.forEach((s) => s.write(": ping\n\n")), 25_000);
    heartbeat.unref();

    // --- Dev file watching ---------------------------------------------------
    const watchers: fs.FSWatcher[] = [];
    if (dev) {
      const viewsDir = options.viewsDir ?? (app.get("views") as string | undefined);
      const dirs = [viewsDir, ...(options.watch ?? [])].filter(Boolean) as string[];
      let timer: NodeJS.Timeout | undefined;
      let pending = new Map<string, string>();
      for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        try {
          const w = fs.watch(dir, { recursive: true }, (_type, file) => {
            if (!file || /(^|[\\/])\./.test(file)) return;
            const full = path.resolve(dir, file.toString());
            const ext = path.extname(full).toLowerCase();
            const kind = ext === ".css" ? "css" : full.startsWith(path.resolve(viewsDir ?? "\0")) ? "view" : "full";
            pending.set(full, kind);
            clearTimeout(timer);
            timer = setTimeout(() => {
              const batch = pending;
              pending = new Map();
              const kinds = new Set(batch.values());
              const kindOut = kinds.has("full") ? "full" : kinds.has("view") ? "view" : "css";
              const files = [...batch.keys()].map((f) => path.relative(process.cwd(), f));
              streams.forEach((s) => send(s, "reload", { kind: kindOut, files }));
            }, 60);
          });
          watchers.push(w);
        } catch (err) {
          console.warn(`[react-express] cannot watch ${dir}:`, (err as Error).message);
        }
      }
    }

    // --- Render injection ------------------------------------------------------
    app.use((req: Request, res: Response, next: NextFunction) => {
      const originalRender = res.render.bind(res);
      res.render = function render(view: string, opts?: any, cb?: any) {
        if (typeof opts === "function") {
          cb = opts;
          opts = {};
        }
        opts = opts ?? {};
        // A caller-supplied callback means the caller handles the HTML: leave it untouched.
        if (cb) return originalRender(view, opts, cb);
        originalRender(view, opts, (err: Error | null, html?: string) => {
          if (err) return req.next ? req.next(err) : next(err);
          const state = { ...(res.locals.rxState ?? {}), ...(opts.rxState ?? {}) };
          const out = injectClient(html ?? "", {
            basePath,
            dev,
            live,
            state,
            nonce: res.locals.cspNonce,
            version,
          });
          if (!res.get("Content-Type")) res.type("html");
          res.send(out);
        });
      } as Response["render"];
      next();
    });

    return {
      broadcast(key: string, value: unknown) {
        if (!live) throw new Error("react-express: broadcast() requires the `live: true` option");
        liveSnapshot.set(key, value);
        streams.forEach((s) => send(s, "state", { key, value }));
      },
      get clients() {
        return streams.size;
      },
      close() {
        clearInterval(heartbeat);
        watchers.forEach((w) => w.close());
        streams.forEach((s) => s.end());
        streams.clear();
      },
    };
  };
}

export default reactExpress;
