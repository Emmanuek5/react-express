import { defineConfig } from "@playwright/test";

// Run `npm run build` first (npm test does this): the example serves dist/client/rx.js.
export const DEV_URL = "http://localhost:3123";
export const PROD_URL = "http://localhost:3124";

export default defineConfig({
  testDir: "test/e2e",
  timeout: 15_000,
  // HMR tests edit example files and live tests share server state: keep it serial.
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: DEV_URL, browserName: "chromium" },
  webServer: [
    {
      command: "node example/server.ts",
      url: DEV_URL,
      env: { PORT: "3123", NODE_ENV: "development" },
      reuseExistingServer: false,
      stdout: "ignore",
    },
    {
      command: "node example/server.ts",
      url: PROD_URL,
      env: { PORT: "3124", NODE_ENV: "production" },
      reuseExistingServer: false,
      stdout: "ignore",
    },
  ],
});
