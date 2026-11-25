import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 15000,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3100" },
  webServer: {
    command: "bun tests/baseline/server.ts",
    cwd: "../..",
    url: "http://localhost:3100",
    reuseExistingServer: false,
  },
});
