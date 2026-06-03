import { describe, it, expect } from "vitest";
import { distribuirAlojamentos } from "../src/server/domain/distribuirAlojamentos";
import type { Pessoa, Alojamento, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
  criterioDistribuicao: "completar",
  criterioAlojamento: "dividido",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [], stopWordsNomeGuerra: []
};

const mkP = (n: string, sexo: "M" | "F" = "M", cargo: any = "APF", lock = false): Pessoa => ({
  id: uuid(), nome: n, cpf: "0", cargo, sexo, situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z",
  lockManual: lock ? { alojamento: true } : {}
});

const aloj = (id: string, cargoSexo: string, max: number): Alojamento =>
  ({ id, bloco: id.charAt(0), cargoSexo, max });

describe("distribuirAlojamentos", () => {
  it("aloca apenas em alojamentos compatíveis com sexo", () => {
    const ps = [mkP("A", "F"), mkP("B", "F")];
    const al = [aloj("A 01", "APF/M", 6), aloj("G 02", "APF/F", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r[0]!.alojamentoId).toBe("G 02");
    expect(r[1]!.alojamentoId).toBe("G 02");
  });

  it("respeita capacidade máxima sem folga quando suficientemente cheio", () => {
    const ps = Array.from({ length: 10 }, (_, i) => mkP(`P${i}`, "M"));
    const al = [aloj("A 01", "APF/M", 6), aloj("A 02", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    const a01 = r.filter(p => p.alojamentoId === "A 01").length;
    const a02 = r.filter(p => p.alojamentoId === "A 02").length;
    expect(a01 + a02).toBe(10);
    expect(a01).toBeLessThanOrEqual(6);
    expect(a02).toBeLessThanOrEqual(6);
  });

  it("distribui folga entre alojamentos (não concentra em um só)", () => {
    const ps = Array.from({ length: 10 }, (_, i) => mkP(`P${i}`, "M"));
    const al = [aloj("A 01", "APF/M", 6), aloj("A 02", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, { ...cfg, folgaAlojamento: 0.2 });
    const a01 = r.filter(p => p.alojamentoId === "A 01").length;
    const a02 = r.filter(p => p.alojamentoId === "A 02").length;
    expect(Math.abs(a01 - a02)).toBeLessThanOrEqual(1);
  });

  it("respeita lockManual.alojamento", () => {
    const ps = [
      mkP("A", "M"), mkP("B", "M")
    ];
    ps[0]!.alojamentoId = "A 02";
    ps[0]!.lockManual.alojamento = true;
    const al = [aloj("A 01", "APF/M", 6), aloj("A 02", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r.find(p => p.nome === "A")?.alojamentoId).toBe("A 02");
  });

  it("Sexo F prefere blocos G, D, E nessa ordem", () => {
    const ps = [mkP("A", "F"), mkP("B", "F")];
    const al = [
      aloj("E 01", "DPF/F", 6),
      aloj("D 01", "DPF/F", 6),
      aloj("G 01", "DPF/F", 6)
    ];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r[0]!.alojamentoId).toBe("G 01");
  });

  it("deixa alojamentoId undefined se nenhum compatível", () => {
    const ps = [mkP("A", "F")];
    const al = [aloj("A 01", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r[0]!.alojamentoId).toBeUndefined();
  });

  describe("critério 'cargo'", () => {
    const cfgCargo: Config = { ...cfg, criterioAlojamento: "cargo" };

    it("nunca coloca cargos diferentes na mesma sala", () => {
      const ps = [
        mkP("A", "M", "APF"), mkP("B", "M", "APF"),
        mkP("C", "M", "DPF"), mkP("D", "M", "DPF")
      ];
      const al = [aloj("A 01", "M", 6), aloj("A 02", "M", 6)];
      const r = distribuirAlojamentos(ps, al, cfgCargo);
      const cargoDe: Record<string, Set<string>> = {};
      for (const p of r) {
        const k = p.alojamentoId!;
        (cargoDe[k] ??= new Set()).add(p.cargo);
      }
      for (const k of Object.keys(cargoDe)) {
        expect(cargoDe[k]!.size).toBe(1);
      }
      // todos foram alocados
      expect(r.every(p => p.alojamentoId)).toBe(true);
    });

    it("mantém restrição de sexo", () => {
      const ps = [mkP("A", "F", "APF"), mkP("B", "M", "APF")];
      const al = [aloj("G 01", "APF/F", 6), aloj("A 01", "APF/M", 6)];
      const r = distribuirAlojamentos(ps, al, cfgCargo);
      expect(r.find(p => p.nome === "A")?.alojamentoId).toBe("G 01");
      expect(r.find(p => p.nome === "B")?.alojamentoId).toBe("A 01");
    });

    it("respeita lockManual.alojamento", () => {
      const ps = [mkP("A", "M", "APF", true), mkP("B", "M", "APF")];
      ps[0]!.alojamentoId = "A 02";
      const al = [aloj("A 01", "M", 6), aloj("A 02", "M", 6)];
      const r = distribuirAlojamentos(ps, al, cfgCargo);
      expect(r.find(p => p.nome === "A")?.alojamentoId).toBe("A 02");
    });
  });

  describe("critério 'cargo-turma'", () => {
    const cfgCT: Config = { ...cfg, criterioAlojamento: "cargo-turma" };

    it("nunca coloca turmas diferentes (mesmo cargo) na mesma sala", () => {
      const ps = [
        { ...mkP("A", "M", "APF"), turmaId: "APF-1" },
        { ...mkP("B", "M", "APF"), turmaId: "APF-1" },
        { ...mkP("C", "M", "APF"), turmaId: "APF-2" },
        { ...mkP("D", "M", "APF"), turmaId: "APF-2" }
      ];
      const al = [aloj("A 01", "M", 6), aloj("A 02", "M", 6)];
      const r = distribuirAlojamentos(ps, al, cfgCT);
      const turmaDe: Record<string, Set<string>> = {};
      for (const p of r) {
        (turmaDe[p.alojamentoId!] ??= new Set()).add(p.turmaId!);
      }
      for (const k of Object.keys(turmaDe)) {
        expect(turmaDe[k]!.size).toBe(1);
      }
      expect(r.every(p => p.alojamentoId)).toBe(true);
    });
  });
});
