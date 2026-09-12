import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { config as loadEnvironment } from "dotenv";
import { encryptNotification } from "../src/features/rsvp/notification-encryption";
import {
  getNotificationEmailConfiguration,
  sendEncryptedRsvpNotification,
} from "../src/features/rsvp/notification-email";
import { notificationRecipient } from "../src/features/rsvp/notification-recipient";

loadEnvironment({ path: [".env.local", ".env"], quiet: true });

async function deliveryStatus(id: string, apiKey: string): Promise<string> {
  const response = await fetch(`https://api.resend.com/emails/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Cannot read delivery status (HTTP ${response.status}).`);
  const result: unknown = await response.json();
  if (typeof result !== "object" || result === null || !("last_event" in result)) {
    throw new Error("Resend returned an unexpected delivery status.");
  }
  const knownStatuses = [
    "sent",
    "delivered",
    "delivery_delayed",
    "bounced",
    "complained",
    "opened",
    "clicked",
    "queued",
    "scheduled",
    "failed",
    "canceled",
    "suppressed",
  ];
  const status =
    typeof result.last_event === "string" && knownStatuses.includes(result.last_event)
      ? result.last_event
      : "unknown";
  console.log(JSON.stringify({ emailId: id, status }));
  return status;
}

async function main() {
  const mode = process.argv[2];
  if (!["--check", "--send-test", "--status"].includes(mode)) {
    throw new Error("Use --check, --send-test, or --status EMAIL_ID.");
  }

  const configuration = getNotificationEmailConfiguration();
  if (!configuration) {
    throw new Error("Configure RESEND_API_KEY and RESEND_EMAIL_DOMAIN for this environment.");
  }

  if (mode === "--status") {
    const id = process.argv[3];
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Provide a valid email ID.");
    await deliveryStatus(id, configuration.apiKey);
    return;
  }

  const testMessage = [
    "Encrypted wedding RSVP email test",
    "",
    "If you can read this message, your public PGP key encrypted it successfully and your mail client decrypted it.",
    "This is a delivery test. No guest RSVP was created or changed.",
    "",
    `Test time: ${new Date().toISOString()}`,
  ].join("\n");

  await encryptNotification(testMessage);
  console.log(
    JSON.stringify({
      configuration: "ready",
      sender: configuration.from,
      recipient: notificationRecipient.email,
      fingerprint: notificationRecipient.fingerprint,
      encryption: "verified",
    }),
  );
  if (mode === "--check") return;

  const result = await sendEncryptedRsvpNotification(randomUUID(), testMessage, {
    allowNonProduction: true,
  });
  console.log(JSON.stringify(result));
  if (result.status !== "accepted") {
    process.exitCode = 1;
    return;
  }

  // Acceptance is distinct from delivery; check briefly without sending another message.
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await delay(2_000);
      const status = await deliveryStatus(result.emailId, configuration.apiKey);
      if (!["sent", "queued"].includes(status)) break;
    }
  } catch {
    console.log(
      JSON.stringify({ emailId: result.emailId, status: "unavailable; check Resend dashboard" }),
    );
  }
}

main().catch((error: unknown) => {
  // Only check-mode configuration errors are user-facing; raw provider/key errors stay private.
  if (
    error instanceof Error &&
    /^(Use |Configure |Provide |Cannot read |Resend returned)/.test(error.message)
  ) {
    console.error(error.message);
  } else {
    console.error("The encrypted email check failed. Verify the key and connection settings.");
  }
  process.exitCode = 1;
});
