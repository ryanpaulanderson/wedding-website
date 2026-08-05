import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createSignedSession } from "../src/lib/credential-security";
import { ADMIN_TEST_PASSWORD, ADMIN_TEST_SESSION_SECRET } from "./fixtures/admin-credentials";

const ADMIN_COOKIE_NAME = "admin_session";

test("signs in to and out of the private admin dashboard", async ({ context, page }) => {
  const response = await page.goto("/admin");

  expect(response?.headers()["cache-control"]).toBe("private, no-store");
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(response?.headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
  expect(response?.headers()["x-frame-options"]).toBe("DENY");
  await expect(page.getByRole("heading", { level: 1, name: "Admin portal" })).toBeVisible();
  await expect(page).toHaveTitle("Admin portal | Caroline & Ryan");
  await expect(page.getByText("Database not connected")).not.toBeVisible();

  const loginAccessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(loginAccessibilityScan.violations).toEqual([]);

  await page.getByLabel("Admin passphrase").fill("incorrect-passphrase");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/admin?error=invalid");
  await expect(page.locator("#admin-password-error")).toHaveText(
    "Unable to sign in with those credentials.",
  );
  await expect(page.getByLabel("Admin passphrase")).toBeFocused();

  await page.getByLabel("Admin passphrase").fill(ADMIN_TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(page.getByText("Database not connected")).toBeVisible();
  await expect(page.getByText("No responses to show")).toBeVisible();
  await expect(page.getByText("—")).toHaveCount(4);

  const adminCookie = (await context.cookies()).find((cookie) => cookie.name === ADMIN_COOKIE_NAME);
  expect(adminCookie).toMatchObject({
    httpOnly: true,
    path: "/admin",
    sameSite: "Strict",
    secure: false,
  });

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();

  const dashboardAccessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(dashboardAccessibilityScan.violations).toEqual([]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/admin");
  await expect(page.getByLabel("Admin passphrase")).toBeVisible();
  await expect(page.getByText("Database not connected")).not.toBeVisible();
});

test("rejects tampered and expired admin sessions", async ({ context, page }) => {
  const expiredToken = createSignedSession({
    durationSeconds: 60,
    now: Date.now() - 120_000,
    purpose: "admin-access",
    secret: ADMIN_TEST_SESSION_SECRET,
  });

  await context.addCookies([
    {
      domain: "127.0.0.1",
      httpOnly: true,
      name: ADMIN_COOKIE_NAME,
      path: "/admin",
      sameSite: "Strict",
      secure: false,
      value: expiredToken,
    },
  ]);
  await page.goto("/admin");
  await expect(page).toHaveTitle("Admin portal | Caroline & Ryan");
  await expect(page.getByRole("heading", { level: 1, name: "Admin portal" })).toBeVisible();

  await context.addCookies([
    {
      domain: "127.0.0.1",
      httpOnly: true,
      name: ADMIN_COOKIE_NAME,
      path: "/admin",
      sameSite: "Strict",
      secure: false,
      value: `${expiredToken}tampered`,
    },
  ]);
  await page.reload();
  await expect(page.getByLabel("Admin passphrase")).toBeVisible();
  await expect(page.getByText("Database not connected")).not.toBeVisible();
});

test("supports accessible display modes and narrow layouts", async ({ browserName, page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/admin");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);

  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const loginSkipLink = page.getByRole("link", { name: "Skip to admin sign in" });
  await expect(loginSkipLink).toBeFocused();
  await expect(loginSkipLink).toBeVisible();

  await page.getByLabel("Admin passphrase").fill(ADMIN_TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page).toHaveTitle("Admin portal | Caroline & Ryan");

  const enlargedText = await page.addStyleTag({
    content: "html { font-size: 200% !important; }",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await enlargedText.evaluate((style) => style.parentNode?.removeChild(style));

  const dashboardAccessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(dashboardAccessibilityScan.violations).toEqual([]);
});
