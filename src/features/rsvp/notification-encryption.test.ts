// @vitest-environment node

import { decrypt, generateKey, readKey, readMessage, readPrivateKey } from "openpgp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { encryptNotification } from "./notification-encryption";
import { notificationRecipient } from "./notification-recipient";

async function testRecipient(expired = false) {
  const keys = await generateKey({
    type: "ecc",
    curve: "curve25519Legacy",
    userIDs: [{ email: "recipient@example.com" }],
    ...(expired ? { date: new Date(Date.now() - 60_000), keyExpirationTime: 1 } : {}),
  });
  const publicKey = await readKey({ armoredKey: keys.publicKey });
  return {
    recipient: {
      email: "recipient@example.com",
      fingerprint: publicKey.getFingerprint(),
      publicKey: keys.publicKey,
    },
    privateKey: keys.privateKey,
  };
}

describe("notification encryption", () => {
  it("encrypts readable RSVP details that only the corresponding private key can recover", async () => {
    const { recipient, privateKey } = await testRecipient();
    const text = "Guest: Test Person\nDietary restrictions: Peanut allergy\nPlus-one: Attending";
    const encrypted = await encryptNotification(text, recipient);
    expect(encrypted).toMatch(/^-----BEGIN PGP MESSAGE-----/);
    expect(encrypted).not.toContain("Peanut allergy");
    const decrypted = await decrypt({
      message: await readMessage({ armoredMessage: encrypted }),
      decryptionKeys: await readPrivateKey({ armoredKey: privateKey }),
    });
    expect(decrypted.data).toBe(text);

    const other = await testRecipient();
    await expect(
      decrypt({
        message: await readMessage({ armoredMessage: encrypted }),
        decryptionKeys: await readPrivateKey({ armoredKey: other.privateKey }),
      }),
    ).rejects.toThrow();
  });

  it("targets the supplied and pinned real recipient's encryption subkey", async () => {
    const key = await readKey({ armoredKey: notificationRecipient.publicKey });
    expect(key.getFingerprint()).toBe("58c672499966963f14562e0b87be07b6ee595988");
    const encrypted = await readMessage({
      armoredMessage: await encryptNotification("Delivery test"),
    });
    const encryptionKey = await key.getEncryptionKey();
    expect(encrypted.getEncryptionKeyIDs().map((id) => id.toHex())).toEqual([
      encryptionKey.getKeyID().toHex(),
    ]);
  });

  it("rejects a changed fingerprint, mismatched identity, malformed key, and private key", async () => {
    const { recipient, privateKey } = await testRecipient();
    for (const invalid of [
      { ...recipient, fingerprint: "0".repeat(40) },
      { ...recipient, email: "other@example.com" },
      { ...recipient, publicKey: "not a public key" },
      { ...recipient, publicKey: privateKey },
    ]) {
      await expect(encryptNotification("Sensitive details", invalid)).rejects.toThrow();
    }
  });

  it("rejects expired encryption keys", async () => {
    const { recipient } = await testRecipient(true);
    await expect(encryptNotification("Sensitive details", recipient)).rejects.toThrow();
  });

  it.each(["", "   ", "a".repeat(64_001)])("rejects empty or excessive content", async (text) => {
    await expect(encryptNotification(text)).rejects.toThrow();
  });
});
