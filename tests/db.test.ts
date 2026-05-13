import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/server/db";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cfp-"));
});

describe("openDB", () => {
  it("cria db.json com defaults se não existe", async () => {
    const db = await openDB(join(dir, "db.json"));
    expect(db.data.version).toBe(1);
    expect(db.data.pessoas).toEqual([]);
    expect(db.data.config.folgaAlojamento).toBe(0.15);
    expect(existsSync(join(dir, "db.json"))).toBe(true);
  });

  it("re-abre preservando dados", async () => {
    const path = join(dir, "db.json");
    const a = await openDB(path);
    a.data.meta.edicao = "TESTE";
    await a.write();
    const b = await openDB(path);
    expect(b.data.meta.edicao).toBe("TESTE");
  });

  it("rejeita JSON com schema inválido", async () => {
    const path = join(dir, "db.json");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path, JSON.stringify({ version: 1 }));
    await expect(openDB(path)).rejects.toThrow(/schema/i);
  });
});
