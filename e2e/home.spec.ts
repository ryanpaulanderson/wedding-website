import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("renders an accessible project foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Project foundation" })).toBeVisible();

  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScan.violations).toEqual([]);
});
