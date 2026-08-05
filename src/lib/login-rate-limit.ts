import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const DEFAULT_MAX_TRACKED_CLIENTS = 1_024;

type LoginRateLimitEnvironment = Readonly<Record<string, string | undefined>>;

type RequestHeaders = {
  get(name: string): string | null;
};

type AttemptWindow = {
  attempts: number;
  resetsAt: number;
};

type CreateLoginRateLimiterOptions = {
  attemptLimit: number;
  maxTrackedClients?: number;
  windowMs: number;
};

type CreateLoginRateLimitKeyOptions = {
  environment?: LoginRateLimitEnvironment;
  namespace: string;
  requestHeaders: RequestHeaders;
  secret: string;
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

export function createLoginRateLimiter({
  attemptLimit,
  maxTrackedClients = DEFAULT_MAX_TRACKED_CLIENTS,
  windowMs,
}: CreateLoginRateLimiterOptions) {
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
      clientWindows.delete(clientKey);
    },
  };
}

export function createLoginRateLimitKey({
  environment = process.env,
  namespace,
  requestHeaders,
  secret,
}: CreateLoginRateLimitKeyOptions): string {
  const forwardedAddress = requestHeaders.get("x-forwarded-for")?.trim();
  const clientIdentity =
    environment.VERCEL === "1" && forwardedAddress && isIP(forwardedAddress)
      ? forwardedAddress
      : environment.VERCEL === "1"
        ? "unknown-vercel-client"
        : "local-development";

  return createHmac("sha256", secret).update(`${namespace}:${clientIdentity}`).digest("base64url");
}
