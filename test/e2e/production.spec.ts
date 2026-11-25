import { test, expect } from "./fixtures";
import pkg from "../../package.json" with { type: "json" };

const PROD = "http://localhost:3124";

test("production: no dev features, versioned and cached client", async ({ page, request }) => {
  await page.goto(PROD + "/");
  const config = await page.evaluate(() => window.rx.config);
  expect(config.dev).toBe(false);

  const src = await page.locator("script[data-rx-client]").getAttribute("src");
  expect(src).toBe(`/__rx/rx.js?v=${pkg.version}`);
  const res = await request.get(PROD + src!);
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toContain("max-age=3600");

  // Features still work.
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.locator("#counter strong")).toHaveText("2");

  // No error overlay in production.
  await page.evaluate(() => setTimeout(() => { throw new Error("prod error"); }));
  await page.waitForTimeout(200);
  await expect(page.locator("rx-error-overlay")).toHaveCount(0);
});
