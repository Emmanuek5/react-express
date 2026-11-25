// Example app for advanced-express. Run: npm run example   (Node >= 22.6 or Bun)
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import express from "express";
import { reactExpress } from "advanced-express";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(here, "public")));

const rx = reactExpress({
  viewsDir: path.join(here, "views"),
  watch: [path.join(here, "public")],
  live: true,
})(app);

const nav = [
  { href: "/", label: "State" },
  { href: "/components", label: "Components" },
  { href: "/data", label: "Data & Forms" },
  { href: "/live", label: "Live" },
];
app.use((req, res, next) => {
  res.locals.nav = nav;
  res.locals.path = req.path;
  next();
});

app.get("/", (_req, res) => {
  res.render("index", {
    title: "State",
    // Server-provided initial state, safely serialized into the page.
    rxState: { count: 1, name: "Jane", tags: ["express"], theme: "light", motd: "</script><b>not html</b>" },
  });
});
app.get("/components", (_req, res) => res.render("components", { title: "Components" }));
app.get("/data", (_req, res) => res.render("data", { title: "Data & Forms" }));
app.get("/live", (_req, res) => res.render("live", { title: "Live", rxState: { visitors: rx.clients } }));
app.get("/hmr", (_req, res) => res.render("hmr", { title: "HMR" }));
app.get("/old", (_req, res) => res.redirect("/components"));
app.get("/broken", (_req, res) => res.render("does-not-exist"));

// --- APIs -------------------------------------------------------------------
const users: Record<string, { name: string; email: string; avatar: string }> = {
  "1": { name: "Jane Doe", email: "jane@example.com", avatar: "/avatar.svg" },
};
app.get("/api/users/:id", async (req, res) => {
  await new Promise((r) => setTimeout(r, Number(req.query.delay ?? 150)));
  const user = users[req.params.id];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

let fetchCount = 0;
app.get("/api/counter", (_req, res) => res.json({ n: ++fetchCount }));

app.post("/api/signup", (req, res) => {
  const { name, email, plan } = req.body ?? {};
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required";
  if (email === "taken@example.com") errors.email = "That email is already registered";
  if (Object.keys(errors).length) return res.status(422).json({ error: "Please fix the errors below", errors });
  res.json({ ok: true, name, email, plan, interests: req.body.interests ?? [] });
});

app.get("/api/search", (req, res) => res.json({ q: req.query.q ?? "" }));

app.post("/api/broadcast", (req, res) => {
  rx.broadcast(String(req.body.key), req.body.value);
  res.json({ ok: true, clients: rx.clients });
});

// Errors from res.render reach Express's error handler instead of crashing the process.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[example]", err.message);
  res.status(500).type("text").send("Something broke: " + err.message);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`Example running on http://localhost:${port}`));
