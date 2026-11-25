# Guide

[[toc]]

## Server

```ts
import { reactExpress } from "advanced-express";

const rx = reactExpress({
  viewsDir: "views",   // sets app "views"
  dev: true,           // hot reload + error overlay; default NODE_ENV !== "production"
  watch: ["public"],   // extra directories to watch in dev
  live: false,         // enable rx.broadcast()
  basePath: "/__rx",   // where rx.js and the event stream are served
})(app);
```

`attach(app)` returns a handle:

| Member | |
| --- | --- |
| `broadcast(key, value)` | Push a value to every open page (requires `live: true`). New pages get the latest values on connect. |
| `clients` | Number of connected pages. |
| `close()` | Stop file watchers and end event streams. |

### Initial state

Pass `rxState` to `res.render`, or set `res.locals.rxState` in middleware. They are merged (render option wins), JSON-serialized and escaped so that strings like `</script>` are safe.

```js
app.use((req, res, next) => { res.locals.rxState = { user: req.user?.name }; next(); });
app.get("/", (req, res) => res.render("index", { rxState: { count: 1 } }));
```

### CSP

Set `res.locals.cspNonce` and the injected `<script>` gets that nonce. Scripts re-run by the router copy it too. The client never uses `eval`, `new Function` or `innerHTML`.

### Request headers

Requests made by the client send `X-RX-Request: navigate | reload | fetch | form`, so you can tell them apart on the server.

### Production

With `dev: false` (or `NODE_ENV=production`) there is no file watching, no overlay and no event stream unless `live` is on. `rx.js` is served with a version query (`?v=<package version>`) and cached for an hour.

## State and bindings

The page has one store, seeded from `rxState`. Read and write it with `rx.get(path)`, `rx.set(key, value)`, `rx.update(key, fn)` and `rx.subscribe(path, fn)`. Paths can be dotted (`user.name`). `set` takes a top-level key.

| Attribute | Effect |
| --- | --- |
| `data-text="path"` | Sets `textContent` (never HTML). |
| `data-show="path"` / `data-hide="path"` | Toggles visibility. Empty arrays count as false. |
| `data-attr-NAME="path"` | Sets attribute `NAME`. `false`/`null` removes it. `on*` attributes are refused; `javascript:` and other unsafe URLs are blocked in `href`, `src`, `action` and similar. |
| `data-class-NAME="path"` | Toggles class `NAME`. |
| `data-model="key"` | Two-way binding for inputs, textareas and selects. |
| `data-on="event:name"` | Calls method `name` on the nearest component, else the global action `name`. Separate several with `;`. `submit` and link clicks call `preventDefault()`. |
| `data-each="path"` | Renders the `<template>` child once per array item, with `$item` and `$index`. |
| `data-ref="name"` | Available as `refs.name` in a component. |

### Expressions and formatters

An expression is a path, optionally negated and piped through formatters: `!items`, `name | upper`, `tags | length`. Built-ins are `json`, `upper`, `lower` and `length`. Add your own:

```js
rx.formatter("price", (n) => `$${Number(n).toFixed(2)}`);
```

### `data-model`

| Control | State value |
| --- | --- |
| text, textarea, select | string |
| `type="number"` / `range` | number (`null` when empty) |
| checkbox without `value` | boolean |
| checkboxes sharing a key, each with a `value` | array of checked values |
| radio | the checked value |
| `<select multiple>` | array |

If the key already exists in state, the control shows it. Otherwise the server-rendered control value becomes the initial state.

### Actions

```js
rx.action("save", async (event, el) => { /* ... */ });
```

Errors thrown (or rejected) by actions are reported to the console and to the dev overlay.

## Scopes

`data-scope` creates a nested store. `data-state` gives it initial values as JSON. Inside a scope, reads use the nearest scope that has the key, then outer scopes, then page state. Writes go to the scope that owns the key, so a scope can shadow an outer value without changing it.

```html
<section data-scope data-state='{"theme":"dark"}'>
  <b data-text="theme"></b>   <!-- dark -->
  <b data-text="count"></b>   <!-- from page state -->
</section>
```

`rx.scope(elOrSelector)` returns the store for an element.

## Components

```html
<section data-component="counter" data-prop-step="5" data-state='{"count":0}'>
  <strong data-text="count"></strong>
  <button data-on="click:up">+</button>
</section>

<script>
  rx.component("counter", ({ el, props, state, global, refs, on, watch, onCleanup, emit }) => {
    const step = Number(props.step ?? 1);
    return { up: () => state.update("count", (n) => n + step) };
  });
</script>
```

Each element gets its own scope and its own setup call. The setup receives:

| | |
| --- | --- |
| `el` | Root element. |
| `props` | `data-prop-*` attributes, JSON-parsed when possible (`data-prop-max-items` → `props.maxItems`). |
| `state` | The component's scope (`get`, `set`, `update`, `define`, `subscribe`). |
| `global` | Page state. |
| `refs` | `data-ref` elements inside the component. |
| `on(event, [selector], handler)` | Listener on the root, optionally delegated. Removed automatically. |
| `watch(path, fn)` | Runs on change. Removed automatically. |
| `onCleanup(fn)` | Runs when the element leaves the page. |
| `emit(name, detail)` | Dispatches a bubbling `CustomEvent`. |

Return an object of methods (for `data-on`) or a cleanup function. Components can be registered before or after their elements appear. Elements added to the page later, including with your own DOM code, are mounted automatically, and removed elements are cleaned up.

