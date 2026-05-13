import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup } from "../src/server/backup";

describe("backup", () => {
  it("cria snapshot e mantém no máximo 10", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cfp-"));
    const dbPath = join(dir, "db.json");
    writeFileSync(dbPath, "{}");
    for (let i = 0; i < 12; i++) {
      await backup(dbPath);
      await new Promise(r => setTimeout(r, 5));
    }
    const files = readdirSync(join(dir, "backups"));
    expect(files.length).toBeLessThanOrEqual(10);
    expect(files.every(f => f.startsWith("db-"))).toBe(true);
  });
});
