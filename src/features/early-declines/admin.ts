import "server-only";
import { requireAdminSession } from "@/lib/admin-access";
import { getDatabaseClient } from "@/lib/database";

export async function getEarlyDeclines(page: number) {
  await requireAdminSession();
  const database = getDatabaseClient();
  if (!database) return null;
  try {
    const [total, unreviewed, notices] = await database.$transaction([
      database.earlyDecline.count(),
      database.earlyDecline.count({ where: { reviewedAt: null } }),
      database.earlyDecline.findMany({
        skip: (page - 1) * 25,
        take: 25,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          names: true,
          email: true,
          createdAt: true,
          reviewedAt: true,
          emails: {
            orderBy: { kind: "asc" },
            select: { id: true, kind: true, status: true, errorCode: true, providerId: true },
          },
        },
      }),
    ]);
    return { total, unreviewed, notices };
  } catch {
    return null;
  }
}

export async function setDeclineReviewed(id: string, reviewed: boolean): Promise<boolean> {
  await requireAdminSession();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const database = getDatabaseClient();
  if (!database) return false;
  try {
    const result = await database.earlyDecline.updateMany({
      where: { id },
      data: { reviewedAt: reviewed ? new Date() : null },
    });
    return result.count === 1;
  } catch {
    return false;
  }
}
