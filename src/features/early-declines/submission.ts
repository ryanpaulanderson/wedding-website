import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/lib/database";
import { createLoginRateLimitKey } from "@/lib/login-rate-limit";
import { isValidSessionSecret } from "@/lib/credential-security";
import { validateDecline, type DeclineValues } from "./validation";

export async function saveEarlyDecline(
  values: DeclineValues,
  requestHeaders: { get(name: string): string | null },
): Promise<{ status: "saved"; id: string } | { status: "duplicate" | "limited" | "unavailable" }> {
  const parsed = validateDecline(values);
  if (parsed.status === "error") return { status: "unavailable" };
  const database = getDatabaseClient();
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!database || (process.env.VERCEL === "1" && (!secret || !isValidSessionSecret(secret))))
    return { status: "unavailable" };
  const now = Date.now();
  const hour = Math.floor(now / 3_600_000);
  const key = createLoginRateLimitKey({
    namespace: `early-decline:${hour}`,
    secret: secret ?? "local-early-decline",
    requestHeaders,
  });
  try {
    await database.earlyDeclineRateLimit.deleteMany({
      where: { expiresAt: { lt: new Date(now) } },
    });
    // Atomic PostgreSQL upsert shares the limit across serverless instances.
    const limit = await database.earlyDeclineRateLimit.upsert({
      where: { key },
      create: { key, expiresAt: new Date((hour + 1) * 3_600_000) },
      update: { attempts: { increment: 1 } },
    });
    if (limit.attempts > 5) return { status: "limited" };
    const result = await database.earlyDecline.create({
      data: {
        ...parsed.values,
        emails: { create: [{ kind: "GUEST_CONFIRMATION" }, { kind: "ADMIN_NOTIFICATION" }] },
      },
      select: { id: true },
    });
    return { status: "saved", id: result.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return { status: "duplicate" };
    return { status: "unavailable" };
  }
}
