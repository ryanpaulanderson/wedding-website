import "server-only";
import { setTimeout as delay } from "node:timers/promises";
export type ResendEmailResult =
  | { status: "accepted"; emailId: string }
  | { status: "failed"; reason: "provider" | "network"; retryable: boolean; httpStatus?: number };

// The caller persists the payload and key before delivery when retries span requests.
export async function sendResendEmail(
  apiKey: string,
  body: string,
  idempotencyKey: string,
): Promise<ResendEmailResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await delay(500 * 2 ** (attempt - 1));

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
