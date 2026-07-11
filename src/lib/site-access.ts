import { createHmac, scrypt, timingSafeEqual } from "node:crypto";

export const SITE_ACCESS_COOKIE_NAME = "site_access";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const MAX_PASSWORD_LENGTH = 256;
const SESSION_VERSION = 1;
const EXPECTED_SCRYPT_PARAMETERS = {
  N: 16384,
  r: 8,
  p: 1,
} as const;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const SAFE_RETURN_ORIGIN = "https://site.invalid";

type SiteAccessEnvironment = Readonly<Record<string, string | undefined>>;

type SiteAccessConfiguration = {
  passwordHash: string;
  sessionSecret: string;
};

type SiteAccessSession = {
  expiresAt: number;
  version: number;
};

type ParsedPasswordHash = {
  hash: Buffer;
  salt: Buffer;
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

  if (!salt || salt.length !== 16 || !hash || hash.length !== 32) {
    return null;
  }

  return { hash, salt };
}

function signSessionPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function constantTimeEqual(left: Buffer, right: Buffer): boolean {
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isSitePasswordGateEnabled(
  environment: SiteAccessEnvironment = process.env,
): boolean {
  if (environment.VERCEL !== "1") {
    return false;
  }

  return environment.SITE_PASSWORD_GATE !== "disabled";
}

export function getSiteAccessConfiguration(
  environment: SiteAccessEnvironment = process.env,
): SiteAccessConfiguration | null {
  const passwordHash = environment.SITE_PASSWORD_HASH?.trim();
  const sessionSecret = environment.SITE_SESSION_SECRET?.trim();

  if (
    !passwordHash ||
    !parsePasswordHash(passwordHash) ||
    !sessionSecret ||
    Buffer.byteLength(sessionSecret, "utf8") < 32
  ) {
    return null;
  }

  return { passwordHash, sessionSecret };
}

export async function verifySitePassword(password: unknown, encodedHash: string): Promise<boolean> {
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

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      parsedHash.salt,
      parsedHash.hash.length,
      {
        ...EXPECTED_SCRYPT_PARAMETERS,
        maxmem: 64 * 1024 * 1024,
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

  return constantTimeEqual(derivedKey, parsedHash.hash);
}

export function createSiteAccessSession(secret: string, now = Date.now()): string {
  const session: SiteAccessSession = {
    expiresAt: now + SESSION_DURATION_SECONDS * 1000,
    version: SESSION_VERSION,
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = signSessionPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifySiteAccessSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
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
    ) as Partial<SiteAccessSession>;

    return (
      session.version === SESSION_VERSION &&
      typeof session.expiresAt === "number" &&
      Number.isSafeInteger(session.expiresAt) &&
      session.expiresAt > now
    );
  } catch {
    return false;
  }
}

export function getSiteAccessCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}

export function sanitizeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?:2f|5c)/i.test(value) ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return "/";
  }

  try {
    const url = new URL(value, SAFE_RETURN_ORIGIN);

    if (
      url.origin !== SAFE_RETURN_ORIGIN ||
      !url.pathname.startsWith("/") ||
      url.pathname.startsWith("//") ||
      url.pathname === "/access" ||
      url.pathname.startsWith("/access/")
    ) {
      return "/";
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
