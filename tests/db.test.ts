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

  it("migra turmasPorCargo do formato antigo (nº de turmas) para capacidades por turma", async () => {
    const path = join(dir, "db.json");
    const { writeFileSync } = await import("node:fs");
    const now = "2026-05-13T00:00:00Z";
    writeFileSync(path, JSON.stringify({
      version: 1,
      meta: { edicao: "X", criadoEm: now, atualizadoEm: now },
      config: {
        turmasPorCargo: { APF: 2, DPF: 1, EPF: 0, PCF: 0, PPF: 0 },
        criterioDistribuicao: "completar",
        criterioAlojamento: "dividido",
        folgaAlojamento: 0.15,
        normalizacoesFoneticas: [],
        stopWordsNomeGuerra: []
      },
      alojamentos: [],
      turmas: [
        { id: "APF-1", cargo: "APF", numero: 1, label: "APF-A" },
        { id: "APF-2", cargo: "APF", numero: 2, label: "APF-B" },
        { id: "DPF-1", cargo: "DPF", numero: 1, label: "DPF-A" }
      ],
      pessoas: [
        { id: "p1", nome: "A", cpf: "0", cargo: "APF", sexo: "M", criadoEm: now, turmaId: "APF-1", lockManual: {} },
        { id: "p2", nome: "B", cpf: "0", cargo: "APF", sexo: "M", criadoEm: now, turmaId: "APF-1", lockManual: {} }
      ],
      historico: []
    }));
    const db = await openDB(path);
    // APF-1 tem 2 pessoas → capacidade 2; APF-2 sem ninguém → capacidade padrão
    expect(db.data.config.turmasPorCargo.APF).toEqual([2, 30]);
    // DPF-1 sem ninguém → capacidade padrão
    expect(db.data.config.turmasPorCargo.DPF).toEqual([30]);
    expect(db.data.config.turmasPorCargo.EPF).toEqual([]);
  });
});
