import { describe, expect, it } from "vitest";
import { validateAdminPassphrase } from "./admin-credentials";

describe("validateAdminPassphrase", () => {
  it("accepts passphrases between 16 and 256 characters", () => {
    expect(validateAdminPassphrase("a-secure-password")).toBeNull();
    expect(validateAdminPassphrase("x".repeat(256))).toBeNull();
  });

  it("rejects passphrases outside the supported range", () => {
    expect(validateAdminPassphrase("too-short")).toContain("at least 16");
    expect(validateAdminPassphrase("x".repeat(257))).toContain("cannot exceed 256");
  });
});
