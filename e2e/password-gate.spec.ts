import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.skip(process.env.VERCEL !== "1", "The site password gate is disabled outside Vercel.");

test("unlocks and relocks a hosted private preview", async ({ context, page, request }) => {
  const initialResponse = await page.goto("/");

  expect(initialResponse?.status()).toBe(200);
  expect(initialResponse?.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  await expect(page).toHaveURL(/\/access\?returnTo=%2F$/);
  await expect(page.getByRole("heading", { level: 1, name: "Wedding website" })).toBeVisible();

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
  await expect(page.getByRole("heading", { level: 1, name: "Project foundation" })).toBeVisible();

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
