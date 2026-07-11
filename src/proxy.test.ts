import { scryptSync } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSiteAccessSession, SITE_ACCESS_COOKIE_NAME } from "@/lib/site-access";
import { proxy } from "./proxy";

const SESSION_SECRET = "a-session-secret-that-is-at-least-thirty-two-characters";
const PASSWORD_HASH = (() => {
  const salt = Buffer.alloc(16, 3);
  const hash = scryptSync("preview-password", salt, 32, {
    N: 16384,
    p: 1,
    r: 8,
    maxmem: 64 * 1024 * 1024,
  });

  return `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
})();

function enableConfiguredGate() {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("SITE_PASSWORD_GATE", "enabled");
  vi.stubEnv("SITE_PASSWORD_HASH", PASSWORD_HASH);
  vi.stubEnv("SITE_SESSION_SECRET", SESSION_SECRET);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy", () => {
  it("bypasses the gate locally", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("SITE_PASSWORD_GATE", "enabled");

    const response = proxy(new NextRequest("http://localhost:3000/private-photo.jpg"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("bypasses the gate when it is disabled on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SITE_PASSWORD_GATE", "disabled");

    const response = proxy(new NextRequest("https://www.carolineandryan.org/"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("redirects an unauthenticated hosted request and preserves its local path", () => {
    enableConfiguredGate();

    const response = proxy(new NextRequest("https://www.carolineandryan.org/details?tab=travel"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.carolineandryan.org/access?returnTo=%2Fdetails%3Ftab%3Dtravel",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("protects direct public-file requests", () => {
    enableConfiguredGate();

    const response = proxy(new NextRequest("https://www.carolineandryan.org/private-photo.jpg"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/access");
  });

  it("returns an unauthorized response instead of redirecting an unauthenticated mutation", async () => {
    enableConfiguredGate();

    const response = proxy(
      new NextRequest("https://www.carolineandryan.org/api/rsvp", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("allows the access route without a session", () => {
    enableConfiguredGate();

    const response = proxy(new NextRequest("https://www.carolineandryan.org/access"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("allows a request with a valid signed session", () => {
    enableConfiguredGate();
    const token = createSiteAccessSession(SESSION_SECRET);

    const response = proxy(
      new NextRequest("https://www.carolineandryan.org/", {
        headers: {
          cookie: `${SITE_ACCESS_COOKIE_NAME}=${token}`,
        },
      }),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("fails closed when hosted secrets are missing", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SITE_PASSWORD_GATE", "enabled");
    vi.stubEnv("SITE_PASSWORD_HASH", "");
    vi.stubEnv("SITE_SESSION_SECRET", "");

    const response = proxy(new NextRequest("https://www.carolineandryan.org/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://www.carolineandryan.org/access?error=configuration",
    );
  });
});
