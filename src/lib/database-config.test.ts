import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDatabaseConfiguration } from "./database-config";

describe("database configuration", () => {
  it("accepts PostgreSQL connection URLs and trims surrounding whitespace", () => {
    expect(
      getDatabaseConfiguration({
        DATABASE_URL: "  postgresql://wedding:secret@localhost:5432/wedding  ",
      }),
    ).toEqual({ databaseUrl: "postgresql://wedding:secret@localhost:5432/wedding" });
    expect(
      getDatabaseConfiguration({ DATABASE_URL: "postgres://localhost/wedding" }),
    ).not.toBeNull();
  });

  it.each([
    {},
    { DATABASE_URL: "" },
    { DATABASE_URL: "not-a-url" },
    { DATABASE_URL: "https://example.com/wedding" },
    { DATABASE_URL: "postgresql://localhost" },
    { DATABASE_URL: `postgresql://${"a".repeat(2_048)}` },
  ])("rejects missing or malformed configuration", (environment) => {
    expect(getDatabaseConfiguration(environment)).toBeNull();
  });
});
