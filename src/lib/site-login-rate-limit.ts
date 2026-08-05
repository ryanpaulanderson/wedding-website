import "server-only";

import { createLoginRateLimitKey, createLoginRateLimiter } from "@/lib/login-rate-limit";

export const SITE_LOGIN_ATTEMPT_LIMIT = 10;
export const SITE_LOGIN_WINDOW_MS = 10 * 60 * 1000;

const MAX_TRACKED_CLIENTS = 1_024;

type SiteLoginRateLimitEnvironment = Readonly<Record<string, string | undefined>>;

type RequestHeaders = {
  get(name: string): string | null;
};

type CreateSiteLoginRateLimiterOptions = {
  attemptLimit?: number;
  maxTrackedClients?: number;
  windowMs?: number;
};

export function createSiteLoginRateLimiter({
  attemptLimit = SITE_LOGIN_ATTEMPT_LIMIT,
  maxTrackedClients = MAX_TRACKED_CLIENTS,
  windowMs = SITE_LOGIN_WINDOW_MS,
}: CreateSiteLoginRateLimiterOptions = {}) {
  return createLoginRateLimiter({ attemptLimit, maxTrackedClients, windowMs });
}

export function createSiteLoginRateLimitKey(
  requestHeaders: RequestHeaders,
  sessionSecret: string,
  environment: SiteLoginRateLimitEnvironment = process.env,
): string {
  return createLoginRateLimitKey({
    environment,
    namespace: "site-login",
    requestHeaders,
    secret: sessionSecret,
  });
}

export const siteLoginRateLimiter = createSiteLoginRateLimiter();
