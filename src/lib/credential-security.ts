import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const MAX_PASSWORD_LENGTH = 256;

const SESSION_VERSION = 1;
const EXPECTED_SCRYPT_PARAMETERS = {
  N: 16384,
  r: 8,
  p: 1,
} as const;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const PASSWORD_SALT_LENGTH = 16;
const PASSWORD_HASH_LENGTH = 32;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

type ParsedPasswordHash = {
  hash: Buffer;
  salt: Buffer;
};

type SignedSession = {
  expiresAt: number;
  purpose?: string;
  version: number;
};

type CreateSignedSessionOptions = {
  durationSeconds: number;
  now?: number;
  purpose?: string;
  secret: string;
};

type VerifySignedSessionOptions = {
  now?: number;
  purpose?: string;
  secret: string;
};

function decodeBase64Url(value: string): Buffer | null {
  if (!BASE64URL_PATTERN.test(value)) {
    return null;
  }

  try {
    return Buffer.from(value, "base64url");
  } catch {
    return null;
  }
}

function parsePasswordHash(encodedHash: string): ParsedPasswordHash | null {
  const parts = encodedHash.split("$");

  if (parts.length !== 6) {
    return null;
  }

  const [algorithm, N, r, p, encodedSalt, encodedHashValue] = parts;

  if (
    algorithm !== "scrypt" ||
    Number(N) !== EXPECTED_SCRYPT_PARAMETERS.N ||
    Number(r) !== EXPECTED_SCRYPT_PARAMETERS.r ||
    Number(p) !== EXPECTED_SCRYPT_PARAMETERS.p ||
    !encodedSalt ||
    !encodedHashValue
  ) {
    return null;
  }

  const salt = decodeBase64Url(encodedSalt);
  const hash = decodeBase64Url(encodedHashValue);

  if (
    !salt ||
    salt.length !== PASSWORD_SALT_LENGTH ||
    !hash ||
    hash.length !== PASSWORD_HASH_LENGTH
  ) {
    return null;
  }

  return { hash, salt };
}

function derivePasswordKey(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keyLength,
      {
        ...EXPECTED_SCRYPT_PARAMETERS,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );
  });
}

function constantTimeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isValidPasswordHash(encodedHash: string): boolean {
  return parsePasswordHash(encodedHash) !== null;
}

export function isValidSessionSecret(secret: string): boolean {
  return Buffer.byteLength(secret, "utf8") >= 32;
}

export async function createPasswordHash(
  password: string,
  salt = randomBytes(PASSWORD_SALT_LENGTH),
): Promise<string> {
  if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) {
    throw new RangeError(`Password must contain between 1 and ${MAX_PASSWORD_LENGTH} characters.`);
  }

  if (salt.length !== PASSWORD_SALT_LENGTH) {
    throw new RangeError(`Password salt must contain ${PASSWORD_SALT_LENGTH} bytes.`);
  }

  const hash = await derivePasswordKey(password, salt, PASSWORD_HASH_LENGTH);

  return [
    "scrypt",
    EXPECTED_SCRYPT_PARAMETERS.N,
    EXPECTED_SCRYPT_PARAMETERS.r,
    EXPECTED_SCRYPT_PARAMETERS.p,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

export async function verifyPasswordHash(password: unknown, encodedHash: string): Promise<boolean> {
  if (
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  const parsedHash = parsePasswordHash(encodedHash);

  if (!parsedHash) {
    return false;
  }

  const derivedKey = await derivePasswordKey(password, parsedHash.salt, parsedHash.hash.length);

  return constantTimeEqual(derivedKey, parsedHash.hash);
}

export function createSignedSession({
  durationSeconds,
  now = Date.now(),
  purpose,
  secret,
}: CreateSignedSessionOptions): string {
  const session: SignedSession = {
    expiresAt: now + durationSeconds * 1000,
    ...(purpose ? { purpose } : {}),
    version: SESSION_VERSION,
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = signSessionPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySignedSession(
  token: string | undefined,
  { now = Date.now(), purpose, secret }: VerifySignedSessionOptions,
): boolean {
  if (!token) {
    return false;
  }

  const [payload, encodedSignature, ...remainder] = token.split(".");

  if (!payload || !encodedSignature || remainder.length > 0) {
    return false;
  }

  const signature = decodeBase64Url(encodedSignature);
  const expectedSignature = Buffer.from(signSessionPayload(payload, secret), "base64url");

  if (!signature || !constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SignedSession>;

    return (
      session.version === SESSION_VERSION &&
      session.purpose === purpose &&
      typeof session.expiresAt === "number" &&
      Number.isSafeInteger(session.expiresAt) &&
      session.expiresAt > now
    );
  } catch {
    return false;
  }
}
