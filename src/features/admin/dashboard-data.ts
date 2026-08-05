import "server-only";

import { AttendanceResponse } from "@/generated/prisma/client";
import { requireAdminSession } from "@/lib/admin-access";
import { getDatabaseClient } from "@/lib/database";

export type AdminDashboardTotals = {
  attendingGuests: number;
  households: number;
  invitedGuests: number;
  responsesReceived: number;
};

export type AdminRecentResponse = {
  attendance: "attending" | "declined" | "mixed";
  guestCount: number;
  householdId: string;
  householdName: string;
  submittedAt: string;
};

export type AdminDashboardSnapshot =
  | {
      status: "unavailable";
    }
  | {
      recentResponses: readonly AdminRecentResponse[];
      status: "ready";
      totals: AdminDashboardTotals;
    };

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  await requireAdminSession();

  try {
    const database = getDatabaseClient();

    if (!database) {
      return { status: "unavailable" };
    }

    const [households, invitedGuests, responsesReceived, attendingGuests, recentHouseholds] =
      await database.$transaction([
        database.household.count(),
        database.guest.count(),
        database.household.count({ where: { lastRespondedAt: { not: null } } }),
        database.guest.count({ where: { attendance: AttendanceResponse.ATTENDING } }),
        database.household.findMany({
          where: { lastRespondedAt: { not: null } },
          orderBy: { lastRespondedAt: "desc" },
          take: 8,
          select: {
            id: true,
            displayName: true,
            lastRespondedAt: true,
            guests: { select: { attendance: true } },
          },
        }),
      ]);

    const recentResponses = recentHouseholds.flatMap((household): AdminRecentResponse[] => {
      if (
        !household.lastRespondedAt ||
        household.guests.length === 0 ||
        household.guests.some((guest) => guest.attendance === null)
      ) {
        return [];
      }

      const hasAttendingGuest = household.guests.some(
        (guest) => guest.attendance === AttendanceResponse.ATTENDING,
      );
      const hasDeclinedGuest = household.guests.some(
        (guest) => guest.attendance === AttendanceResponse.DECLINED,
      );
      const attendance =
        hasAttendingGuest && hasDeclinedGuest
          ? "mixed"
          : hasAttendingGuest
            ? "attending"
            : "declined";

      return [
        {
          attendance,
          guestCount: household.guests.length,
          householdId: household.id,
          householdName: household.displayName,
          submittedAt: household.lastRespondedAt.toISOString(),
        },
      ];
    });

    return {
      status: "ready",
      totals: { attendingGuests, households, invitedGuests, responsesReceived },
      recentResponses,
    };
  } catch {
    return { status: "unavailable" };
  }
}
