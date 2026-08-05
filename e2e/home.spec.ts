import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the landing page renders the real accessible wedding site", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Caroline & Ryan" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "The tree that became our mark." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "We can’t wait to celebrate with you.",
    }),
  ).toBeVisible();
  await expect(page.getByText("RSVP opens with the invitation")).toBeVisible();

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
  const treeMarks = page.locator('img[src*="wedding-tree-logo"]');
  const branchDividers = page.locator('main > [aria-hidden="true"]');
  const inSectionTreeCrops = page.locator(
    '#story img[src*="wedding-tree-logo"], #details img[src*="wedding-tree-logo"]',
  );

  await expect(heroImage).not.toHaveAttribute("loading", "lazy");
  await expect(heroImage).toHaveAttribute("width", "1200");
  await expect(heroImage).toHaveAttribute("height", "1600");
  await expect(proposalImage).toHaveAttribute("loading", "lazy");
  await expect(treeMarks).toHaveCount(6);
  await expect(branchDividers).toHaveCount(2);
  await expect(branchDividers.locator('img[src*="wedding-tree-logo"]')).toHaveCount(4);
  await expect(inSectionTreeCrops).toHaveCount(0);
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1);

  const displayHeadingLineHeights = await page.locator("h1, h2, h3").evaluateAll((headings) =>
    headings
      .map((heading) => {
        const styles = getComputedStyle(heading);
        const fontSize = Number.parseFloat(styles.fontSize);
        const lineHeight = Number.parseFloat(styles.lineHeight);

        return fontSize >= 32 ? lineHeight / fontSize : null;
      })
      .filter((ratio): ratio is number => ratio !== null),
  );
  expect(displayHeadingLineHeights.every((ratio) => ratio >= 0.94)).toBe(true);

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
