import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("node:timers/promises", () => ({ setTimeout: async () => {} }));
import * as encryption from "@/features/rsvp/notification-encryption";
import { retryDeclineEmail, reviewDecline } from "@/app/admin/early-declines/actions";
import { getDatabaseClient } from "@/lib/database";
import { saveEarlyDecline } from "./submission";
import { deliverEarlyDecline, deliverEarlyDeclineEmail } from "./delivery";
import { getEarlyDeclines, setDeclineReviewed } from "./admin";

const url = process.env.DATABASE_URL;
if (!url || !["127.0.0.1", "localhost", "database", "::1"].includes(new URL(url).hostname))
  throw new Error("Disposable local PostgreSQL required.");
const database = (() => {
  const client = getDatabaseClient();
  if (!client) throw new Error("Database required");
  return client;
})();
const headers = new Headers();
const values = { names: "Alex & Jo Test", email: "alex@example.com" };
const fetchMock = vi.fn<typeof fetch>();
async function clear() {
  await database.earlyDecline.deleteMany();
  await database.earlyDeclineRateLimit.deleteMany();
}
async function save() {
  const result = await saveEarlyDecline(values, headers);
  if (result.status !== "saved") throw new Error(result.status);
  return result.id;
}
async function job(id: string) {
  return database.earlyDeclineEmail.findFirstOrThrow({
    where: { declineId: id, kind: "ADMIN_NOTIFICATION" },
  });
}
beforeEach(async () => {
  await clear();
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("RESEND_EMAIL_DOMAIN", "example.com");
  fetchMock
    .mockReset()
    .mockImplementation(
      async () => new Response(JSON.stringify({ id: randomUUID() }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await clear();
  await database.$disconnect();
});

describe("early notice storage and delivery", () => {
  it("atomically saves one notice and two jobs, even with simultaneous duplicates", async () => {
    const before = await database.guest.count();
    const results = await Promise.all([
      saveEarlyDecline(values, headers),
      saveEarlyDecline({ ...values, email: " ALEX@EXAMPLE.COM " }, headers),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["duplicate", "saved"]);
    expect(await database.earlyDecline.count()).toBe(1);
    expect(await database.earlyDeclineEmail.count()).toBe(2);
    expect(await database.guest.count()).toBe(before);
    expect((await database.earlyDecline.findFirstOrThrow()).names).toBe(values.names);
  });
  it("enforces the shared limit and discards expired counters", async () => {
    await database.earlyDeclineRateLimit.create({
      data: { key: "expired", expiresAt: new Date(0) },
    });
    for (let n = 0; n < 5; n++)
      expect(
        (await saveEarlyDecline({ ...values, email: `guest${n}@example.com` }, headers)).status,
      ).toBe("saved");
    expect(
      (await saveEarlyDecline({ ...values, email: "sixth@example.com" }, headers)).status,
    ).toBe("limited");
    expect(await database.earlyDecline.count()).toBe(5);
    expect(
      await database.earlyDeclineRateLimit.findUnique({ where: { key: "expired" } }),
    ).toBeNull();
  });
  it("prevents unnormalized emails and blank names at the database boundary", async () => {
    await expect(
      database.earlyDecline.create({ data: { ...values, email: "ALEX@example.com" } }),
    ).rejects.toThrow();
    await expect(
      database.earlyDecline.create({ data: { ...values, names: " \t\n" } }),
    ).rejects.toThrow();
  });
  it("sends a fixed guest confirmation and encrypted admin notice only once", async () => {
    const id = await save();
    await deliverEarlyDecline(id);
    await deliverEarlyDecline(id);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)));
    const confirmation = bodies.find((body) => body.to[0] === values.email);
    expect(confirmation.text).toContain(
      "If your plans change, please email Ryan at ryan@ryanpaulanderson.com.",
    );
    expect(confirmation.text).not.toContain(values.names);
    expect(confirmation.reply_to).toBe("ryan@ryanpaulanderson.com");
    const admin = bodies.find((body) => body.to[0] === "ryan@ryanpaulanderson.com");
    expect(admin.text).toContain("-----BEGIN PGP MESSAGE-----");
    expect(JSON.stringify(admin)).not.toContain(values.email);
    expect(JSON.stringify(admin)).not.toContain(values.names);
    expect(await database.earlyDeclineEmail.count({ where: { status: "ACCEPTED" } })).toBe(2);
  });
  it("persists identical ciphertext and key across failures and competing retries", async () => {
    const id = (await job(await save())).id;
    fetchMock.mockRejectedValue(new Error("timeout"));
    await deliverEarlyDeclineEmail(id);
    const original = fetchMock.mock.calls[0][1];
    expect((await database.earlyDeclineEmail.findUniqueOrThrow({ where: { id } })).status).toBe(
      "FAILED",
    );
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ id: randomUUID() })));
    await Promise.all([deliverEarlyDeclineEmail(id), deliverEarlyDeclineEmail(id)]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.body).toBe(original?.body);
      expect(call[1]?.headers).toEqual(original?.headers);
    }
    expect((await database.earlyDeclineEmail.findUniqueOrThrow({ where: { id } })).status).toBe(
      "ACCEPTED",
    );
  });
  it("keeps notices and the other email when one provider call is rejected", async () => {
    const id = await save();
    fetchMock.mockImplementation(async (_url, init) =>
      String(init?.body).includes("BEGIN PGP MESSAGE")
        ? new Response("rejected", { status: 422 })
        : new Response(JSON.stringify({ id: randomUUID() })),
    );
    await deliverEarlyDecline(id);
    expect(await database.earlyDecline.count()).toBe(1);
    expect(await database.earlyDeclineEmail.count({ where: { status: "ACCEPTED" } })).toBe(1);
    expect((await job(id)).status).toBe("FAILED");
  });
  it("fails closed on encryption errors while still sending the guest confirmation", async () => {
    vi.spyOn(encryption, "encryptNotification").mockRejectedValue(new Error("invalid key"));
    const id = await save();
    await deliverEarlyDecline(id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await job(id)).toMatchObject({
      status: "FAILED",
      errorCode: "encryption",
      payload: null,
    });
    expect(String(fetchMock.mock.calls[0][1]?.body)).not.toContain(values.names);
  });
  it("pauses local and Preview delivery without contacting the provider", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await deliverEarlyDecline(await save());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await database.earlyDeclineEmail.count({ where: { status: "PAUSED" } })).toBe(2);
  });
  it("records configuration failure without discarding the notice or starting the retry clock", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const id = await save();
    await deliverEarlyDecline(id);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await job(id)).toMatchObject({
      status: "FAILED",
      errorCode: "configuration",
      firstAttemptAt: null,
      payload: null,
    });
    expect(await database.earlyDecline.count()).toBe(1);
  });
  it("stops uncertain retries before the provider's 24-hour deduplication expires", async () => {
    const row = await job(await save());
    await database.earlyDeclineEmail.update({
      where: { id: row.id },
      data: { firstAttemptAt: new Date(Date.now() - 23 * 3_600_000) },
    });
    await deliverEarlyDeclineEmail(row.id);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await database.earlyDeclineEmail.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("NEEDS_REVIEW");
  });
  it("reclaims an expired lease but skips an active one", async () => {
    const row = await job(await save());
    await database.earlyDeclineEmail.update({
      where: { id: row.id },
      data: { leaseToken: randomUUID(), leaseExpiresAt: new Date(Date.now() + 60_000) },
    });
    await deliverEarlyDeclineEmail(row.id);
    expect(fetchMock).not.toHaveBeenCalled();
    await database.earlyDeclineEmail.update({
      where: { id: row.id },
      data: { leaseExpiresAt: new Date(0) },
    });
    await deliverEarlyDeclineEmail(row.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("tracks admin review separately and returns no stored email payload", async () => {
    const id = await save();
    expect((await getEarlyDeclines(1))?.unreviewed).toBe(1);
    expect(await setDeclineReviewed(id, true)).toBe(true);
    const snapshot = await getEarlyDeclines(1);
    expect(snapshot?.unreviewed).toBe(0);
    expect(snapshot?.notices[0].emails[0]).not.toHaveProperty("payload");
    expect(await setDeclineReviewed(id, false)).toBe(true);
    expect((await getEarlyDeclines(1))?.unreviewed).toBe(1);
  });
  it("reauthorizes admin reads and mutations on hosted deployments", async () => {
    const id = await save();
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    await expect(getEarlyDeclines(1)).rejects.toThrow("Admin access required");
    const form = new FormData();
    form.set("id", id);
    form.set("reviewed", "yes");
    await expect(reviewDecline(form)).rejects.toThrow("Admin access required");
    await expect(retryDeclineEmail(form)).rejects.toThrow("Admin access required");
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(setDeclineReviewed(id, true)).rejects.toThrow("Admin access required");
    expect(
      (await database.earlyDecline.findUniqueOrThrow({ where: { id } })).reviewedAt,
    ).toBeNull();
  });
});
