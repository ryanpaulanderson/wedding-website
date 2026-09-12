import { defineConfig } from "@playwright/test";
import baseConfiguration from "./playwright.config";
import {
  ADMIN_TEST_PASSWORD_HASH,
  ADMIN_TEST_SESSION_SECRET,
} from "./e2e/fixtures/admin-credentials";

// Select hosted expectations in the test runner as well as in the child server.
process.env.VERCEL = "1";
const baseURL = "https://127.0.0.1:3443";

export default defineConfig(baseConfiguration, {
  testMatch: "admin.spec.ts",
  outputDir: "test-results/admin-https",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/admin-https" }]],
  use: {
    baseURL,
    // Only this isolated browser context accepts the ephemeral loopback certificate.
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: process.env.CI
      ? "node scripts/serve-admin-https.mjs"
      : "pnpm build && node scripts/serve-admin-https.mjs",
    env: {
      ...process.env,
      VERCEL: "1",
      SITE_PASSWORD_GATE: "disabled",
      ADMIN_PASSWORD_HASH: ADMIN_TEST_PASSWORD_HASH,
      ADMIN_SESSION_SECRET: ADMIN_TEST_SESSION_SECRET,
    },
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
