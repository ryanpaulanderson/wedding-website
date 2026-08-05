import "server-only";

const MAX_DATABASE_URL_LENGTH = 2_048;

export type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

export type DatabaseConfiguration = {
  databaseUrl: string;
};

export function getDatabaseConfiguration(
  environment: DatabaseEnvironment = process.env,
): DatabaseConfiguration | null {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl || databaseUrl.length > MAX_DATABASE_URL_LENGTH) {
    return null;
  }

  try {
    const parsedUrl = new URL(databaseUrl);

    if (
      (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") ||
      !parsedUrl.hostname ||
      parsedUrl.pathname.length <= 1
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { databaseUrl };
}
