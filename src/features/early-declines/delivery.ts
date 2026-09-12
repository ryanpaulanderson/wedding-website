import "server-only";
import { randomUUID } from "node:crypto";
import { getDatabaseClient } from "@/lib/database";
import { sendResendEmail } from "@/lib/resend-email";
import { getNotificationEmailConfiguration } from "@/features/rsvp/notification-email";
import { encryptNotification } from "@/features/rsvp/notification-encryption";
import { notificationRecipient } from "@/features/rsvp/notification-recipient";

export const guestConfirmation =
  "We’re sorry you won’t be able to celebrate with us, and thank you for letting us know.\n\nIf your plans change, please email Ryan at ryan@ryanpaulanderson.com.\n\nWith love,\nCaroline & Ryan";

export async function deliverEarlyDeclineEmail(id: string): Promise<void> {
  const database = getDatabaseClient();
  if (!database) return;
  const now = new Date();
  const leaseToken = randomUUID();
  const claim = await database.earlyDeclineEmail.updateMany({
    where: {
      id,
      status: { in: ["PENDING", "FAILED", "PAUSED"] },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }],
    },
    data: { leaseToken, leaseExpiresAt: new Date(now.getTime() + 120_000) },
  });
  if (!claim.count) return;
  const finish = async (data: PrismaEmailUpdate) => {
    await database.earlyDeclineEmail.updateMany({
      where: { id, leaseToken },
      data: { ...data, leaseToken: null, leaseExpiresAt: null },
    });
  };
  try {
    const job = await database.earlyDeclineEmail.findUniqueOrThrow({
      where: { id },
      include: { decline: true },
    });
    // Resend retains idempotency keys for 24 hours. Leave uncertain older deliveries for human reconciliation.
    if (job.firstAttemptAt && now.getTime() - job.firstAttemptAt.getTime() >= 23 * 3_600_000) {
      await finish({ status: "NEEDS_REVIEW", errorCode: "delivery-window-expired" });
      return;
    }
    const configuration = getNotificationEmailConfiguration();
    if (!configuration) {
      await finish({ status: "FAILED", errorCode: "configuration" });
      return;
    }
    let payload = job.payload;
    if (!payload) {
      const admin = job.kind === "ADMIN_NOTIFICATION";
      let body = guestConfirmation;
      if (admin) {
        try {
          body = await encryptNotification(
            `Early notice: unable to attend\n\nNames: ${job.decline.names}\nEmail: ${job.decline.email}\nSubmitted: ${job.decline.createdAt.toISOString()}\n\nReview: https://www.carolineandryan.org/admin/early-declines`,
          );
        } catch {
          await finish({ status: "FAILED", errorCode: "encryption" });
          return;
        }
      }
      payload = JSON.stringify({
        from: configuration.from,
        to: [admin ? notificationRecipient.email : job.decline.email],
        subject: admin ? "Wedding RSVP notification" : "Thank you for letting us know",
        text: body,
        ...(admin ? {} : { reply_to: notificationRecipient.email }),
      });
    }
    // Save identical bytes before the first external effect, including randomized PGP ciphertext.
    const prepared = await database.earlyDeclineEmail.updateMany({
      where: { id, leaseToken },
      data: {
        payload,
        firstAttemptAt: job.firstAttemptAt ?? new Date(),
        attempts: { increment: 1 },
      },
    });
    if (!prepared.count) return;
    const result = await sendResendEmail(configuration.apiKey, payload, `early-decline/${id}`);
    if (result.status === "accepted")
      await finish({ status: "ACCEPTED", providerId: result.emailId, errorCode: null });
    else
      await finish({
        status: "FAILED",
        errorCode: result.reason,
      });
  } catch {
    await finish({ status: "FAILED", errorCode: "delivery" });
  }
}

type PrismaEmailUpdate = {
  status: "ACCEPTED" | "FAILED" | "NEEDS_REVIEW";
  providerId?: string;
  errorCode: string | null;
};

export async function deliverEarlyDecline(id: string): Promise<void> {
  const database = getDatabaseClient();
  if (!database) return;
  const jobs = await database.earlyDeclineEmail.findMany({
    where: { declineId: id },
    select: { id: true },
  });
  // Send this notice's jobs sequentially; the transport retries provider throttling.
  for (const job of jobs) await deliverEarlyDeclineEmail(job.id);
}
