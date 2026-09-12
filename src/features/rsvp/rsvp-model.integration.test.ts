import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AttendanceResponse } from "@/generated/prisma/client";
import { getDatabaseClient } from "@/lib/database";

const testDatabaseUrl = process.env.DATABASE_URL;
const allowedTestDatabaseHosts = new Set(["127.0.0.1", "::1", "database", "localhost"]);

if (!testDatabaseUrl || !allowedTestDatabaseHosts.has(new URL(testDatabaseUrl).hostname)) {
  throw new Error("Database integration tests require disposable local PostgreSQL.");
}

const database = (() => {
  const client = getDatabaseClient();
  if (!client) throw new Error("A disposable local database is required.");
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

async function createGuest(plusOneAllowed = false) {
  return database.guest.create({
    data: {
      displayName: "Invited Guest",
      plusOneAllowed,
      household: { create: { displayName: "Test Household" } },
    },
  });
}

describe("RSVP dietary and plus-one model", () => {
  it("preserves the existing creation flow with no plus-one permission or dietary data", async () => {
    const household = await database.household.create({
      data: {
        displayName: "Existing Household",
        guests: { create: { displayName: "Existing Guest" } },
      },
      include: { guests: true },
    });

    expect(household.invitationTokenHash).toBeNull();
    expect(household.guests[0]).toMatchObject({
      dietaryRestrictions: null,
      plusOneAllowed: false,
      plusOneName: null,
      plusOneAttendance: null,
      plusOneDietaryRestrictions: null,
    });
  });

  it("stores separate dietary notes and attendance for an invited guest and companion", async () => {
    const guest = await createGuest(true);
    const updated = await database.guest.update({
      where: { id: guest.id },
      data: {
        attendance: AttendanceResponse.ATTENDING,
        dietaryRestrictions: "Peanut allergy",
        plusOneName: "Companion Guest",
        plusOneAttendance: AttendanceResponse.ATTENDING,
        plusOneDietaryRestrictions: "Vegetarian",
      },
    });

    expect(updated).toMatchObject({
      dietaryRestrictions: "Peanut allergy",
      plusOneName: "Companion Guest",
      plusOneAttendance: AttendanceResponse.ATTENDING,
      plusOneDietaryRestrictions: "Vegetarian",
    });

    await expect(
      database.guest.update({
        where: { id: guest.id },
        data: { plusOneAllowed: false },
      }),
    ).rejects.toThrow();

    await expect(
      database.guest.update({
        where: { id: guest.id },
        data: {
          plusOneAllowed: false,
          plusOneName: null,
          plusOneAttendance: null,
          plusOneDietaryRestrictions: null,
        },
      }),
    ).resolves.toMatchObject({ plusOneAllowed: false, plusOneName: null });
  });

  it.each([
    { plusOneName: "Uninvited Companion" },
    { plusOneAttendance: AttendanceResponse.DECLINED },
    { plusOneDietaryRestrictions: "Vegetarian" },
  ])("rejects plus-one data without permission: %j", async (data) => {
    const guest = await createGuest();
    await expect(database.guest.update({ where: { id: guest.id }, data })).rejects.toThrow();
    expect(await database.guest.findUniqueOrThrow({ where: { id: guest.id } })).toMatchObject({
      plusOneAllowed: false,
      plusOneName: null,
      plusOneAttendance: null,
      plusOneDietaryRestrictions: null,
    });
  });

  it.each([null, "", "   ", "\t\n"])("rejects an attending plus-one with name %j", async (name) => {
    const guest = await createGuest(true);
    await expect(
      database.guest.update({
        where: { id: guest.id },
        data: {
          attendance: AttendanceResponse.ATTENDING,
          plusOneAttendance: AttendanceResponse.ATTENDING,
          plusOneName: name,
        },
      }),
    ).rejects.toThrow();
  });

  it.each([null, AttendanceResponse.DECLINED])(
    "rejects an attending companion when the invited guest has attendance %j",
    async (attendance) => {
      const guest = await createGuest(true);
      await expect(
        database.guest.update({
          where: { id: guest.id },
          data: {
            attendance,
            plusOneAttendance: AttendanceResponse.ATTENDING,
            plusOneName: "Companion Guest",
          },
        }),
      ).rejects.toThrow();
    },
  );

  it("allows an invited guest to attend without using their permitted plus-one", async () => {
    const guest = await createGuest(true);
    await expect(
      database.guest.update({
        where: { id: guest.id },
        data: {
          attendance: AttendanceResponse.ATTENDING,
          plusOneAttendance: AttendanceResponse.DECLINED,
        },
      }),
    ).resolves.toMatchObject({ plusOneName: null, plusOneAttendance: AttendanceResponse.DECLINED });
  });

  it.each(["dietaryRestrictions", "plusOneDietaryRestrictions"] as const)(
    "limits %s to 1,000 characters",
    async (field) => {
      const guest = await createGuest(true);
      await expect(
        database.guest.update({ where: { id: guest.id }, data: { [field]: "a".repeat(1000) } }),
      ).resolves.toMatchObject({ [field]: "a".repeat(1000) });
      await expect(
        database.guest.update({ where: { id: guest.id }, data: { [field]: "a".repeat(1001) } }),
      ).rejects.toThrow();
    },
  );

  it("limits companion names to 200 characters", async () => {
    const guest = await createGuest(true);
    await expect(
      database.guest.update({ where: { id: guest.id }, data: { plusOneName: "a".repeat(200) } }),
    ).resolves.toMatchObject({ plusOneName: "a".repeat(200) });
    await expect(
      database.guest.update({ where: { id: guest.id }, data: { plusOneName: "a".repeat(201) } }),
    ).rejects.toThrow();
  });
});

describe("future household invitation tokens", () => {
  it("allows multiple households without tokens and enforces unique hashes when assigned", async () => {
    const first = await database.household.create({ data: { displayName: "First Household" } });
    const second = await database.household.create({ data: { displayName: "Second Household" } });
    const invitationTokenHash = createHash("sha256").update("fictional-test-token").digest("hex");

    await database.household.update({ where: { id: first.id }, data: { invitationTokenHash } });
    await expect(
      database.household.update({ where: { id: second.id }, data: { invitationTokenHash } }),
    ).rejects.toThrow();

    await database.household.update({
      where: { id: first.id },
      data: { invitationTokenHash: null },
    });
    await expect(
      database.household.update({ where: { id: second.id }, data: { invitationTokenHash } }),
    ).resolves.toMatchObject({ invitationTokenHash });
  });

  it.each(["raw-invitation-token", "z".repeat(64), "a".repeat(63)])(
    "rejects malformed invitation hashes",
    async (invitationTokenHash) => {
      await expect(
        database.household.create({ data: { displayName: "Test Household", invitationTokenHash } }),
      ).rejects.toThrow();
    },
  );
});
