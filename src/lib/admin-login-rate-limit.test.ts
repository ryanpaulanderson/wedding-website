import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createAdminLoginRateLimiter,
  createAdminLoginRateLimitKey,
} from "./admin-login-rate-limit";

const SESSION_SECRET = "an-admin-session-secret-that-is-at-least-thirty-two-characters";

describe("admin login rate limiting", () => {
  it("allows ten attempts and blocks later attempts in the same client window", () => {
    const limiter = createAdminLoginRateLimiter();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(limiter.consume("client", 1_000)).toBe(true);
    }

    expect(limiter.consume("client", 1_000)).toBe(false);
    expect(limiter.consume("another-client", 1_000)).toBe(true);
  });

  it("opens a fresh window after ten minutes", () => {
    const limiter = createAdminLoginRateLimiter({ attemptLimit: 1, windowMs: 600_000 });

    expect(limiter.consume("client", 1_000)).toBe(true);
    expect(limiter.consume("client", 600_999)).toBe(false);
    expect(limiter.consume("client", 601_000)).toBe(true);
  });

  it("uses a bounded shared overflow window when client tracking is full", () => {
    const limiter = createAdminLoginRateLimiter({ attemptLimit: 1, maxTrackedClients: 1 });

    expect(limiter.consume("tracked-client", 1_000)).toBe(true);
    expect(limiter.consume("overflow-one", 1_000)).toBe(true);
    expect(limiter.consume("overflow-two", 1_000)).toBe(false);
  });

  it("derives private stable keys from Vercel client addresses", () => {
    const firstHeaders = new Headers({ "x-forwarded-for": "203.0.113.10" });
    const secondHeaders = new Headers({ "x-forwarded-for": "203.0.113.11" });
    const firstKey = createAdminLoginRateLimitKey(firstHeaders, SESSION_SECRET, { VERCEL: "1" });

    expect(createAdminLoginRateLimitKey(firstHeaders, SESSION_SECRET, { VERCEL: "1" })).toBe(
      firstKey,
    );
    expect(createAdminLoginRateLimitKey(secondHeaders, SESSION_SECRET, { VERCEL: "1" })).not.toBe(
      firstKey,
    );
    expect(firstKey).not.toContain("203.0.113.10");
  });

  it("does not trust caller-supplied forwarding headers outside Vercel", () => {
    const firstKey = createAdminLoginRateLimitKey(
      new Headers({ "x-forwarded-for": "203.0.113.10" }),
      SESSION_SECRET,
      {},
    );
    const secondKey = createAdminLoginRateLimitKey(
      new Headers({ "x-forwarded-for": "203.0.113.11" }),
      SESSION_SECRET,
      {},
    );

    expect(secondKey).toBe(firstKey);
  });
});
