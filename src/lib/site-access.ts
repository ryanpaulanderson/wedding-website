import {
  createSignedSession,
  isValidPasswordHash,
  isValidSessionSecret,
  verifyPasswordHash,
  verifySignedSession,
} from "@/lib/credential-security";

export const SITE_ACCESS_COOKIE_NAME = "site_access";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const SAFE_RETURN_ORIGIN = "https://site.invalid";

type SiteAccessEnvironment = Readonly<Record<string, string | undefined>>;

type SiteAccessConfiguration = {
  passwordHash: string;
  sessionSecret: string;
};

export function isSitePasswordGateEnabled(
  environment: SiteAccessEnvironment = process.env,
): boolean {
  if (environment.VERCEL !== "1") {
    return false;
  }

  return environment.SITE_PASSWORD_GATE !== "disabled";
}

export function getSiteAccessConfiguration(
  environment: SiteAccessEnvironment = process.env,
): SiteAccessConfiguration | null {
  const passwordHash = environment.SITE_PASSWORD_HASH?.trim();
  const sessionSecret = environment.SITE_SESSION_SECRET?.trim();

  if (
    !passwordHash ||
    !isValidPasswordHash(passwordHash) ||
    !sessionSecret ||
    !isValidSessionSecret(sessionSecret)
  ) {
    return null;
  }

  return { passwordHash, sessionSecret };
}

export async function verifySitePassword(password: unknown, encodedHash: string): Promise<boolean> {
  return verifyPasswordHash(password, encodedHash);
}

export function createSiteAccessSession(secret: string, now = Date.now()): string {
  return createSignedSession({
    durationSeconds: SESSION_DURATION_SECONDS,
    now,
    secret,
  });
}

export function verifySiteAccessSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  return verifySignedSession(token, { now, secret });
}

export function getSiteAccessCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}

export function sanitizeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?:2f|5c)/i.test(value) ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return "/";
  }

  try {
    const url = new URL(value, SAFE_RETURN_ORIGIN);

    if (
      url.origin !== SAFE_RETURN_ORIGIN ||
      !url.pathname.startsWith("/") ||
      url.pathname.startsWith("//") ||
      url.pathname === "/access" ||
      url.pathname.startsWith("/access/")
    ) {
      return "/";
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
