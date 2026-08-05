import { describe, expect, it } from "vitest";
import {
  createPasswordHash,
  createSignedSession,
  isValidPasswordHash,
  isValidSessionSecret,
  verifyPasswordHash,
  verifySignedSession,
} from "./credential-security";

const SESSION_SECRET = "a-session-secret-that-is-at-least-thirty-two-characters";

describe("credential password hashes", () => {
  it("creates and verifies the expected scrypt format", async () => {
    const passwordHash = await createPasswordHash("a-private-passphrase", Buffer.alloc(16, 4));

    expect(passwordHash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(isValidPasswordHash(passwordHash)).toBe(true);
    await expect(verifyPasswordHash("a-private-passphrase", passwordHash)).resolves.toBe(true);
    await expect(verifyPasswordHash("incorrect-passphrase", passwordHash)).resolves.toBe(false);
  });

  it.each(["", "malformed", "scrypt$16384$8$1$bad$bad"])(
    "rejects the malformed password hash %s",
    (passwordHash) => {
      expect(isValidPasswordHash(passwordHash)).toBe(false);
    },
  );

  it.each(["", "x".repeat(257), 42, null])(
    "rejects invalid password input %s",
    async (password) => {
      const passwordHash = await createPasswordHash("a-private-passphrase", Buffer.alloc(16, 5));

      await expect(verifyPasswordHash(password, passwordHash)).resolves.toBe(false);
    },
  );

  it("rejects invalid password and salt lengths when creating a hash", async () => {
    await expect(createPasswordHash("")).rejects.toThrow(RangeError);
    await expect(createPasswordHash("x".repeat(257))).rejects.toThrow(RangeError);
    await expect(createPasswordHash("valid-password", Buffer.alloc(15))).rejects.toThrow(
      RangeError,
    );
  });

  it("requires session secrets with at least 32 bytes", () => {
    expect(isValidSessionSecret("too-short")).toBe(false);
    expect(isValidSessionSecret("x".repeat(32))).toBe(true);
  });
});

describe("signed sessions", () => {
  const now = Date.UTC(2026, 7, 5);

  function createToken(purpose = "admin-access") {
    return createSignedSession({
      durationSeconds: 60,
      now,
      purpose,
      secret: SESSION_SECRET,
    });
  }

  it("accepts an unmodified, unexpired token for its intended purpose", () => {
    expect(
      verifySignedSession(createToken(), {
        now: now + 1_000,
        purpose: "admin-access",
        secret: SESSION_SECRET,
      }),
    ).toBe(true);
  });

  it("rejects expired, tampered, wrong-secret, and wrong-purpose tokens", () => {
    const token = createToken();
    const [payload, signature] = token.split(".");

    expect(
      verifySignedSession(token, {
        now: now + 60_000,
        purpose: "admin-access",
        secret: SESSION_SECRET,
      }),
    ).toBe(false);
    expect(
      verifySignedSession(`${payload}x.${signature}`, {
        now,
        purpose: "admin-access",
        secret: SESSION_SECRET,
      }),
    ).toBe(false);
    expect(
      verifySignedSession(token, {
        now,
        purpose: "admin-access",
        secret: "another-session-secret-that-is-long-enough",
      }),
    ).toBe(false);
    expect(
      verifySignedSession(token, {
        now,
        purpose: "site-access",
        secret: SESSION_SECRET,
      }),
    ).toBe(false);
  });

  it.each([undefined, "", "malformed", "one.two.three"])("rejects malformed token %s", (token) => {
    expect(
      verifySignedSession(token, {
        now,
        purpose: "admin-access",
        secret: SESSION_SECRET,
      }),
    ).toBe(false);
  });
});
