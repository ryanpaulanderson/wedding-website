import "server-only";

import { requireAdminSession } from "@/lib/admin-access";

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
      status: "not-connected";
    }
  | {
      recentResponses: readonly AdminRecentResponse[];
      status: "ready";
      totals: AdminDashboardTotals;
    };

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  await requireAdminSession();

  return { status: "not-connected" };
}
