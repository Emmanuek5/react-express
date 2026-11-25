import { test as base, expect } from "@playwright/test";

/** Collects uncaught page errors so each test can assert on them. */
// `auto` so the listener exists before beforeEach hooks load a page.
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use(errors);
    },
    { auto: true },
  ],
});

/** Errors the example triggers on purpose (the unsafe link demo on "/"). */
export const expectedErrors = (errors: string[]) => errors.filter((e) => !/blocked unsafe URL/.test(e));

export { expect };
