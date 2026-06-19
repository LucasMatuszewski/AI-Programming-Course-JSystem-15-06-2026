import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 180_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    testIdAttribute: "data-testid",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
