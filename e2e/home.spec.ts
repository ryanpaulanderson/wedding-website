import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the landing page renders the real accessible wedding site", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Caroline & Ryan" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "A garden, a question, a tree." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Save the date. We’ll meet you by the river.",
    }),
  ).toBeVisible();
  await expect(page.getByText("RSVP opens soon").last()).toBeVisible();

  const images = page.locator("img");
  for (let index = 0; index < (await images.count()); index += 1) {
    const image = images.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }

  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScan.violations).toEqual([]);
});

test("the former Riverlight URL redirects to the landing page", async ({ page }) => {
  await page.goto("/concepts/riverlight");

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "Caroline & Ryan" })).toBeVisible();
});

test("discarded concept routes are unavailable", async ({ request }) => {
  for (const path of ["/concepts/new-classic", "/concepts/field-notes", "/concepts/after-dark"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  }
});

test("the landing page supports accessible display and loading modes", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const heroImage = page.getByAltText(
    "Caroline and Ryan together on a Washington, DC rooftop at sunset",
  );
  const proposalImage = page.getByAltText(
    "Caroline and Ryan together in the Alhambra gardens in Granada",
  );

  await expect(heroImage).not.toHaveAttribute("loading", "lazy");
  await expect(heroImage).toHaveAttribute("width", "1200");
  await expect(heroImage).toHaveAttribute("height", "1600");
  await expect(proposalImage).toHaveAttribute("loading", "lazy");
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);

  const textResizeStyle = await page.addStyleTag({
    content: "html { font-size: 200% !important; }",
  });
  await expect(page.getByRole("heading", { level: 1, name: "Caroline & Ryan" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  await textResizeStyle.evaluate((style) => style.parentNode?.removeChild(style));

  await page.setViewportSize({ width: 320, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);

  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  expect(await skipLink.evaluate((link) => getComputedStyle(link).outlineStyle)).not.toBe("none");
});
