import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.skip(process.env.VERCEL !== "1", "The site password gate is disabled outside Vercel.");

test("keeps the gate usable on narrow screens with enlarged text", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/access");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });

  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByLabel("Password", { exact: true }).focus();
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(page.getByRole("button", { name: "View site" })).toBeFocused();
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const helpLink = page.getByRole("link", { name: "ryan@ryanpaulanderson.com" });
  await expect(helpLink).toBeFocused();
  await expect(helpLink).toBeInViewport();
});

test("unlocks and relocks the hosted wedding website", async ({ context, page, request }) => {
  const initialResponse = await page.goto("/");

  expect(initialResponse?.status()).toBe(200);
  expect(initialResponse?.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  await expect(page).toHaveURL(/\/access\?returnTo=%2F$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome to our wedding" }),
  ).toBeVisible();
  const tree = page.locator('img[src*="wedding-tree-logo"]');
  await expect(tree).toBeVisible();
  await expect
    .poll(() => tree.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  await page.goto("/access?error=configuration");
  await expect(page.getByLabel("Password")).toBeVisible();

  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScan.violations).toEqual([]);

  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "View site" }).click();

  await expect(page.locator("#password-error")).toHaveText(
    "That password did not work. Try again.",
  );
  await expect(page.getByLabel("Password")).toBeFocused();

  await page.getByLabel("Password").fill("dummy-password");
  await page.getByRole("button", { name: "View site" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "Caroline & Ryan" })).toBeVisible();

  const accessCookie = (await context.cookies()).find((cookie) => cookie.name === "site_access");
  expect(accessCookie).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  });

  const protectedFileResponse = await request.get("/private-photo.jpg", { maxRedirects: 0 });
  expect(protectedFileResponse.status()).toBe(307);
  expect(protectedFileResponse.headers().location).toContain("/access");

  await page.goto("/access");
  await expect(page.getByText("This browser has access for the next 30 days.")).toBeVisible();
  await page.getByRole("button", { name: "Lock this browser" }).click();

  await expect(page).toHaveURL("/access");
  await expect(page.getByLabel("Password")).toBeVisible();
});
