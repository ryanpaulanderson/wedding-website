// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));

import {
  getNotificationEmailConfiguration,
  sendEncryptedRsvpNotification,
} from "./notification-email";

const environment = {
  RESEND_API_KEY: "re_test_key",
  RESEND_EMAIL_DOMAIN: "mail.example.com",
  VERCEL_ENV: "production",
};
const notificationId = "10000000-0000-4000-8000-000000000001";
const emailId = "20000000-0000-4000-8000-000000000001";
const accepted = () => new Response(JSON.stringify({ id: emailId }), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("encrypted notification delivery", () => {
  it("sends only encrypted text to the fixed recipient with a generic subject", async () => {
    const fetchMock = vi.fn().mockResolvedValue(accepted());
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendEncryptedRsvpNotification(notificationId, "Allergy: peanuts", {
      environment,
    });
    expect(result).toEqual({ status: "accepted", emailId });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(request.body);
    expect(Object.keys(body).sort()).toEqual(["from", "subject", "text", "to"]);
    expect(body).toMatchObject({
      from: "Caroline & Ryan <rsvp@mail.example.com>",
      to: ["ryan@ryanpaulanderson.com"],
      subject: "Wedding RSVP notification",
      text: expect.stringMatching(/^-----BEGIN PGP MESSAGE-----/),
    });
    expect(request.body).not.toContain("peanuts");
    expect(request.headers["Idempotency-Key"]).toBe(`rsvp-notification/${notificationId}`);
    expect(request.redirect).toBe("error");
  });

  it("retries temporary errors with byte-identical ciphertext and the same idempotency key", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("Rate limited", { status: 429 }))
      .mockResolvedValueOnce(accepted());
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendEncryptedRsvpNotification(notificationId, "Private RSVP", { environment }),
    ).resolves.toEqual({ status: "accepted", emailId });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const requests = fetchMock.mock.calls.map(([, request]) => request);
    expect(new Set(requests.map((request) => request.body)).size).toBe(1);
    expect(new Set(requests.map((request) => request.headers["Idempotency-Key"])).size).toBe(1);
  });

  it("bounds network retries and returns a safe failure without provider details", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("secret provider details"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendEncryptedRsvpNotification(notificationId, "Private RSVP", { environment }),
    ).resolves.toEqual({ status: "failed", reason: "network", retryable: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry permanent provider errors or return their response body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("secret provider details", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendEncryptedRsvpNotification(notificationId, "Private RSVP", { environment }),
    ).resolves.toEqual({ status: "failed", reason: "provider", retryable: false, httpStatus: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send plaintext when encryption rejects the message", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendEncryptedRsvpNotification(notificationId, "", { environment }),
    ).resolves.toEqual({ status: "failed", reason: "encryption", retryable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, "preview", "development"])(
    "sends configured notifications in environment %s",
    async (VERCEL_ENV) => {
      const fetchMock = vi.fn().mockImplementation(accepted);
      vi.stubGlobal("fetch", fetchMock);
      await expect(
        sendEncryptedRsvpNotification(notificationId, "Test", {
          environment: { ...environment, VERCEL_ENV },
        }),
      ).resolves.toEqual({ status: "accepted", emailId });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects incomplete configuration and invalid IDs before making a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendEncryptedRsvpNotification(notificationId, "Test", {
        environment: { VERCEL_ENV: "production" },
      }),
    ).resolves.toMatchObject({ reason: "configuration" });
    await expect(
      sendEncryptedRsvpNotification("guest-name", "Test", { environment }),
    ).resolves.toMatchObject({ reason: "invalid-input" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not treat a malformed provider success as delivery acceptance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({}))));
    await expect(
      sendEncryptedRsvpNotification(notificationId, "Test", { environment }),
    ).resolves.toMatchObject({ status: "failed", reason: "provider" });
  });
});

describe("notification configuration", () => {
  it.each(["https://example.com", "other@example.com", "a\r\nBcc:bad.com", "localhost", "a..com"])(
    "rejects malformed sender domain %s",
    (domain) => {
      expect(
        getNotificationEmailConfiguration({ ...environment, RESEND_EMAIL_DOMAIN: domain }),
      ).toBeNull();
    },
  );
  it("normalizes a valid domain and rejects header injection in the API key", () => {
    expect(
      getNotificationEmailConfiguration({
        ...environment,
        RESEND_EMAIL_DOMAIN: " MAIL.EXAMPLE.COM ",
      }),
    ).toMatchObject({ from: "Caroline & Ryan <rsvp@mail.example.com>" });
    expect(
      getNotificationEmailConfiguration({
        ...environment,
        RESEND_API_KEY: "re_test\r\nx-header: injected",
      }),
    ).toBeNull();
  });
});
