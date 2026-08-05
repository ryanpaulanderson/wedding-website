import "server-only";

import { cookies } from "next/headers";
import {
  createSignedSession,
  isValidPasswordHash,
  isValidSessionSecret,
  verifyPasswordHash,
  verifySignedSession,
} from "@/lib/credential-security";

export const ADMIN_ACCESS_COOKIE_NAME = "admin_session";

const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 8;
const ADMIN_SESSION_PURPOSE = "admin-access";

type AdminAccessEnvironment = Readonly<Record<string, string | undefined>>;

export type AdminAccessConfiguration = {
  passwordHash: string;
  sessionSecret: string;
};

export function getAdminAccessConfiguration(
  environment: AdminAccessEnvironment = process.env,
): AdminAccessConfiguration | null {
  const passwordHash = environment.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = environment.ADMIN_SESSION_SECRET?.trim();

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

export function createAdminSession(secret: string, now = Date.now()): string {
  return createSignedSession({
    durationSeconds: ADMIN_SESSION_DURATION_SECONDS,
    now,
    purpose: ADMIN_SESSION_PURPOSE,
    secret,
  });
}

export function verifyAdminSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  return verifySignedSession(token, {
    now,
    purpose: ADMIN_SESSION_PURPOSE,
    secret,
  });
}

export function getAdminAccessCookieOptions(environment: AdminAccessEnvironment = process.env) {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
    path: "/admin",
    sameSite: "strict" as const,
    secure: environment.VERCEL === "1",
  };
}

export async function hasAdminSession(configuration: AdminAccessConfiguration): Promise<boolean> {
  const cookieStore = await cookies();

  return verifyAdminSession(
    cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value,
    configuration.sessionSecret,
  );
}

export async function requireAdminSession(): Promise<void> {
  const configuration = getAdminAccessConfiguration();

  if (!configuration || !(await hasAdminSession(configuration))) {
    throw new Error("Admin access required.");
  }
}

export async function verifyAdminPassword(
  password: unknown,
  configuration: AdminAccessConfiguration,
): Promise<boolean> {
  return verifyPasswordHash(password, configuration.passwordHash);
}
