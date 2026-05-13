import { describe, it, expect } from "vitest";
import { distribuirAlojamentos } from "../src/server/domain/distribuirAlojamentos";
import type { Pessoa, Alojamento, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
  criterioDistribuicao: "completar",
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
});
