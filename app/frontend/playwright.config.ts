import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "3000";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const shouldStartServer = process.env.E2E_START_SERVER === "1" && !process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 45_000,
  expect: {
    timeout: 7_500
  },
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    testIdAttribute: "data-testid"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: shouldStartServer
    ? {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe"
      }
    : undefined
});
