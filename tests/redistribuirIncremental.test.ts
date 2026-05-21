import { describe, it, expect } from "vitest";
import { redistribuirIncremental } from "../src/server/domain/redistribuirIncremental";
import type { Pessoa, Turma, Alojamento, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: 2, DPF: 0, EPF: 0, PCF: 0, PPF: 0 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [], stopWordsNomeGuerra: ["DE"]
};

const turmas: Turma[] = [
  { id: "APF-1", cargo: "APF", numero: 1, label: "APF-A" },
  { id: "APF-2", cargo: "APF", numero: 2, label: "APF-B" }
];
const alojs: Alojamento[] = [
  { id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 }
];

const mkP = (nome: string, turmaId?: string, alojamentoId?: string): Pessoa => ({
  id: uuid(), nome, cpf: "0", cargo: "APF", sexo: "M", situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", turmaId, alojamentoId, lockManual: {}
});

describe("redistribuirIncremental", () => {
  it("insere na turma com menor contagem", () => {
    const existentes = [
      mkP("A", "APF-1"), mkP("B", "APF-1"),
      mkP("C", "APF-2")
    ];
    const nova = mkP("Z");
    const r = redistribuirIncremental(nova, existentes, turmas, alojs, cfg);
    expect(r.find(p => p.id === nova.id)?.turmaId).toBe("APF-2");
  });

  it("insere no alojamento com mais folga", () => {
    const existentes = [mkP("A", "APF-1", "A 01"), mkP("B", "APF-1", "A 01")];
    const nova = mkP("Z");
    const r = redistribuirIncremental(nova, existentes, turmas, alojs, cfg);
    expect(r.find(p => p.id === nova.id)?.alojamentoId).toBe("A 01");
  });

  it("gera nome de guerra evitando colisão na turma", () => {
    const existentes = [mkP("LUIZ ALMEIDA", "APF-1")];
    existentes[0]!.nomeGuerra = "LUIZ";
    const nova = mkP("LUIS BARBOSA");
    const r = redistribuirIncremental(nova, existentes, turmas, alojs, cfg);
    const novaR = r.find(p => p.id === nova.id)!;
    expect(novaR.nomeGuerra).toBeTruthy();
    expect(novaR.nomeGuerra).not.toBe("LUIZ");
  });
});
