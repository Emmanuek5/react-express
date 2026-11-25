# advanced-express

Interactive, server-rendered Express apps without a front-end build step. Render views on the server, then add behaviour with HTML attributes: state bindings, components, client-side navigation, data fetching, forms and hot reload.

## Install

```sh
npm install advanced-express express ejs
```

## Set up

```js
import express from "express";
import { reactExpress } from "advanced-express";

const app = express();
app.set("view engine", "ejs");
const rx = reactExpress({ viewsDir: "views" })(app);

app.get("/", (req, res) => res.render("index", { rxState: { count: 1 } }));
app.listen(3000);
```

Every page rendered with `res.render` gets the client script (`window.rx`) and its initial state. Your template only needs a `<head>`:

```html
<button data-on="click:inc">+</button>
<strong data-text="count"></strong>
<script>
  rx.action("inc", () => rx.update("count", (n) => n + 1));
</script>
```

Continue with the [Guide](/guide).
