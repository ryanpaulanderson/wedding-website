import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTestDatabasePool } from "./fixtures/database";

async function clearNotices() {
  const db = createTestDatabasePool();
  try {
    await db.query("DELETE FROM early_declines");
    await db.query("DELETE FROM early_decline_rate_limits");
  } finally {
    await db.end();
  }
}
test.beforeEach(async () => {
  await clearNotices();
});
test.afterEach(async () => {
  await clearNotices();
});

test("submits an early notice once, confirms it, and tracks review in admin", async ({
  page,
  browserName,
}) => {
  test.skip(
    process.env.VERCEL === "1",
    "Uses local admin bypass; hosted authorization is covered separately.",
  );
  await page.goto("/");
  await page.getByRole("link", { name: "Already know you can’t make it? Let us know." }).click();
  await expect(page).toHaveTitle("Unable to attend | Caroline & Ryan");
  await expect(page.getByText("No RSVP is needed yet", { exact: false })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("link", { name: /Back to our wedding/ })).toBeFocused();
  await page.getByLabel("Name(s) unable to attend (required)").fill("Alex & Jo Browser Test");
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByLabel("Email address (required)")).toBeFocused();
  await page.keyboard.type("ALEX@EXAMPLE.COM");
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("button", { name: "Let us know" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Thank you for letting us know." })).toBeVisible();
  await expect(page.getByRole("status")).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/unable-to-attend");
  await page
    .getByLabel("Name(s) unable to attend (required)")
    .fill("Changed names must not overwrite");
  await page.getByLabel("Email address (required)").fill("alex@example.com");
  await page.getByRole("button", { name: "Let us know" }).click();
  await expect(page.getByRole("heading", { name: "Thank you for letting us know." })).toBeVisible();
  const db = createTestDatabasePool();
  try {
    expect((await db.query("SELECT names, email FROM early_declines")).rows).toEqual([
      { names: "Alex & Jo Browser Test", email: "alex@example.com" },
    ]);
    expect(
      (await db.query("SELECT count(*)::int AS count FROM early_decline_emails")).rows[0].count,
    ).toBe(2);
  } finally {
    await db.end();
  }
  await page.goto("/admin");
  await page.getByRole("link", { name: "Early notices: unable to attend" }).click();
  await expect(page.getByRole("heading", { name: "Alex & Jo Browser Test" })).toBeVisible();
  await expect(page.getByText("Paused outside production", { exact: false })).toHaveCount(2);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Mark reviewed", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Review status updated.");
  await expect(page.getByRole("button", { name: "Mark unreviewed", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark unreviewed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark reviewed", exact: true })).toBeVisible();
});

test("keeps the form usable at 320px, enlarged text and forced colors", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.goto("/unable-to-attend");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByLabel("Name(s) unable to attend (required)")
    .fill("A long household name ".repeat(40));
  await page.getByLabel("Email address (required)").fill("long.household@example.com");
  await expect(page.getByRole("button", { name: "Let us know" })).toBeEnabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.goto("/admin/early-declines");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
});
