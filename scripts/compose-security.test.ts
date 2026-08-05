import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("development database exposure", () => {
  it("binds the PostgreSQL host port only to loopback", async () => {
    const composeSource = await readFile(resolve(process.cwd(), "compose.yaml"), "utf8");

    expect(composeSource).toContain('- "127.0.0.1:5432:5432"');
    expect(composeSource).not.toMatch(/^\s*-\s*"5432:5432"\s*$/m);
  });
});
