import { test, expect, expectedErrors } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#counter strong")).toHaveText("1");
});

test("boots with server state and no unexpected errors", async ({ page, errors }) => {
  expect(await page.evaluate(() => typeof window.rx.version)).toBe("string");
  expect(await page.evaluate(() => (window as any).ReactExpress === window.rx)).toBe(true);
  expect(expectedErrors(errors)).toEqual([]);
});

test("counter: actions update global state", async ({ page }) => {
  const value = page.locator("#counter strong");
  const positive = page.getByText("Positive!");
  await expect(positive).toBeVisible();
  await page.getByRole("button", { name: "+" }).click();
  await expect(value).toHaveText("2");
  await page.getByRole("button", { name: "−" }).click();
  await page.getByRole("button", { name: "−" }).click();
  await expect(value).toHaveText("0");
  await expect(positive).toBeHidden();
});

test("server state is escaped, not parsed as HTML", async ({ page }) => {
  await expect(page.locator("#motd span")).toHaveText("</script><b>not html</b>");
  await expect(page.locator("#motd b")).toHaveCount(0);
});

test("data-attr blocks javascript: URLs", async ({ page, errors }) => {
  await expect(page.locator("#bad-link")).not.toHaveAttribute("href");
  expect(errors.some((e) => /blocked unsafe URL in href/.test(e))).toBe(true);
});

test("text input two-way binding", async ({ page }) => {
  const input = page.getByLabel("Name");
  await expect(input).toHaveValue("Jane");
  await input.fill("Bob");
  await expect(page.locator("#model b")).toHaveText("Bob");
  await expect(page.locator("#model p span").first()).toHaveText("3");
  await input.pressSequentially("by");
  await expect(page.locator("#model b")).toHaveText("Bobby");
  await page.evaluate(() => window.rx.set("name", "Ann"));
  await expect(input).toHaveValue("Ann");
});

test("checkbox group, boolean checkbox and number bindings", async ({ page }) => {
  const json = page.locator("#tags-json");
  await expect(page.getByLabel("express")).toBeChecked();
  await expect(json).toHaveText('["express"]');
  await page.getByLabel("ejs").check();
  await expect(json).toHaveText('["express","ejs"]');
  await page.getByLabel("express").uncheck();
  await expect(json).toHaveText('["ejs"]');

  await expect(page.locator("#agreed")).toBeHidden();
  await page.getByLabel("I agree").check();
  await expect(page.locator("#agreed")).toBeVisible();
  expect(await page.evaluate(() => window.rx.get("agree"))).toBe(true);

  await expect(page.locator("#next-age")).toHaveText("31");
  await page.getByLabel("Age").fill("40");
  await expect(page.locator("#next-age")).toHaveText("41");
  expect(await page.evaluate(() => window.rx.get("age"))).toBe(40);
});

test("scopes inherit and shadow outer state", async ({ page }) => {
  const inner = page.locator("#inner-theme");
  const outer = page.locator("#outer-theme");
  await expect(inner).toHaveText("dark");
  await expect(outer).toHaveText("light");
  // Inherited key follows the global value.
  await expect(page.locator("#inner-count")).toHaveText("1");
  await page.getByRole("button", { name: "+" }).click();
  await expect(page.locator("#inner-count")).toHaveText("2");

  await page.locator("#toggle-theme").click();
  await expect(inner).toHaveText("light");
  await page.evaluate(() => window.rx.set("theme", "blue"));
  await expect(outer).toHaveText("blue");
  await expect(inner).toHaveText("light");
  await page.locator("#toggle-theme").click();
  await expect(inner).toHaveText("dark");
  await expect(outer).toHaveText("blue");
});

test("animations run and settle", async ({ page }) => {
  const box = page.locator("#anim-box");
  await page.locator("#fade-out").click();
  await expect(box).toHaveCSS("opacity", "0");
  await page.locator("#fade-in").click();
  await expect(box).toHaveCSS("opacity", "1");
  const err = await page.evaluate(() =>
    window.rx.animate(document.body, "nope").then(() => "resolved", (e: Error) => e.message)
  );
  expect(err).toContain('unknown preset "nope"');
});

test("animations finish immediately with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const ms = await page.evaluate(async () => {
    const t = performance.now();
    await window.rx.animate(document.getElementById("anim-box")!, "fadeOut", { duration: 2000 });
    return performance.now() - t;
  });
  expect(ms).toBeLessThan(500);
  await expect(page.locator("#anim-box")).toHaveCSS("opacity", "0");
});
