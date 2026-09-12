import "server-only";

import { setTimeout as delay } from "node:timers/promises";
import { encryptNotification } from "./notification-encryption";
import { notificationRecipient } from "./notification-recipient";

type EmailEnvironment = Readonly<Record<string, string | undefined>>;

export type NotificationEmailResult =
  | { status: "accepted"; emailId: string }
  | {
      status: "failed";
      reason: "configuration" | "encryption" | "invalid-input" | "provider" | "network";
      retryable: boolean;
      httpStatus?: number;
    }
  | { status: "disabled" };

type SendNotificationOptions = {
  environment?: EmailEnvironment;
  // Only explicit maintainer-run delivery tests should enable this outside Production.
  allowNonProduction?: boolean;
};

type NotificationEmailConfiguration = {
  apiKey: string;
  from: string;
};

export function getNotificationEmailConfiguration(
  environment: EmailEnvironment = process.env,
): NotificationEmailConfiguration | null {
  const apiKey = environment.RESEND_API_KEY?.trim();
  const domain = environment.RESEND_EMAIL_DOMAIN?.trim().toLowerCase();
  const domainLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

  if (
    !apiKey ||
    !/^re_[A-Za-z0-9_-]+$/.test(apiKey) ||
    !domain ||
    domain.length > 253 ||
    !domain.includes(".") ||
    !domain.split(".").every((label) => domainLabel.test(label))
  ) {
    return null;
  }

  return { apiKey, from: `Caroline & Ryan <rsvp@${domain}>` };
}

export async function sendEncryptedRsvpNotification(
  notificationId: string,
  message: string,
  options: SendNotificationOptions = {},
): Promise<NotificationEmailResult> {
  const environment = options.environment ?? process.env;
  if (environment.VERCEL_ENV !== "production" && !options.allowNonProduction) {
    return { status: "disabled" };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId)) {
    return { status: "failed", reason: "invalid-input", retryable: false };
  }

  const configuration = getNotificationEmailConfiguration(environment);
  if (!configuration) return { status: "failed", reason: "configuration", retryable: false };

  let encryptedBody: string;
  try {
    encryptedBody = await encryptNotification(message);
  } catch {
    return { status: "failed", reason: "encryption", retryable: false };
  }

  // Encrypt once and reuse identical bytes and key for every retry in this delivery attempt.
  // Future cross-request retries need a durable encrypted outbox, not fresh encryption.
  const body = JSON.stringify({
    from: configuration.from,
    to: [notificationRecipient.email],
    subject: "Wedding RSVP notification",
    text: encryptedBody,
  });
  const idempotencyKey = `rsvp-notification/${notificationId}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await delay(500 * 2 ** (attempt - 1));

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${configuration.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        // Provider error text can contain request details; never expose or log it.
        await response.body?.cancel();
        if (retryable && attempt < 2) continue;
        return { status: "failed", reason: "provider", httpStatus: response.status, retryable };
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("id" in result) ||
        typeof result.id !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(result.id)
      ) {
        return { status: "failed", reason: "provider", retryable: false };
      }

      return { status: "accepted", emailId: result.id };
    } catch {
      if (attempt === 2) return { status: "failed", reason: "network", retryable: true };
    }
  }

  return { status: "failed", reason: "network", retryable: true };
}
