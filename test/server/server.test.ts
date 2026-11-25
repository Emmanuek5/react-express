// Server unit tests. Run after `npm run build`: they import the built dist/server.
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import express from "express";
import { reactExpress, safeJson, injectClient } from "../../dist/server/index.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rx-test-"));
const views = path.join(tmp, "views");
const pub = path.join(tmp, "public");
fs.mkdirSync(views);
fs.mkdirSync(pub);
fs.writeFileSync(path.join(views, "page.ejs"), "<!doctype html><html><head lang=x><title><%= title %></title></head><body>hi</body></html>");
fs.writeFileSync(path.join(pub, "a.css"), "body{}");
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

async function serve(opts: Parameters<typeof reactExpress>[0], routes?: (app: express.Express) => void) {
  const app = express();
  app.set("view engine", "ejs");
  const rx = reactExpress({ viewsDir: views, ...opts })(app);
  routes?.(app);
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).send("handled: " + err.message);
  });
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  return {
    rx,
    base,
    close: () => {
      rx.close();
      server.closeAllConnections();
      server.close();
    },
  };
}

/** Read SSE events from a stream until `until` returns true. */
async function readEvents(url: string, until: (events: { event: string; data: any }[]) => boolean, onOpen?: () => void) {
  const ctrl = new AbortController();
  const res = await fetch(url, { signal: ctrl.signal });
  assert.equal(res.headers.get("content-type"), "text/event-stream");
  const events: { event: string; data: any }[] = [];
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  onOpen?.();
  const timeout = setTimeout(() => ctrl.abort(), 5000);
  try {
    while (!until(events)) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const event = /^event: (.*)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (event && data) events.push({ event, data: JSON.parse(data) });
      }
    }
  } finally {
    clearTimeout(timeout);
    ctrl.abort();
  }
  return events;
}

describe("safeJson", () => {
  test("escapes characters that could end the script element", () => {
    const value = { s: "</script><!-- & \u2028\u2029" };
    const out = safeJson(value);
    assert.ok(!/[<>&\u2028\u2029]/.test(out), out);
    assert.deepEqual(JSON.parse(out), value);
  });
  test("undefined becomes null", () => assert.equal(safeJson(undefined), "null"));
});

describe("injectClient", () => {
  const opts = { basePath: "/__rx", dev: false, live: false, state: { a: 1 }, version: "1.2.3" };
  test("inserts right after <head> with attributes", () => {
    const out = injectClient('<html><HEAD class="x"><title>t</title></HEAD></html>', opts);
    assert.match(out, /^<html><HEAD class="x"><script type="application\/json" id="rx-config">\{.*\}<\/script><script src="\/__rx\/rx.js\?v=1.2.3" data-rx-client><\/script><title>/);
  });
  test("does not match <header>", () => {
    const out = injectClient("<header>x</header>", opts);
    assert.ok(out.startsWith('<script type="application/json"'));
    assert.ok(out.endsWith("<header>x</header>"));
  });
  test("escapes the nonce", () => {
    const out = injectClient("<head></head>", { ...opts, nonce: 'a"b<c' });
    assert.ok(out.includes('nonce="a&quot;b&lt;c"'));
  });
});

