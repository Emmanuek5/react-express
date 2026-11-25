import { test, expect } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/components");
});

test("component instances have props and independent state", async ({ page, errors }) => {
  const c1 = page.locator("#c1");
  const c2 = page.locator("#c2");
  await expect(c1.locator("h2 span")).toHaveText("5");
  await expect(c1.locator("strong")).toHaveText("0");
  await c1.getByRole("button", { name: "+" }).click();
  await c1.getByRole("button", { name: "+" }).click();
  await expect(c1.locator("strong")).toHaveText("10");
  await c1.getByRole("button", { name: "−" }).click();
  await expect(c1.locator("strong")).toHaveText("5");

  await expect(c2.locator("strong")).toHaveText("100");
  await c2.getByRole("button", { name: "+" }).click();
  await expect(c2.locator("strong")).toHaveText("101");
  await expect(c1.locator("strong")).toHaveText("5");
  expect(errors).toEqual([]);
});

test("todos: data-each add, toggle, remove", async ({ page }) => {
  const todos = page.locator("#todos");
  const input = todos.getByPlaceholder("What needs doing?");
  await expect(todos.getByText("Nothing to do.")).toBeVisible();

  await input.fill("first");
  await input.press("Enter");
  await input.fill("second");
  await todos.getByRole("button", { name: "Add" }).click();

  await expect(todos.locator("li")).toHaveCount(2);
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(todos.getByText("Nothing to do.")).toBeHidden();
  await expect(todos.locator("p.muted span")).toHaveText("2");

  await todos.locator("li").first().getByRole("button", { name: "done" }).click();
  await expect(todos.locator("li span").first()).toHaveClass(/done/);
  await expect(todos.locator("li span").nth(1)).not.toHaveClass(/done/);

  await todos.locator("li").first().getByRole("button", { name: "×" }).click();
  await expect(todos.locator("li")).toHaveCount(1);
  await expect(todos.locator("li span")).toHaveText("second");
});

test("user text is rendered as text (no HTML injection)", async ({ page }) => {
  const input = page.getByPlaceholder("What needs doing?");
  await input.fill('<img src=x onerror="window.pwned=1">');
  await input.press("Enter");
  await expect(page.locator("#todos li span")).toHaveText('<img src=x onerror="window.pwned=1">');
  await expect(page.locator("#todos img")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).pwned)).toBeUndefined();
});

test("components inserted later are mounted, removed ones cleaned up", async ({ page }) => {
  await page.evaluate(() => {
    const s = document.createElement("section");
    s.id = "c3";
    s.dataset.component = "counter";
    s.dataset.state = '{"count":7}';
    s.innerHTML = '<strong data-text="count"></strong><button data-on="click:up">up</button>';
    document.querySelector("main")!.append(s);
  });
  await expect(page.locator("#c3 strong")).toHaveText("7");
  await page.locator("#c3 button").click();
  await expect(page.locator("#c3 strong")).toHaveText("8");

  // Moving a mounted element keeps it working.
  await page.evaluate(() => document.querySelector("main")!.prepend(document.getElementById("c3")!));
  await page.locator("#c3 button").click();
  await expect(page.locator("#c3 strong")).toHaveText("9");

  expect(await page.evaluate(() => (window as any).todosCleanedUp)).toBeUndefined();
  await page.evaluate(() => document.getElementById("todos")!.remove());
  await expect.poll(() => page.evaluate(() => (window as any).todosCleanedUp)).toBe(1);
});
