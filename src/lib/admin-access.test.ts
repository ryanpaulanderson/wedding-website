import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getCookie: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

import { getAdminDashboardSnapshot } from "@/features/admin/dashboard-data";
import { createPasswordHash, createSignedSession } from "@/lib/credential-security";
import {
  ADMIN_ACCESS_COOKIE_NAME,
  createAdminSession,
  getAdminAccessConfiguration,
  getAdminAccessCookieOptions,
  requireAdminSession,
  verifyAdminSession,
} from "./admin-access";

const SESSION_SECRET = "an-admin-session-secret-that-is-at-least-thirty-two-characters";
const NOW = Date.UTC(2026, 7, 5);
let passwordHash: string;

beforeEach(async () => {
  vi.unstubAllEnvs();
  mocks.getCookie.mockReset();
  mocks.cookies.mockReset();
  mocks.cookies.mockResolvedValue({ get: mocks.getCookie });
  passwordHash = await createPasswordHash("a-private-passphrase", Buffer.alloc(16, 8));
});

describe("admin access configuration", () => {
  it("accepts independently configured admin credentials", () => {
    expect(
      getAdminAccessConfiguration({
        ADMIN_PASSWORD_HASH: passwordHash,
        ADMIN_SESSION_SECRET: SESSION_SECRET,
      }),
    ).toEqual({ passwordHash, sessionSecret: SESSION_SECRET });
  });

  it.each([
    {},
    { ADMIN_PASSWORD_HASH: "malformed", ADMIN_SESSION_SECRET: SESSION_SECRET },
    { ADMIN_PASSWORD_HASH: "", ADMIN_SESSION_SECRET: SESSION_SECRET },
    { ADMIN_PASSWORD_HASH: "valid-looking", ADMIN_SESSION_SECRET: "too-short" },
  ])("fails closed for incomplete or malformed configuration", (environment) => {
    expect(getAdminAccessConfiguration(environment)).toBeNull();
  });
});

describe("admin sessions", () => {
  it("uses a purpose-bound eight-hour session", () => {
    const token = createAdminSession(SESSION_SECRET, NOW);

    expect(verifyAdminSession(token, SESSION_SECRET, NOW + 1_000)).toBe(true);
    expect(verifyAdminSession(token, SESSION_SECRET, NOW + 8 * 60 * 60 * 1_000)).toBe(false);
  });

  it("does not accept a valid session created for another purpose", () => {
    const token = createSignedSession({
      durationSeconds: 60,
      now: NOW,
      purpose: "site-access",
      secret: SESSION_SECRET,
    });

    expect(verifyAdminSession(token, SESSION_SECRET, NOW)).toBe(false);
  });

  it("scopes strict cookies to admin and enables secure cookies only on Vercel", () => {
    expect(getAdminAccessCookieOptions({ VERCEL: "1" })).toEqual({
      httpOnly: true,
      maxAge: 28_800,
      path: "/admin",
      sameSite: "strict",
      secure: true,
    });
    expect(getAdminAccessCookieOptions({ VERCEL: undefined }).secure).toBe(false);
  });
});

describe("admin data authorization", () => {
  function configureEnvironment() {
    vi.stubEnv("ADMIN_PASSWORD_HASH", passwordHash);
    vi.stubEnv("ADMIN_SESSION_SECRET", SESSION_SECRET);
  }

  it("rejects access without an authenticated session", async () => {
    configureEnvironment();
    mocks.getCookie.mockReturnValue(undefined);

    await expect(requireAdminSession()).rejects.toThrow("Admin access required.");
    await expect(getAdminDashboardSnapshot()).rejects.toThrow("Admin access required.");
  });

  it("returns a safe unavailable snapshot after authorizing again without database config", async () => {
    configureEnvironment();
    vi.stubEnv("DATABASE_URL", "");
    mocks.getCookie.mockImplementation((name: string) =>
      name === ADMIN_ACCESS_COOKIE_NAME
        ? { value: createAdminSession(SESSION_SECRET, Date.now()) }
        : undefined,
    );

    await expect(getAdminDashboardSnapshot()).resolves.toEqual({ status: "unavailable" });
    expect(mocks.cookies).toHaveBeenCalled();
  });
});
