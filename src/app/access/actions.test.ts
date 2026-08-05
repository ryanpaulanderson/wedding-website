import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createSiteAccessSession: vi.fn(() => "signed-session"),
  getSiteAccessConfiguration: vi.fn(),
  getSiteAccessCookieOptions: vi.fn(() => ({
    httpOnly: true,
    maxAge: 2_592_000,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  })),
  headers: vi.fn(),
  isSitePasswordGateEnabled: vi.fn(() => true),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  sanitizeReturnTo: vi.fn(() => "/"),
  setCookie: vi.fn(),
  verifySitePassword: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/site-access", () => ({
  createSiteAccessSession: mocks.createSiteAccessSession,
  getSiteAccessConfiguration: mocks.getSiteAccessConfiguration,
  getSiteAccessCookieOptions: mocks.getSiteAccessCookieOptions,
  isSitePasswordGateEnabled: mocks.isSitePasswordGateEnabled,
  sanitizeReturnTo: mocks.sanitizeReturnTo,
  SITE_ACCESS_COOKIE_NAME: "site_access",
  verifySitePassword: mocks.verifySitePassword,
}));

import { unlockSite } from "./actions";

const SESSION_SECRET = "a-site-session-secret-that-is-at-least-thirty-two-characters";

function createPasswordForm(password = "incorrect-password"): FormData {
  const formData = new FormData();
  formData.set("password", password);

  return formData;
}

describe("site unlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL", "1");
    mocks.cookies.mockResolvedValue({ set: mocks.setCookie });
    mocks.getSiteAccessConfiguration.mockReturnValue({
      passwordHash: "valid-password-hash",
      sessionSecret: SESSION_SECRET,
    });
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.20" }));
    mocks.verifySitePassword.mockResolvedValue(false);
  });

  it("stops password verification after ten attempts from one client window", async () => {
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await expect(unlockSite(createPasswordForm())).rejects.toThrow(
        "redirect:/access?error=invalid",
      );
    }

    expect(mocks.verifySitePassword).toHaveBeenCalledTimes(10);
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("preserves successful unlock and the site cookie contract", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.21" }));
    mocks.verifySitePassword.mockResolvedValue(true);

    await expect(unlockSite(createPasswordForm("correct-password"))).rejects.toThrow("redirect:/");

    expect(mocks.setCookie).toHaveBeenCalledWith(
      "site_access",
      "signed-session",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 2_592_000,
        path: "/",
        sameSite: "lax",
        secure: true,
      }),
    );
  });
});
