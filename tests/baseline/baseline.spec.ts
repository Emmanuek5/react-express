// Baseline: what the OLD implementation actually does, feature by feature.
// Each test asserts the behaviour the README/docs promise.
import { test, expect, Page } from "@playwright/test";

let errors: string[] = [];
async function open(page: Page, url = "/") {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(800);
}

test("boots without JS errors", async ({ page }) => {
  await open(page);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("state: counter increments (numbers)", async ({ page }) => {
  await open(page);
  await page.click("#incCount");
  await page.click("#incCount");
  await expect(page.locator('strong[data-react-state="count"]')).toHaveText("2");
});

test("state: two-way input binding", async ({ page }) => {
  await open(page);
  await page.fill('input[data-react-state="name"]', "Bob");
  await expect(page.locator('strong[data-react-state="name"]')).toHaveText("Bob");
});

test("suspense: loads /api/profile", async ({ page }) => {
  await open(page);
  await expect(page.locator('[data-bind="name"]')).toHaveText("Jane Doe", { timeout: 3000 });
});

test("forms: JSON submit calls success handler", async ({ page }) => {
  await open(page);
  await page.fill('#contactForm [name="name"]', "A");
  await page.fill('#contactForm [name="email"]', "a@b.co");
  await page.click('#contactForm [type="submit"]');
  await expect(page.locator("#submitStatus")).toHaveText("Sent", { timeout: 3000 });
});

test("context: consumer reflects provider changes", async ({ page }) => {
  await open(page);
  await page.click("#darkBtn");
  await expect(page.locator('[data-context-consumer="Theme"]')).toHaveText("dark");
});

test("animations: fade out sets opacity 0", async ({ page }) => {
  await open(page);
  await page.click("#fadeOutBtn");
  await page.waitForTimeout(700);
  const op = await page.locator("#animBox").evaluate((e) => getComputedStyle(e).opacity);
  expect(op).toBe("0");
});

test("components: createComponent counter", async ({ page }) => {
  await open(page);
  await page.click("#increment");
  await page.click("#increment");
  await expect(page.locator("#counterComp .count")).toHaveText("2");
});

test("vdom: render and re-render list", async ({ page }) => {
  await open(page);
  await page.click("#vdomRender");
  await page.click("#vdomToggle");
  await expect(page.locator("#vdomMount li")).toHaveText(["alpha", "beta", "gamma"]);
});

test("store: commit adds item to bound list", async ({ page }) => {
  await open(page);
  await page.fill("#storeInput", "milk");
  await page.click("#storeAdd");
  await expect(page.locator('[data-react-state="items"] li')).toHaveText(["milk"]);
});

test("router: navigates without reload and runs page script", async ({ page }) => {
  await open(page);
  await page.evaluate(() => ((window as any).__marker = 1));
  await page.click('a[href="/page-a"]');
  await expect(page.locator("h1")).toHaveText("Page A");
  expect(await page.evaluate(() => (window as any).__marker)).toBe(1);
  await expect(page.locator("#aMount")).toContainText("Page A Mounted");
});

test("router: back button returns home", async ({ page }) => {
  await open(page);
  await page.click('a[href="/page-a"]');
  await expect(page.locator("h1")).toHaveText("Page A");
  await page.goBack();
  await expect(page.locator("#incCount")).toBeVisible();
});

test("security: state set by one client does not reach another", async ({ browser }) => {
  const a = await browser.newPage();
  const b = await browser.newPage();
  await open(a); await b.goto("/"); await b.waitForTimeout(800);
  await a.evaluate(() => (window as any).ReactExpress.setState("name", "<img src=x onerror=window.__pwned=1>", { sync: true }));
  await b.waitForTimeout(800);
  expect(await b.locator('strong[data-react-state="name"]').textContent()).not.toContain("img");
});
