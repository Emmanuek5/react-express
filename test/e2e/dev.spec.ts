import fs from "node:fs";
import path from "node:path";
import { test, expect } from "./fixtures";

const root = path.resolve(import.meta.dirname, "../..");
const files = {
  view: path.join(root, "example/views/hmr.ejs"),
  css: path.join(root, "example/public/style.css"),
  js: path.join(root, "example/public/app.js"),
};
const originals = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));

test.afterEach(() => {
  for (const [k, f] of Object.entries(files)) {
    if (fs.readFileSync(f, "utf8") !== originals[k]) fs.writeFileSync(f, originals[k]);
  }
});

test.describe("live state", () => {
  test("broadcast reaches every page, as text", async ({ page, browser, request }) => {
    await page.goto("/live");
    await expect.poll(async () => (await (await request.post("/api/broadcast", { data: { key: "ping", value: 1 } })).json()).clients).toBeGreaterThan(0);

    const payload = '<img src=x onerror="window.pwned=1">';
    await request.post("/api/broadcast", { data: { key: "announcement", value: payload } });
    await expect(page.locator("#announcement")).toHaveText(payload);
    await expect(page.locator("#announcement img")).toHaveCount(0);

    // A page opened later gets the latest value from the snapshot.
    const other = await browser.newPage();
    await other.goto("/live");
    await expect(other.locator("#announcement")).toHaveText(payload);
    expect(await other.evaluate(() => (window as any).pwned)).toBeUndefined();
    await other.close();
  });

  test("browsers have no way to write live state", async ({ request }) => {
    const res = await request.post("/__rx/events", { data: { key: "announcement", value: "hacked" } });
    expect(res.status()).toBe(404);
  });
});

test.describe("hot reload", () => {
  test("view edit swaps the page and keeps state", async ({ page }) => {
    await page.goto("/hmr");
    await mark(page);
    await page.locator("#hmr-input").fill("keep me");
    const reloaded = page.evaluate(() => new Promise((r) => document.addEventListener("rx:hot-reload", r, { once: true })));
    fs.writeFileSync(files.view, originals.view.replace("Hot reload test", "Edited title"));
    await reloaded;
    await expect(page.locator("#hmr-title")).toHaveText("Edited title");
    await expect(page.locator("#hmr-input")).toHaveValue("keep me");
    expect(await page.evaluate(() => (window as any).__marker)).toBe(1);
  });

  test("CSS edit reloads stylesheets only", async ({ page }) => {
    await page.goto("/hmr");
    await mark(page);
    fs.writeFileSync(files.css, originals.css + "\n#hmr-title { color: rgb(255, 0, 0); }\n");
    await expect(page.locator("#hmr-title")).toHaveCSS("color", "rgb(255, 0, 0)");
    await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute("href", /\?rx=\d+/);
    expect(await page.evaluate(() => (window as any).__marker)).toBe(1);
  });

  test("other file edits do a full reload", async ({ page }) => {
    await page.goto("/hmr");
    await mark(page);
    const nav = page.waitForEvent("load");
    fs.writeFileSync(files.js, originals.js + "\n// edited\n");
    await nav;
    expect(await page.evaluate(() => (window as any).__marker)).toBeUndefined();
  });
});

test.describe("error overlay", () => {
  test("shows runtime errors as text and can be dismissed", async ({ page }) => {
    await page.goto("/hmr");
    await page.evaluate(() => setTimeout(() => { throw new Error("<b>boom</b>"); }));
    const overlay = page.locator("rx-error-overlay");
    await expect(overlay.locator(".msg")).toHaveText("Error: <b>boom</b>");
    await expect(overlay.locator(".msg b")).toHaveCount(0);
    await page.evaluate(() => {
      void Promise.reject(new Error("async boom"));
    });
    await expect(overlay.locator(".msg").first()).toHaveText("Error: async boom");
    await overlay.getByRole("button", { name: "Dismiss" }).click();
    await expect(overlay).toHaveCount(0);
  });
});

function mark(page: import("@playwright/test").Page) {
  return page.evaluate(() => ((window as any).__marker = 1));
}
