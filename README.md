# advanced-express

Interactive, server-rendered Express apps without a front-end build step. You render EJS (or any view engine) on the server, and add behaviour with HTML attributes: state bindings, components, client-side navigation, data fetching, forms and hot reload.

[📚 Documentation](https://react-express-docs.pages.dev/) · [Guide in this repo](docs/guide.md)

- **No `eval`, no `new Function`, no `innerHTML`** in the client runtime, so it works under a strict CSP (pass a nonce via `res.locals.cspNonce`).
- **Server state is serialized safely** into the page (`</script>` and friends are escaped).
- **~25 kB** minified client, served by the middleware. Nothing to bundle.
- Express **4.17+ and 5**, Node **20+**.

## Install

```sh
npm install advanced-express express ejs
```

## Quick start

```js
import express from "express";
import { reactExpress } from "advanced-express";

const app = express();
app.set("view engine", "ejs");

const rx = reactExpress({ viewsDir: "views" })(app);

app.get("/", (req, res) => {
  res.render("index", { rxState: { count: 1 } }); // initial client state
});

app.listen(3000);
```

```html
<!-- views/index.ejs -->
<!DOCTYPE html>
<html>
  <head><title>Counter</title></head>
  <body>
    <button data-on="click:dec">−</button>
    <strong data-text="count"></strong>
    <button data-on="click:inc">+</button>
    <p data-show="count | positive">Positive!</p>

    <script>
      rx.formatter("positive", (n) => n > 0);
      rx.action("inc", () => rx.update("count", (n) => n + 1));
      rx.action("dec", () => rx.update("count", (n) => n - 1));
    </script>
  </body>
</html>
```

`res.render` is wrapped so every rendered page gets the client script and its initial state. Nothing else is needed in the template.

## Features

| Feature | How |
| --- | --- |
| State bindings | `data-text`, `data-show` / `data-hide`, `data-attr-*`, `data-class-*`, formatters (`count \| json`) |
| Two-way binding | `data-model` on text, number, checkbox, checkbox group, radio, select, multi-select |
| Events | `data-on="click:save; input:search"` calls a component method or a global `rx.action` |
| Scopes (context) | `data-scope data-state='{"theme":"dark"}'`: children read the nearest value, falling back to outer scopes |
| Components | `data-component="name"` + `rx.component(name, setup)`, with props, refs, watch and cleanup |
| Lists | `data-each="items"` with a `<template>`; `$item` and `$index` inside |
| Data fetching | `data-fetch="/api/user"` exposes `loading`, `error`, `data`; cache, polling, refresh |
| Forms | `data-form`: native + custom validation, server field errors (422), JSON or form encoding, CSRF header |
| Router | Links inside `data-router` swap `[data-content]` without a full load; history, scroll, prefetch |
| Animations | `rx.animate(el, "fadeIn")`, `rx.show`, `rx.hide`; respects `prefers-reduced-motion` |
| Live state | `rx.broadcast(key, value)` on the server updates every open page (server → browser only) |
| Dev mode | Hot reload (views swap in place, CSS reloads without a refresh) and an error overlay |

See `example/` for a working app (`npm run example`, then open http://localhost:3000).

## Server options

```ts
reactExpress({
  viewsDir?: string,     // sets app "views"
  dev?: boolean,         // hot reload + error overlay; default NODE_ENV !== "production"
  watch?: string[],      // extra dirs to watch in dev (e.g. public/)
  live?: boolean,        // enable rx.broadcast(); default false
  basePath?: string,     // where the client and event stream are served; default "/__rx"
})(app) // → { broadcast(key, value), clients, close() }
```

## Upgrading from 1.x

2.0 is a rewrite. The 1.x runtime evaluated page scripts with `eval`, shared one global state object between *all* visitors (one user could inject HTML into another user's page), and most features did not work reliably. 2.0 keeps the same feature areas, built on HTML attributes:

- `useState` / hooks / reactive state / store → page state (`rx.get/set/update`) and component scopes.
- Context → `data-scope` (nested scopes inherit values).
- Suspense → `data-fetch` (`loading` / `error` / `data`).
- Virtual DOM and error boundaries are gone. Render HTML on the server, use `data-each` for lists, and runtime errors show in the dev overlay.
- Shared server state is now one-way and opt-in (`live: true` + `rx.broadcast`). Browsers cannot write it.
- `window.ReactExpress` still points at the new `rx` object, so old lookups don't throw, but the 1.x API itself is not provided.

## Development

```sh
npm install
npx playwright install chromium
npm test          # build, typecheck, server tests (node --test), browser tests (Playwright)
npm run example   # example app on :3000
npm run docs:dev  # documentation site
```

## License

MIT
