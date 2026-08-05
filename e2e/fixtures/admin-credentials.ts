import { scryptSync } from "node:crypto";

export const ADMIN_TEST_PASSWORD = "test-admin-passphrase-2026";
export const ADMIN_TEST_SESSION_SECRET =
  "test-admin-session-secret-that-is-at-least-thirty-two-characters";

const salt = Buffer.alloc(16, 12);
const hash = scryptSync(ADMIN_TEST_PASSWORD, salt, 32, {
  N: 16384,
  p: 1,
  r: 8,
  maxmem: 64 * 1024 * 1024,
});

export const ADMIN_TEST_PASSWORD_HASH = `scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
