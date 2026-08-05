import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-access", () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

import { AttendanceResponse } from "@/generated/prisma/client";
import { getAdminDashboardSnapshot } from "@/features/admin/dashboard-data";
import { getDatabaseClient } from "@/lib/database";

const testDatabaseUrl = process.env.DATABASE_URL;
const allowedTestDatabaseHosts = new Set(["127.0.0.1", "::1", "database", "localhost"]);

if (!testDatabaseUrl || !allowedTestDatabaseHosts.has(new URL(testDatabaseUrl).hostname)) {
  throw new Error("Database integration tests require disposable local PostgreSQL.");
}

const database = (() => {
  const client = getDatabaseClient();

  if (!client) {
    throw new Error(
      "DATABASE_URL must reference a disposable PostgreSQL database for integration tests.",
    );
  }

  return client;
})();

async function clearRsvpData() {
  await database.guest.deleteMany();
  await database.household.deleteMany();
}

beforeEach(clearRsvpData);

afterAll(async () => {
  await clearRsvpData();
  await database.$disconnect();
});

describe("admin dashboard database integration", () => {
  it("returns real zeroes for a connected empty database", async () => {
    await expect(getAdminDashboardSnapshot()).resolves.toEqual({
      status: "ready",
      totals: {
        attendingGuests: 0,
        households: 0,
        invitedGuests: 0,
        responsesReceived: 0,
      },
      recentResponses: [],
    });
  });

  it("counts RSVP records and classifies recent household responses", async () => {
    await database.household.create({
      data: {
        displayName: "The Attending household",
        firstRespondedAt: new Date("2026-08-05T13:00:00.000Z"),
        lastRespondedAt: new Date("2026-08-05T14:00:00.000Z"),
        guests: {
          create: [
            { displayName: "Attending One", attendance: AttendanceResponse.ATTENDING },
            { displayName: "Attending Two", attendance: AttendanceResponse.ATTENDING },
          ],
        },
      },
    });
    await database.household.create({
      data: {
        displayName: "The Declining household",
        firstRespondedAt: new Date("2026-08-05T14:00:00.000Z"),
        lastRespondedAt: new Date("2026-08-05T15:00:00.000Z"),
        guests: {
          create: [{ displayName: "Declining Guest", attendance: AttendanceResponse.DECLINED }],
        },
      },
    });
    await database.household.create({
      data: {
        displayName: "The Mixed household",
        firstRespondedAt: new Date("2026-08-05T15:00:00.000Z"),
        lastRespondedAt: new Date("2026-08-05T16:00:00.000Z"),
        guests: {
          create: [
            { displayName: "Mixed Attending", attendance: AttendanceResponse.ATTENDING },
            { displayName: "Mixed Declining", attendance: AttendanceResponse.DECLINED },
          ],
        },
      },
    });
    await database.household.create({
      data: {
        displayName: "The Pending household",
        guests: { create: [{ displayName: "Pending Guest" }] },
      },
    });

    await expect(getAdminDashboardSnapshot()).resolves.toEqual({
      status: "ready",
      totals: {
        attendingGuests: 3,
        households: 4,
        invitedGuests: 6,
        responsesReceived: 3,
      },
      recentResponses: [
        {
          attendance: "mixed",
          guestCount: 2,
          householdId: expect.any(String),
          householdName: "The Mixed household",
          submittedAt: "2026-08-05T16:00:00.000Z",
        },
        {
          attendance: "declined",
          guestCount: 1,
          householdId: expect.any(String),
          householdName: "The Declining household",
          submittedAt: "2026-08-05T15:00:00.000Z",
        },
        {
          attendance: "attending",
          guestCount: 2,
          householdId: expect.any(String),
          householdName: "The Attending household",
          submittedAt: "2026-08-05T14:00:00.000Z",
        },
      ],
    });
  });

  it("returns the eight newest complete responses when a newer response is incomplete", async () => {
    await Promise.all(
      Array.from({ length: 9 }, (_, index) =>
        database.household.create({
          data: {
            displayName: `Household ${index + 1}`,
            firstRespondedAt: new Date(Date.UTC(2026, 7, 5, index)),
            lastRespondedAt: new Date(Date.UTC(2026, 7, 5, index)),
            guests: {
              create: {
                displayName: `Guest ${index + 1}`,
                attendance: AttendanceResponse.ATTENDING,
              },
            },
          },
        }),
      ),
    );
    await database.household.create({
      data: {
        displayName: "Newer incomplete household",
        firstRespondedAt: new Date(Date.UTC(2026, 7, 5, 10)),
        lastRespondedAt: new Date(Date.UTC(2026, 7, 5, 10)),
        guests: { create: { displayName: "Unanswered Guest" } },
      },
    });

    const snapshot = await getAdminDashboardSnapshot();

    expect(snapshot.status).toBe("ready");
    if (snapshot.status === "ready") {
      expect(snapshot.recentResponses).toHaveLength(8);
      expect(snapshot.recentResponses.map(({ householdName }) => householdName)).toEqual([
        "Household 9",
        "Household 8",
        "Household 7",
        "Household 6",
        "Household 5",
        "Household 4",
        "Household 3",
        "Household 2",
      ]);
    }
  });
});
