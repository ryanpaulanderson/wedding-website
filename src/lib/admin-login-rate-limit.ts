import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const ADMIN_LOGIN_ATTEMPT_LIMIT = 10;
export const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;

const MAX_TRACKED_CLIENTS = 1_024;

type AdminLoginRateLimitEnvironment = Readonly<Record<string, string | undefined>>;

type RequestHeaders = {
  get(name: string): string | null;
};

type AttemptWindow = {
  attempts: number;
  resetsAt: number;
};

type CreateAdminLoginRateLimiterOptions = {
  attemptLimit?: number;
  maxTrackedClients?: number;
  windowMs?: number;
};

function consumeWindow(
  window: AttemptWindow | undefined,
  attemptLimit: number,
  windowMs: number,
  now: number,
): { allowed: boolean; window: AttemptWindow } {
  const activeWindow =
    window && window.resetsAt > now ? window : { attempts: 0, resetsAt: now + windowMs };

  if (activeWindow.attempts >= attemptLimit) {
    return { allowed: false, window: activeWindow };
  }

  activeWindow.attempts += 1;

  return { allowed: true, window: activeWindow };
}

export function createAdminLoginRateLimiter({
  attemptLimit = ADMIN_LOGIN_ATTEMPT_LIMIT,
  maxTrackedClients = MAX_TRACKED_CLIENTS,
  windowMs = ADMIN_LOGIN_WINDOW_MS,
}: CreateAdminLoginRateLimiterOptions = {}) {
  const clientWindows = new Map<string, AttemptWindow>();
  let overflowWindow: AttemptWindow | undefined;

  return {
    consume(clientKey: string, now = Date.now()): boolean {
      const existingWindow = clientWindows.get(clientKey);

      if (existingWindow) {
        const result = consumeWindow(existingWindow, attemptLimit, windowMs, now);
        clientWindows.set(clientKey, result.window);

        return result.allowed;
      }

      if (clientWindows.size >= maxTrackedClients) {
        for (const [key, window] of clientWindows) {
          if (window.resetsAt <= now) {
            clientWindows.delete(key);
          }
        }
      }

      if (clientWindows.size >= maxTrackedClients) {
        const result = consumeWindow(overflowWindow, attemptLimit, windowMs, now);
        overflowWindow = result.window;

        return result.allowed;
      }

      const result = consumeWindow(undefined, attemptLimit, windowMs, now);
      clientWindows.set(clientKey, result.window);

      return result.allowed;
    },

    reset(clientKey: string): void {
      if (!clientWindows.delete(clientKey)) {
        overflowWindow = undefined;
      }
    },
  };
}

export function createAdminLoginRateLimitKey(
  requestHeaders: RequestHeaders,
  sessionSecret: string,
  environment: AdminLoginRateLimitEnvironment = process.env,
): string {
  const forwardedAddress = requestHeaders.get("x-forwarded-for")?.trim();
  const clientIdentity =
    environment.VERCEL === "1" && forwardedAddress && isIP(forwardedAddress)
      ? forwardedAddress
      : environment.VERCEL === "1"
        ? "unknown-vercel-client"
        : "local-development";

  return createHmac("sha256", sessionSecret)
    .update(`admin-login:${clientIdentity}`)
    .digest("base64url");
}

export const adminLoginRateLimiter = createAdminLoginRateLimiter();
