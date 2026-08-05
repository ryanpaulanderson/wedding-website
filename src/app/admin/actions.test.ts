import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createAdminSession: vi.fn(() => "signed-session"),
  getAdminAccessConfiguration: vi.fn(),
  getAdminAccessCookieOptions: vi.fn(() => ({
    httpOnly: true,
    maxAge: 28_800,
    path: "/admin",
    sameSite: "strict" as const,
    secure: true,
  })),
  headers: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
  requireAdminSession: vi.fn(),
  setCookie: vi.fn(),
  verifyAdminPassword: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies, headers: mocks.headers }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/admin-access", () => ({
  ADMIN_ACCESS_COOKIE_NAME: "admin_session",
  createAdminSession: mocks.createAdminSession,
  getAdminAccessConfiguration: mocks.getAdminAccessConfiguration,
  getAdminAccessCookieOptions: mocks.getAdminAccessCookieOptions,
  requireAdminSession: mocks.requireAdminSession,
  verifyAdminPassword: mocks.verifyAdminPassword,
}));

import { signInToAdmin, signOutOfAdmin } from "./actions";

const SESSION_SECRET = "an-admin-session-secret-that-is-at-least-thirty-two-characters";

function createPasswordForm(): FormData {
  const formData = new FormData();
  formData.set("password", "incorrect-passphrase");

  return formData;
}

describe("admin sign-in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL", "1");
    mocks.cookies.mockResolvedValue({ set: mocks.setCookie });
    mocks.getAdminAccessConfiguration.mockReturnValue({
      passwordHash: "valid-password-hash",
      sessionSecret: SESSION_SECRET,
    });
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.10" }));
    mocks.verifyAdminPassword.mockResolvedValue(false);
  });

  it("stops password verification after ten attempts from one client window", async () => {
    for (let attempt = 0; attempt < 11; attempt += 1) {
      await expect(signInToAdmin(createPasswordForm())).rejects.toThrow(
        "redirect:/admin?error=invalid",
      );
    }

    expect(mocks.verifyAdminPassword).toHaveBeenCalledTimes(10);
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("preserves successful sign-in and the admin cookie contract", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.11" }));
    mocks.verifyAdminPassword.mockResolvedValue(true);

    await expect(signInToAdmin(createPasswordForm())).rejects.toThrow("redirect:/admin");

    expect(mocks.setCookie).toHaveBeenCalledWith(
      "admin_session",
      "signed-session",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 28_800,
        path: "/admin",
        sameSite: "strict",
        secure: true,
      }),
    );
  });

  it("clears a stale admin cookie even when the session is no longer valid", async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error("Admin access required."));

    await expect(signOutOfAdmin()).rejects.toThrow("redirect:/admin");

    expect(mocks.requireAdminSession).not.toHaveBeenCalled();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "admin_session",
      "",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 0,
        path: "/admin",
        sameSite: "strict",
        secure: true,
      }),
    );
  });
});
