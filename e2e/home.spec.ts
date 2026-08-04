import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("presents the four design directions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Choose a direction." })).toBeVisible();
  await expect(page.getByRole("link", { name: /The New Classic/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Field Notes/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /After Dark/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Riverlight/ })).toBeVisible();

  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScan.violations).toEqual([]);
});

const concepts = [
  {
    path: "/concepts/new-classic",
    heading: "Maya & Julian",
    storyHeading: "A rainy afternoon, one perfect record.",
  },
  {
    path: "/concepts/field-notes",
    heading: "Meet us in the garden.",
    storyHeading: "It started with a storm.",
  },
  {
    path: "/concepts/after-dark",
    heading: "Maya Julian",
    storyHeading: "Somewhere between the first song and the last train.",
  },
] as const;

for (const concept of concepts) {
  test(`${concept.path} renders a complete accessible homepage`, async ({ page }) => {
    await page.goto(concept.path);

    await expect(page.getByRole("heading", { level: 1, name: concept.heading })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: concept.storyHeading })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /join us|save us a dance|are you in/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /send your reply|count me in|enter rsvp/i }),
    ).toBeVisible();

    const accessibilityScan = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScan.violations).toEqual([]);
  });
}

test("/concepts/riverlight renders the real accessible homepage", async ({ page }) => {
  await page.goto("/concepts/riverlight");

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

test("/concepts/riverlight supports accessible display and loading modes", async ({
  browserName,
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/concepts/riverlight");

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
