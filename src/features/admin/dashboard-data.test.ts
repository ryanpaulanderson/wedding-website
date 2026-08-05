import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabaseClient: vi.fn(),
  requireAdminSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-access", () => ({ requireAdminSession: mocks.requireAdminSession }));
vi.mock("@/lib/database", () => ({ getDatabaseClient: mocks.getDatabaseClient }));

import { getAdminDashboardSnapshot } from "./dashboard-data";

beforeEach(() => {
  mocks.getDatabaseClient.mockReset();
  mocks.requireAdminSession.mockReset();
  mocks.requireAdminSession.mockResolvedValue(undefined);
});

describe("admin dashboard data", () => {
  it("authorizes before accessing the database", async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error("Admin access required."));

    await expect(getAdminDashboardSnapshot()).rejects.toThrow("Admin access required.");
    expect(mocks.getDatabaseClient).not.toHaveBeenCalled();
  });

  it("returns a generic unavailable state for missing configuration", async () => {
    mocks.getDatabaseClient.mockReturnValue(null);

    await expect(getAdminDashboardSnapshot()).resolves.toEqual({ status: "unavailable" });
  });

  it("returns a generic unavailable state when a query fails", async () => {
    const householdCount = vi.fn().mockReturnValue(Promise.resolve(0));
    const guestCount = vi.fn().mockReturnValue(Promise.resolve(0));
    mocks.getDatabaseClient.mockReturnValue({
      household: { count: householdCount, findMany: vi.fn().mockReturnValue(Promise.resolve([])) },
      guest: { count: guestCount },
      $transaction: vi.fn().mockRejectedValue(new Error("secret database detail")),
    });

    await expect(getAdminDashboardSnapshot()).resolves.toEqual({ status: "unavailable" });
  });

  it("maps aggregate and recent-response data into the narrow dashboard DTO", async () => {
    const transactionResults = [
      2,
      4,
      2,
      2,
      [
        {
          id: "household-2",
          displayName: "The Mixed household",
          lastRespondedAt: new Date("2026-08-05T15:00:00.000Z"),
          guests: [{ attendance: "ATTENDING" }, { attendance: "DECLINED" }],
        },
        {
          id: "household-1",
          displayName: "The Attending household",
          lastRespondedAt: new Date("2026-08-05T14:00:00.000Z"),
          guests: [{ attendance: "ATTENDING" }, { attendance: "ATTENDING" }],
        },
      ],
    ] as const;
    mocks.getDatabaseClient.mockReturnValue({
      household: {
        count: vi.fn().mockReturnValue(Promise.resolve(0)),
        findMany: vi.fn().mockReturnValue(Promise.resolve([])),
      },
      guest: { count: vi.fn().mockReturnValue(Promise.resolve(0)) },
      $transaction: vi.fn().mockResolvedValue(transactionResults),
    });

    await expect(getAdminDashboardSnapshot()).resolves.toEqual({
      status: "ready",
      totals: {
        attendingGuests: 2,
        households: 2,
        invitedGuests: 4,
        responsesReceived: 2,
      },
      recentResponses: [
        {
          attendance: "mixed",
          guestCount: 2,
          householdId: "household-2",
          householdName: "The Mixed household",
          submittedAt: "2026-08-05T15:00:00.000Z",
        },
        {
          attendance: "attending",
          guestCount: 2,
          householdId: "household-1",
          householdName: "The Attending household",
          submittedAt: "2026-08-05T14:00:00.000Z",
        },
      ],
    });
  });

  it("omits incomplete records from recent responses", async () => {
    mocks.getDatabaseClient.mockReturnValue({
      household: {
        count: vi.fn().mockReturnValue(Promise.resolve(0)),
        findMany: vi.fn().mockReturnValue(Promise.resolve([])),
      },
      guest: { count: vi.fn().mockReturnValue(Promise.resolve(0)) },
      $transaction: vi.fn().mockResolvedValue([
        1,
        1,
        1,
        0,
        [
          {
            id: "household-1",
            displayName: "Incomplete household",
            lastRespondedAt: new Date("2026-08-05T14:00:00.000Z"),
            guests: [{ attendance: null }],
          },
        ],
      ]),
    });

    await expect(getAdminDashboardSnapshot()).resolves.toMatchObject({
      status: "ready",
      recentResponses: [],
    });
  });
});
