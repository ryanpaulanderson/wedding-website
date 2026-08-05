import "server-only";

import { createLoginRateLimitKey, createLoginRateLimiter } from "@/lib/login-rate-limit";

export const ADMIN_LOGIN_ATTEMPT_LIMIT = 10;
export const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;

const MAX_TRACKED_CLIENTS = 1_024;

type AdminLoginRateLimitEnvironment = Readonly<Record<string, string | undefined>>;

type RequestHeaders = {
  get(name: string): string | null;
};

type CreateAdminLoginRateLimiterOptions = {
  attemptLimit?: number;
  maxTrackedClients?: number;
  windowMs?: number;
};

export function createAdminLoginRateLimiter({
  attemptLimit = ADMIN_LOGIN_ATTEMPT_LIMIT,
  maxTrackedClients = MAX_TRACKED_CLIENTS,
  windowMs = ADMIN_LOGIN_WINDOW_MS,
}: CreateAdminLoginRateLimiterOptions = {}) {
  return createLoginRateLimiter({ attemptLimit, maxTrackedClients, windowMs });
}

export function createAdminLoginRateLimitKey(
  requestHeaders: RequestHeaders,
  sessionSecret: string,
  environment: AdminLoginRateLimitEnvironment = process.env,
): string {
  return createLoginRateLimitKey({
    environment,
    namespace: "admin-login",
    requestHeaders,
    secret: sessionSecret,
  });
}

export const adminLoginRateLimiter = createAdminLoginRateLimiter();
