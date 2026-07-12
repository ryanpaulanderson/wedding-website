import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("presents the three design directions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Choose a direction." })).toBeVisible();
  await expect(page.getByRole("link", { name: /The New Classic/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Field Notes/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /After Dark/ })).toBeVisible();

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
