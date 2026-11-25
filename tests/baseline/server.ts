// Baseline server: runs the OLD published build (dist/) against the example views.
// Usage: bun tests/baseline/server.ts   (or node, to show the Node failure)
import path from "path";
import express from "express";
import { Server } from "http";
import { fileURLToPath } from "url";
import { reactExpress } from "../../dist/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const views = path.join(here, "../../example/views");
const app = express();
const server = new Server(app);
app.set("server", server);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("views", views);

reactExpress({ viewsDir: views, hmr: true })(app);

app.get("/", (_q, r) => r.render("index"));
app.get("/page-a", (_q, r) => r.render("page-a"));
app.get("/page-b", (_q, r) => r.render("page-b"));
app.get("/api/profile", async (_q, r) => {
  await new Promise((x) => setTimeout(x, 200));
  r.json({ name: "Jane Doe", email: "jane.doe@example.com", avatar: "" });
});
app.post("/api/submit", (q, r) => {
  const { name, email } = q.body || {};
  if (!name || !email) return r.status(400).json({ error: "Name and email are required" });
  r.json({ ok: true });
});

const port = Number(process.env.PORT || 3100);
server.listen(port, () => console.log(`baseline on ${port}`));
