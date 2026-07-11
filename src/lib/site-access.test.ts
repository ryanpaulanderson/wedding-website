import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  createSiteAccessSession,
  getSiteAccessConfiguration,
  isSitePasswordGateEnabled,
  sanitizeReturnTo,
  verifySiteAccessSession,
  verifySitePassword,
} from "./site-access";

const SESSION_SECRET = "a-session-secret-that-is-at-least-thirty-two-characters";

function createPasswordHash(password: string): string {
  const salt = Buffer.alloc(16, 7);
  const hash = scryptSync(password, salt, 32, {
    N: 16384,
    p: 1,
    r: 8,
    maxmem: 64 * 1024 * 1024,
  });

  return `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

describe("isSitePasswordGateEnabled", () => {
  it("always bypasses the gate outside Vercel", () => {
    expect(
      isSitePasswordGateEnabled({
        SITE_PASSWORD_GATE: "enabled",
        VERCEL: undefined,
      }),
    ).toBe(false);
  });

  it("enables the gate on Vercel when explicitly enabled", () => {
    expect(isSitePasswordGateEnabled({ SITE_PASSWORD_GATE: "enabled", VERCEL: "1" })).toBe(true);
  });

  it("disables the gate on Vercel only when explicitly disabled", () => {
    expect(isSitePasswordGateEnabled({ SITE_PASSWORD_GATE: "disabled", VERCEL: "1" })).toBe(false);
  });

  it.each([undefined, "", "unexpected"])(
    "fails closed on Vercel for the gate value %s",
    (gateValue) => {
      expect(isSitePasswordGateEnabled({ SITE_PASSWORD_GATE: gateValue, VERCEL: "1" })).toBe(true);
    },
  );
});

describe("getSiteAccessConfiguration", () => {
  it("returns validated secrets", () => {
    const passwordHash = createPasswordHash("preview-password");

    expect(
      getSiteAccessConfiguration({
        SITE_PASSWORD_HASH: passwordHash,
        SITE_SESSION_SECRET: SESSION_SECRET,
      }),
    ).toEqual({ passwordHash, sessionSecret: SESSION_SECRET });
  });

  it.each([
    {},
    { SITE_PASSWORD_HASH: "malformed", SITE_SESSION_SECRET: SESSION_SECRET },
    {
      SITE_PASSWORD_HASH: createPasswordHash("preview-password"),
      SITE_SESSION_SECRET: "too-short",
    },
  ])("rejects incomplete or malformed configuration", (environment) => {
    expect(getSiteAccessConfiguration(environment)).toBeNull();
  });
});

describe("verifySitePassword", () => {
  const passwordHash = createPasswordHash("preview-password");

  it("accepts the matching password", async () => {
    await expect(verifySitePassword("preview-password", passwordHash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    await expect(verifySitePassword("incorrect", passwordHash)).resolves.toBe(false);
  });

  it.each(["", "x".repeat(257), 42, null])("rejects invalid password input", async (password) => {
    await expect(verifySitePassword(password, passwordHash)).resolves.toBe(false);
  });

  it("rejects a malformed hash", async () => {
    await expect(verifySitePassword("preview-password", "not-a-password-hash")).resolves.toBe(
      false,
    );
  });

  it("rejects a hash with extra fields", async () => {
    await expect(verifySitePassword("preview-password", `${passwordHash}$extra`)).resolves.toBe(
      false,
    );
  });
});

describe("site access sessions", () => {
  const now = Date.UTC(2026, 6, 11);

  it("accepts an unmodified session before it expires", () => {
    const token = createSiteAccessSession(SESSION_SECRET, now);

    expect(verifySiteAccessSession(token, SESSION_SECRET, now + 1_000)).toBe(true);
  });

  it("rejects expired sessions", () => {
    const token = createSiteAccessSession(SESSION_SECRET, now);
    const thirtyDaysLater = now + 30 * 24 * 60 * 60 * 1_000;

    expect(verifySiteAccessSession(token, SESSION_SECRET, thirtyDaysLater)).toBe(false);
  });

  it("rejects tampered sessions", () => {
    const token = createSiteAccessSession(SESSION_SECRET, now);
    const [payload, signature] = token.split(".");

    expect(verifySiteAccessSession(`${payload}x.${signature}`, SESSION_SECRET, now)).toBe(false);
  });

  it("rejects sessions signed with another secret", () => {
    const token = createSiteAccessSession(SESSION_SECRET, now);

    expect(verifySiteAccessSession(token, "another-session-secret-that-is-long-enough", now)).toBe(
      false,
    );
  });

  it.each([undefined, "", "malformed", "one.two.three"])(
    "rejects malformed session value %s",
    (token) => {
      expect(verifySiteAccessSession(token, SESSION_SECRET, now)).toBe(false);
    },
  );
});

describe("sanitizeReturnTo", () => {
  it.each(["/", "/details", "/details?tab=travel"])("keeps safe local path %s", (path) => {
    expect(sanitizeReturnTo(path)).toBe(path);
  });

  it.each([
    "https://example.com",
    "//example.com",
    "\\example.com",
    "/access",
    "/access/logout",
    "relative-path",
    undefined,
  ])("replaces unsafe return path %s", (path) => {
    expect(sanitizeReturnTo(path)).toBe("/");
  });
});
