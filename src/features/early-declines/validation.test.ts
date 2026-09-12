import { describe, expect, it } from "vitest";
import { validateDecline } from "./validation";
describe("early notice validation", () => {
  it("preserves freeform household names and normalizes the email", () => {
    expect(
      validateDecline({
        names: "  Alex & Jo Rivera\nThe Lee family  ",
        email: " ALEX@Example.COM ",
      }),
    ).toMatchObject({
      status: "idle",
      values: { names: "Alex & Jo Rivera\nThe Lee family", email: "alex@example.com" },
    });
  });
  it.each(["", " ", "a".repeat(1001), "a\u0000b"])("rejects invalid names", (names) => {
    expect(validateDecline({ names, email: "guest@example.com" }).errors?.names).toBeTruthy();
  });
  it.each([
    "",
    "not-an-email",
    "a@b",
    "a@@example.com",
    "a@example..com",
    "a\n@example.com",
    ".a@example.com",
    "a..b@example.com",
    "a@-example.com",
    "a".repeat(65) + "@example.com",
  ])("rejects invalid email %s", (email) => {
    expect(validateDecline({ names: "Valid Name", email }).errors?.email).toBeTruthy();
  });
  it("accepts the full name limit and plus addressing", () => {
    expect(
      validateDecline({ names: "a".repeat(1000), email: "guest+family@example.com" }).status,
    ).toBe("idle");
  });
  it("rejects non-string input", () => {
    expect(validateDecline({ names: null, email: {} }).status).toBe("error");
  });
});
