import "server-only";

import { sendResendEmail, type ResendEmailResult } from "@/lib/resend-email";
import { encryptNotification } from "./notification-encryption";
import { notificationRecipient } from "./notification-recipient";

type EmailEnvironment = Readonly<Record<string, string | undefined>>;

export type NotificationEmailResult =
  | ResendEmailResult
  | {
      status: "failed";
      reason: "configuration" | "encryption" | "invalid-input";
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

  return sendResendEmail(configuration.apiKey, body, idempotencyKey);
}
