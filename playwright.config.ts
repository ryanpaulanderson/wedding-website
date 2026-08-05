import { defineConfig, devices } from "@playwright/test";
import {
  ADMIN_TEST_PASSWORD_HASH,
  ADMIN_TEST_SESSION_SECRET,
} from "./e2e/fixtures/admin-credentials";

const baseURL = "http://127.0.0.1:3000";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://wedding:wedding@127.0.0.1:5432/wedding?schema=public";

process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    env: {
      ...process.env,
      ADMIN_PASSWORD_HASH: ADMIN_TEST_PASSWORD_HASH,
      ADMIN_SESSION_SECRET: ADMIN_TEST_SESSION_SECRET,
      DATABASE_URL: databaseUrl,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
