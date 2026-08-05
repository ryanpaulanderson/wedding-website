import { Pool } from "pg";

function createTestDatabasePool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database-backed browser tests.");
  }

  const hostname = new URL(connectionString).hostname;

  if (!["127.0.0.1", "::1", "database", "localhost"].includes(hostname)) {
    throw new Error("Database-backed browser tests require disposable local PostgreSQL.");
  }

  return new Pool({ connectionString, max: 2 });
}

export async function resetBrowserTestDatabase() {
  const database = createTestDatabasePool();

  try {
    await database.query("DELETE FROM guests");
    await database.query("DELETE FROM households");
  } finally {
    await database.end();
  }
}

export async function seedBrowserTestDatabase() {
  const database = createTestDatabasePool();
  const client = await database.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO households (
        id,
        display_name,
        first_responded_at,
        last_responded_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        "10000000-0000-4000-8000-000000000001",
        "The Browser Test household",
        new Date("2026-08-05T14:00:00.000Z"),
        new Date("2026-08-05T15:00:00.000Z"),
        new Date("2026-08-05T15:00:00.000Z"),
      ],
    );
    await client.query(
      `INSERT INTO guests (id, household_id, display_name, attendance, updated_at)
       VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
      [
        "20000000-0000-4000-8000-000000000001",
        "10000000-0000-4000-8000-000000000001",
        "Browser Guest One",
        "attending",
        new Date("2026-08-05T15:00:00.000Z"),
        "20000000-0000-4000-8000-000000000002",
        "10000000-0000-4000-8000-000000000001",
        "Browser Guest Two",
        "declined",
        new Date("2026-08-05T15:00:00.000Z"),
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await database.end();
  }
}
