import { test, expect, expectedErrors } from "./fixtures";

const mark = (page: import("@playwright/test").Page) => page.evaluate(() => ((window as any).__marker = 1));
const marked = (page: import("@playwright/test").Page) => page.evaluate(() => (window as any).__marker === 1);

test("nav links swap content without a full load", async ({ page, errors }) => {
  await page.goto("/");
  await mark(page);
  await page.getByRole("link", { name: "Components" }).click();
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.locator("h1")).toHaveText("Components");
  await expect(page).toHaveTitle(/Components/);
  expect(await marked(page)).toBe(true);
  // Page script ran: the component works.
  await page.locator("#c1").getByRole("button", { name: "+" }).click();
  await expect(page.locator("#c1 strong")).toHaveText("5");
  // Layout script (rx:load) updated the active link.
  await expect(page.getByRole("link", { name: "Components" })).toHaveClass(/active/);
  await expect(page.getByRole("link", { name: "State" })).not.toHaveClass(/active/);
  expect(expectedErrors(errors)).toEqual([]);
});

test("page scripts re-run on every visit; head scripts run once", async ({ page, errors }) => {
  const warnings: string[] = [];
  page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
  let appJs = 0;
  page.on("request", (r) => new URL(r.url()).pathname === "/app.js" && appJs++);
  await page.goto("/components");
  await page.getByRole("link", { name: "State" }).click();
  await expect(page.locator("h1")).toHaveText("State & bindings");
  await page.getByRole("link", { name: "Components" }).click();
  await expect(page.locator("h1")).toHaveText("Components");
  expect(await page.evaluate(() => (window as any).componentsVisits)).toBe(2);
  expect(await page.locator('head script[src="/app.js"]').count()).toBe(1);
  expect(appJs).toBe(1);
  // Component registered twice (once per visit) still works on the new DOM.
  await page.locator("#c2").getByRole("button", { name: "+" }).click();
  await expect(page.locator("#c2 strong")).toHaveText("101");
  // Leaving the page cleaned up the old todos component.
  expect(await page.evaluate(() => (window as any).todosCleanedUp)).toBe(1);
  expect(expectedErrors(errors)).toEqual([]);
  expect(warnings.filter((w) => w.includes("registered twice"))).toEqual([]);
});

test("new head scripts and styles from the next page are added once and run once", async ({ page }) => {
  await page.route("**/extra.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: "window.extraRuns = (window.extraRuns || 0) + 1;" })
  );
  await page.route("**/extra.css", (r) => r.fulfill({ contentType: "text/css", body: "h1 { color: rgb(0, 128, 0); }" }));
  await page.route("**/components", async (r) => {
    const res = await r.fetch();
    const html = (await res.text()).replace(
      "</head>",
      '<link rel="stylesheet" href="/extra.css"><script src="/extra.js"></script></head>'
    );
    await r.fulfill({ response: res, body: html });
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Components" }).click();
  await expect(page.locator("h1")).toHaveText("Components");
  await expect(page.locator("h1")).toHaveCSS("color", "rgb(0, 128, 0)");
  expect(await page.evaluate(() => (window as any).extraRuns)).toBe(1);
  expect(await page.locator('head script[src="/extra.js"]').count()).toBe(1);
  // Visiting again does not add or run it a second time.
  await page.getByRole("link", { name: "State" }).click();
  await page.getByRole("link", { name: "Components" }).click();
  await expect(page.locator("h1")).toHaveText("Components");
  expect(await page.evaluate(() => (window as any).extraRuns)).toBe(1);
  expect(await page.locator('head link[href="/extra.css"]').count()).toBe(1);
});

test("back and forward", async ({ page }) => {
  await page.goto("/");
  await mark(page);
  await page.getByRole("link", { name: "Data & Forms" }).click();
  await expect(page.locator("h1")).toHaveText("Data & Forms");
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("h1")).toHaveText("State & bindings");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.locator("#counter strong")).not.toHaveText("");
  await page.goForward();
  await expect(page.locator("h1")).toHaveText("Data & Forms");
  await expect(page.locator("#profile b")).toHaveText("Jane Doe");
  expect(await marked(page)).toBe(true);
});

test("restores scroll position on back", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 300 });
  await page.goto("/");
  await page.evaluate(() => scrollTo(0, 400));
  expect(await page.evaluate(() => scrollY)).toBe(400);
  await page.waitForTimeout(250); // debounced save
  // Not a click: Playwright would scroll the nav link into view first.
  await page.evaluate(() => window.rx.navigate("/components"));
  await expect(page.locator("h1")).toHaveText("Components");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page.locator("h1")).toHaveText("State & bindings");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(400);
});

test("follows redirects and shows the final URL", async ({ page }) => {
  await page.goto("/");
  await mark(page);
  await page.evaluate(() => window.rx.navigate("/old"));
  await expect(page).toHaveURL(/\/components$/);
  await expect(page.locator("h1")).toHaveText("Components");
  expect(await marked(page)).toBe(true);
});

test("non-HTML responses fall back to a full load", async ({ page }) => {
  await page.goto("/");
  await mark(page);
  await page.evaluate(() => window.rx.navigate("/broken"));
  await expect(page.locator("body")).toContainText("Something broke");
  expect(await marked(page)).toBe(false);
});

test("rx:navigate can be cancelled; external links are not intercepted", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.addEventListener("rx:navigate", (e) => e.preventDefault(), { once: true }));
  await page.evaluate(() => window.rx.navigate("/components"));
  await expect(page.locator("h1")).toHaveText("State & bindings");
  const intercepted = await page.evaluate(() => {
    const a = document.createElement("a");
    a.href = "https://example.com/";
    a.setAttribute("data-route", "");
    document.body.append(a);
    let prevented = false;
    a.addEventListener("click", (e) => {
      prevented = e.defaultPrevented;
      e.preventDefault();
    });
    a.click();
    return prevented;
  });
  expect(intercepted).toBe(false);
});

test("hovering a link prefetches it", async ({ page }) => {
  await page.goto("/");
  const req = page.waitForRequest((r) => new URL(r.url()).pathname === "/data" && r.headers()["x-rx-request"] === "navigate");
  await page.getByRole("link", { name: "Data & Forms" }).hover();
  await req;
  let refetched = false;
  page.on("request", (r) => new URL(r.url()).pathname === "/data" && (refetched = true));
  await page.getByRole("link", { name: "Data & Forms" }).click();
  await expect(page.locator("h1")).toHaveText("Data & Forms");
  expect(refetched).toBe(false);
});

test("onPage hooks run per page and clean up on leave", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as any).hookLog = [];
    window.rx.onPage(() => {
      (window as any).hookLog.push("run");
      return () => (window as any).hookLog.push("cleanup");
    });
  });
  await page.getByRole("link", { name: "Live" }).click();
  await expect(page.locator("h1")).toHaveText("Live state");
  expect(await page.evaluate(() => (window as any).hookLog)).toEqual(["run", "cleanup"]);
});
