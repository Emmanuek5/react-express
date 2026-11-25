import { test, expect } from "./fixtures";

test.describe("data-fetch", () => {
  test("loading, data and error states", async ({ page, errors }) => {
    await page.goto("/data");
    const profile = page.locator("#profile");
    await expect(profile.getByText("Loading…")).toBeVisible();
    await expect(profile.locator("b")).toHaveText("Jane Doe");
    await expect(profile.getByText("jane@example.com")).toBeVisible();
    await expect(profile.locator("img")).toHaveAttribute("src", "/avatar.svg");
    await expect(profile.getByText("Loading…")).toBeHidden();
    await expect(profile).not.toHaveAttribute("aria-busy");

    await expect(page.locator("#missing .err")).toHaveText("User not found");
    await expect(page.locator("#missing").getByText("Loading…")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("refresh refetches", async ({ page }) => {
    await page.goto("/data");
    const n = page.locator("#fresh b");
    await expect(n).toHaveText(/^\d+$/);
    const first = Number(await n.textContent());
    await page.locator("#fresh-refresh").click();
    await expect(n).toHaveText(String(first + 1));
    await page.evaluate(() => window.rx.refresh("#fresh"));
    await expect(n).toHaveText(String(first + 2));
  });

  test("data-cache reuses the response across visits", async ({ page }) => {
    let hits = 0;
    page.on("request", (r) => r.url().endsWith("/api/users/1") && hits++);
    await page.goto("/data");
    await expect(page.locator("#profile b")).toHaveText("Jane Doe");
    await page.getByRole("link", { name: "Components" }).click();
    await expect(page.locator("h1")).toHaveText("Components");
    await page.getByRole("link", { name: "Data & Forms" }).click();
    await expect(page.locator("#profile b")).toHaveText("Jane Doe");
    expect(hits).toBe(1);
  });

  test("cross-origin URLs are blocked by default", async ({ page }) => {
    await page.goto("/data");
    await page.evaluate(() => {
      const s = document.createElement("div");
      s.id = "xo";
      s.setAttribute("data-fetch", "https://example.com/x.json");
      s.innerHTML = '<span data-text="error"></span>';
      document.querySelector("main")!.append(s);
    });
    await expect(page.locator("#xo span")).toContainText("Cross-origin data-fetch blocked");
  });
});

test.describe("data-form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/data");
  });

  test("native validation shows field errors and sends nothing", async ({ page }) => {
    let sent = 0;
    page.on("request", (r) => r.url().includes("/api/signup") && sent++);
    await page.locator("#signup-submit").click();
    await expect(page.locator('[data-error-for="name"]')).not.toBeEmpty();
    await expect(page.locator('[data-error-for="email"]')).not.toBeEmpty();
    await expect(page.locator('#signup [name="name"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator('#signup [name="name"]')).toBeFocused();
    expect(sent).toBe(0);
  });

  test("custom validator blocks submit", async ({ page }) => {
    let sent = 0;
    page.on("request", (r) => r.url().includes("/api/signup") && sent++);
    await page.getByLabel("Name").fill("A");
    await page.getByLabel("Email").fill("a@example.com");
    await page.locator("#signup-submit").click();
    await expect(page.locator('[data-error-for="name"]')).toHaveText("Name must be at least 2 characters");
    expect(sent).toBe(0);
  });

  test("server field errors (422) are shown", async ({ page }) => {
    await page.getByLabel("Name").fill("Bob");
    await page.getByLabel("Email").fill("taken@example.com");
    await page.locator("#signup-submit").click();
    await expect(page.locator('[data-error-for="email"]')).toHaveText("That email is already registered");
    await expect(page.locator("#form-error")).toHaveText("Please fix the errors below");
    await expect(page.locator("#signup-ok")).toBeHidden();
  });

  test("successful JSON submit with select and checkbox group", async ({ page }) => {
    const req = page.waitForRequest((r) => r.url().includes("/api/signup"));
    await page.getByLabel("Name").fill("Bob");
    await page.getByLabel("Email").fill("bob@example.com");
    await page.getByLabel("Plan").selectOption("pro");
    await page.getByLabel("news").check();
    await page.getByLabel("tips").check();
    await page.locator("#signup-submit").click();
    const r = await req;
    expect(r.headers()["content-type"]).toBe("application/json");
    expect(r.postDataJSON()).toEqual({ name: "Bob", email: "bob@example.com", plan: "pro", interests: ["news", "tips"] });
    await expect(page.locator("#signup-ok b")).toHaveText("Bob");
    await expect(page.locator("#signup-ok span")).toHaveText('["news","tips"]');
    await expect(page.locator("#form-error")).toBeEmpty();
  });

  test("no double submit while pending; CSRF header sent", async ({ page }) => {
    let sent = 0;
    await page.route("**/api/signup", async (route) => {
      sent++;
      expect(route.request().headers()["x-csrf-token"]).toBe("tok123");
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });
    await page.evaluate(() => {
      const m = document.createElement("meta");
      m.name = "csrf-token";
      m.content = "tok123";
      document.head.append(m);
    });
    await page.getByLabel("Name").fill("Bob");
    await page.getByLabel("Email").fill("bob@example.com");
    await page.locator("#signup-submit").click();
    await expect(page.locator("#signup-submit")).toBeDisabled();
    await expect(page.getByText("Sending…")).toBeVisible();
    await page.locator("#signup").evaluate((f: HTMLFormElement) => f.requestSubmit());
    await expect(page.locator("#signup-ok b")).toHaveText("Bob");
    await expect(page.locator("#signup-submit")).toBeEnabled();
    expect(sent).toBe(1);
  });

  test("GET form puts fields in the query string", async ({ page }) => {
    await page.locator("#search").getByRole("button", { name: "Search" }).click();
    await expect(page.locator("#search-result")).toHaveText("hello world");
  });

  test("unknown validator refuses to submit", async ({ page, errors }) => {
    let sent = 0;
    page.on("request", (r) => r.url().includes("/api/search") && sent++);
    await page.evaluate(() => {
      const f = document.createElement("form");
      f.id = "nov";
      f.setAttribute("data-form", "");
      f.setAttribute("data-validate", "nope");
      f.action = "/api/search";
      f.innerHTML = "<button>go</button>";
      document.querySelector("main")!.append(f);
    });
    await page.locator("#nov button").click();
    await expect.poll(() => errors.some((e) => e.includes('no validator registered as "nope"'))).toBe(true);
    expect(sent).toBe(0);
  });
});
