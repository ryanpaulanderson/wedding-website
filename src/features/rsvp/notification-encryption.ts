import "server-only";

import { createMessage, encrypt, readKey } from "openpgp";
import { notificationRecipient } from "./notification-recipient";

type EncryptionRecipient = {
  email: string;
  fingerprint: string;
  publicKey: string;
};

export async function encryptNotification(
  message: string,
  recipient: EncryptionRecipient = notificationRecipient,
): Promise<string> {
  if (typeof message !== "string" || !message.trim() || Buffer.byteLength(message) > 64_000) {
    throw new Error("Notification must contain between 1 and 64,000 bytes of text.");
  }

  const key = await readKey({ armoredKey: recipient.publicKey });
  if (
    key.isPrivate() ||
    key.getFingerprint() !== recipient.fingerprint ||
    !key.users.some((user) => user.userID?.email === recipient.email)
  ) {
    throw new Error("The notification encryption key does not match the intended recipient.");
  }

  // Revalidate on each encryption so key expiry or revocation cannot be hidden by a cache.
  await key.getEncryptionKey();
  return encrypt({
    message: await createMessage({ text: message }),
    encryptionKeys: key,
    format: "armored",
  });
}