## Lists

```html
<ul data-each="items">
  <template>
    <li><span data-text="$item.text" data-class-done="$item.done"></span>
        <button data-on="click:remove">×</button></li>
  </template>
</ul>
```

Inside a method, `rx.scope(el).get("$index")` gives the item index for the clicked element.

## Data fetching

```html
<section data-fetch="/api/users/1" data-cache="15000">
  <p data-show="loading">Loading…</p>
  <p data-show="error" data-text="error"></p>
  <b data-show="data" data-text="data.name"></b>
  <button data-on="click:refresh">Reload</button>
</section>
```

| Attribute | |
| --- | --- |
| `data-fetch="url"` | GET as JSON. The scope has `loading`, `error` (message string or `null`) and `data`. Non-2xx responses set `error`, using the body's `error` field if it has one. |
| `data-cache="ms"` | Reuse the response (shared by all elements with the same URL) for this long. Failures are not cached. |
| `data-poll="ms"` | Refetch on an interval while the element is on the page. |
| `data-cross-origin` | Allow another origin. Cross-origin URLs are blocked without it. |

The `refresh` method (or `rx.refresh(el)`) refetches, bypassing the cache. `rx.clearFetchCache(url?)` empties the cache. Events `rx:loaded` and `rx:error` bubble from the element. The element has `aria-busy` while loading.

## Forms

```html
<form data-form data-json data-validate="signup" action="/api/signup" method="post" data-into="signup">
  <input name="email" type="email" required>
  <small data-error-for="email"></small>
  <button>Sign up</button>
  <span data-show="pending">Sending…</span>
  <p data-text="error"></p>
</form>
```

On submit:

1. Native constraints (`required`, `type`, `pattern`, …) are checked. Messages go into `[data-error-for=name]`, the field gets `aria-invalid`, and the first invalid field is focused.
2. If `data-validate="name"` is set, the validator registered with `rx.validator(name, fn)` runs. Return a string (form error) or `{ field: message }`. An unregistered name blocks the submit, so a typo can't skip validation.
3. The form is sent with `fetch`: as JSON with `data-json`, as multipart if it has files, otherwise URL-encoded. GET forms use the query string. A `<meta name="csrf-token">` value is sent as `X-CSRF-Token`.
4. While pending, submit buttons are disabled and a second submit is ignored.
5. A non-2xx JSON response like `{ "error": "...", "errors": { "email": "..." } }` fills `error` and the field slots. On success, `result` holds the response. `data-into="key"` also stores it in the outer scope, `data-reset` resets the form, and `{ "redirect": "/next" }` navigates.

Scope keys: `pending`, `error`, `errors`, `result`, `submitted`. Events: `rx:success`, `rx:error`. Method: `reset`. Repeated field names (checkbox groups) become arrays. `rx.formValues(form)` gives the same object.

## Router

Mark the region that changes between pages with `data-content`, and opt links in with `data-router` on a container or `data-route` on a link:

```html
<nav data-router>
  <a href="/" data-prefetch>Home</a>
  <a href="/about" data-prefetch>About</a>
</nav>
<main data-content>...</main>
```

Same-origin link clicks fetch the page and swap `[data-content]` (or `<body>` if either page lacks it). New stylesheets and head scripts are added once. Scripts inside the content run again on every visit, so page scripts work the same as on a full load. Top-level `let`/`const` in classic inline scripts is fine.

It falls back to a normal page load for non-HTML responses, other origins, modified clicks, `target`, `download`, `data-no-route` and errors. Redirects are followed and the final URL is shown. Back/forward restore scroll position. `data-prefetch` fetches on hover or focus.

| API / event | |
| --- | --- |
| `rx.navigate(url, { replace })` | Navigate from code. |
| `rx.prefetch(url)` | Warm up a page (kept for 10 s). |
| `rx.onPage(fn)` | Run `fn` once the current page is mounted. A returned function runs when leaving it. |
| `rx:navigate` | Before fetching; `preventDefault()` cancels. |
| `rx:beforeswap` / `rx:navigated` | Around the swap. |
| `rx:load` | After every page is mounted, including the first. Use it in layout scripts loaded once in `<head>`. |

`<html>` has the class `rx-navigating` while a navigation is in flight.

## Animations

```js
await rx.animate(el, "fadeIn", { duration: 200, easing: "ease-out", delay: 0 });
await rx.animate(el, [{ opacity: 0 }, { opacity: 1 }]);
await rx.show(el, "slideIn");
await rx.hide(el, "scaleOut");
```

Presets are `fadeIn`, `fadeOut`, `slideIn`, `slideOut`, `scaleIn` and `scaleOut`. The end state is kept. With `prefers-reduced-motion` the animation finishes immediately. The promise only rejects for an unknown preset name.

## Live state

```js
const rx = reactExpress({ live: true })(app);
rx.broadcast("announcement", "Deploy at 5pm");
```

```html
<b data-text="announcement"></b>
```

Values go from the server to every open page over Server-Sent Events. Pages cannot send anything back through this channel. Treat broadcast values as public: every visitor receives them.

## Dev mode

- Editing a view swaps the current page in place, keeping state, form values and scroll position.
- Editing a `.css` file reloads stylesheets without a refresh.
- Editing anything else in watched directories reloads the page.
- Uncaught errors and rejected promises appear in an overlay (rendered as text in a shadow root). Dismiss it with the button.