describe("render override", () => {
  test("injects config with merged state; passes errors to next()", async () => {
    const s = await serve({ dev: false }, (app) => {
      app.get("/", (_req, res) => {
        res.locals.rxState = { a: 1, b: 1 };
        res.render("page", { title: "T", rxState: { b: 2, x: "</script>" } });
      });
      app.get("/cb", (_req, res) => res.render("page", { title: "C" }, (_e, html) => res.type("html").send(html)));
      app.get("/missing", (_req, res) => res.render("nope"));
    });
    try {
      const html = await (await fetch(s.base + "/")).text();
      const json = /<script type="application\/json" id="rx-config">(.*?)<\/script>/.exec(html)?.[1];
      assert.ok(json, html);
      assert.deepEqual(JSON.parse(json!), { dev: false, live: false, base: "/__rx", state: { a: 1, b: 2, x: "</script>" } });
      assert.match(html, /<title>T<\/title>/);

      const cb = await (await fetch(s.base + "/cb")).text();
      assert.ok(!cb.includes("rx-config"), "callback render is left untouched");

      const missing = await fetch(s.base + "/missing");
      assert.equal(missing.status, 500);
      assert.match(await missing.text(), /^handled: Failed to lookup view "nope"/);
    } finally {
      s.close();
    }
  });

  test("production: cached client, versioned URL, no event stream", async () => {
    const s = await serve({ dev: false }, (app) => app.get("/", (_req, res) => res.render("page", { title: "P" })));
    try {
      const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
      const html = await (await fetch(s.base + "/")).text();
      assert.ok(html.includes(`/__rx/rx.js?v=${pkg.version}`));
      const js = await fetch(s.base + "/__rx/rx.js");
      assert.equal(js.status, 200);
      assert.match(js.headers.get("content-type") ?? "", /javascript/);
      assert.match(js.headers.get("cache-control") ?? "", /max-age=3600/);
      assert.equal((await fetch(s.base + "/__rx/events")).status, 404);
      assert.throws(() => s.rx.broadcast("k", 1), /requires the `live: true` option/);
    } finally {
      s.close();
    }
  });

  test("custom basePath", async () => {
    const s = await serve({ dev: false, basePath: "/assets/rx/" }, (app) => app.get("/", (_req, res) => res.render("page", { title: "P" })));
    try {
      const html = await (await fetch(s.base + "/")).text();
      assert.ok(html.includes('src="/assets/rx/rx.js?v='));
      assert.equal((await fetch(s.base + "/assets/rx/rx.js")).status, 200);
    } finally {
      s.close();
    }
  });
});

describe("event stream", () => {
  test("live: broadcast reaches clients, late joiners get the snapshot", async () => {
    const s = await serve({ dev: false, live: true });
    try {
      const first = await readEvents(
        s.base + "/__rx/events",
        (ev) => ev.length >= 1,
        () => setTimeout(() => s.rx.broadcast("msg", { hi: 1 }), 50)
      );
      assert.deepEqual(first, [{ event: "state", data: { key: "msg", value: { hi: 1 } } }]);
      const late = await readEvents(s.base + "/__rx/events", (ev) => ev.length >= 1);
      assert.deepEqual(late, [{ event: "state", data: { key: "msg", value: { hi: 1 } } }]);
      assert.equal((await fetch(s.base + "/__rx/events", { method: "POST" })).status, 404);
    } finally {
      s.close();
    }
  });

  test("dev: file changes send reload events by kind", async () => {
    const s = await serve({ dev: true, watch: [pub] });
    try {
      const wait = (file: string, content: string, kind: string) =>
        readEvents(
          s.base + "/__rx/events",
          (ev) => ev.some((e) => e.event === "reload"),
          () => setTimeout(() => fs.writeFileSync(file, content), 100)
        ).then((ev) => assert.equal(ev.find((e) => e.event === "reload")?.data.kind, kind));
      await wait(path.join(views, "page.ejs"), fs.readFileSync(path.join(views, "page.ejs"), "utf8") + " ", "view");
      await wait(path.join(pub, "a.css"), "body{color:red}", "css");
      await wait(path.join(pub, "b.js"), "1", "full");
    } finally {
      s.close();
    }
  });

  test("close() ends streams", async () => {
    const s = await serve({ dev: false, live: true });
    const res = await fetch(s.base + "/__rx/events");
    const reader = res.body!.getReader();
    await reader.read(); // retry line
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(s.rx.clients, 1);
    s.close();
    let done = false;
    while (!done) done = (await reader.read()).done;
    assert.equal(s.rx.clients, 0);
  });
});
