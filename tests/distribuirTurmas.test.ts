import { describe, it, expect } from "vitest";
import { distribuirTurmas } from "../src/server/domain/distribuirTurmas";
import type { Pessoa, Turma, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

function pessoa(p: Partial<Pessoa>): Pessoa {
  return {
    id: p.id ?? uuid(),
    nome: p.nome ?? "X",
    cpf: p.cpf ?? "0",
    cargo: p.cargo ?? "APF",
    sexo: p.sexo ?? "M",
    situacao: p.situacao ?? "REGULAR",
    email: "x@y",
    criadoEm: "2026-05-13T00:00:00Z",
    lockManual: p.lockManual ?? {},
    ...p
  };
}

const baseConfig: Config = {
  turmasPorCargo: { APF: 2, DPF: 1, EPF: 0, PCF: 0, PPF: 0 },
  criterioDistribuicao: "completar",
  criterioAlojamento: "dividido",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [],
  stopWordsNomeGuerra: []
};

function turmasFor(cfg: Config): Turma[] {
  const out: Turma[] = [];
  (Object.keys(cfg.turmasPorCargo) as Array<keyof typeof cfg.turmasPorCargo>).forEach(c => {
    for (let i = 1; i <= cfg.turmasPorCargo[c]; i++) {
      out.push({ id: `${c}-${i}`, cargo: c as any, numero: i, label: `${c}-${String.fromCharCode(64 + i)}` });
    }
  });
  return out;
}

describe("distribuirTurmas — critério completar", () => {
  it("distribui par igualmente entre 2 turmas", () => {
    const pessoas = ["A","B","C","D"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1");
    const t2 = r.filter(p => p.turmaId === "APF-2");
    expect(t1.length).toBe(2);
    expect(t2.length).toBe(2);
  });

  it("ímpar permite apenas uma turma com tamanho ímpar (a última)", () => {
    const pessoas = ["A","B","C","D","E"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1").length;
    const t2 = r.filter(p => p.turmaId === "APF-2").length;
    expect([t1, t2].sort()).toEqual([2, 3]);
    expect(t2).toBe(3); // a última recebe o ímpar
  });

  it("ordena alfabeticamente dentro do cargo", () => {
    const pessoas = ["DELTA","ALPHA","CHARLIE","BRAVO"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1").map(p => p.nome);
    expect(t1).toEqual(["ALPHA", "BRAVO"]);
  });
});

describe("distribuirTurmas — balanceamento SUB JUDICE / Sexo F", () => {
  it("distribui SUB JUDICE igualmente entre turmas", () => {
    const pessoas = [
      pessoa({ nome: "A", situacao: "SUB JUDICE" }),
      pessoa({ nome: "B", situacao: "SUB JUDICE" }),
      pessoa({ nome: "C", situacao: "SUB JUDICE" }),
      pessoa({ nome: "D", situacao: "SUB JUDICE" }),
      pessoa({ nome: "E" }), pessoa({ nome: "F" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const sj1 = r.filter(p => p.turmaId === "APF-1" && p.situacao === "SUB JUDICE").length;
    const sj2 = r.filter(p => p.turmaId === "APF-2" && p.situacao === "SUB JUDICE").length;
    expect(Math.abs(sj1 - sj2)).toBeLessThanOrEqual(1);
    expect(sj1 + sj2).toBe(4);
  });

  it("distribui Sexo F igualmente entre turmas", () => {
    const pessoas = [
      pessoa({ nome: "A", sexo: "F" }), pessoa({ nome: "B", sexo: "F" }),
      pessoa({ nome: "C", sexo: "F" }), pessoa({ nome: "D", sexo: "F" }),
      pessoa({ nome: "E" }), pessoa({ nome: "F" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const f1 = r.filter(p => p.turmaId === "APF-1" && p.sexo === "F").length;
    const f2 = r.filter(p => p.turmaId === "APF-2" && p.sexo === "F").length;
    expect(Math.abs(f1 - f2)).toBeLessThanOrEqual(1);
  });
});

describe("distribuirTurmas — critério round-robin", () => {
  it("distribui um por turma em rodízio", () => {
    const cfg = { ...baseConfig, criterioDistribuicao: "round-robin" as const };
    const pessoas = ["A","B","C","D"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    expect(r.find(p => p.nome === "A")?.turmaId).toBe("APF-1");
    expect(r.find(p => p.nome === "B")?.turmaId).toBe("APF-2");
    expect(r.find(p => p.nome === "C")?.turmaId).toBe("APF-1");
    expect(r.find(p => p.nome === "D")?.turmaId).toBe("APF-2");
  });
});

describe("distribuirTurmas — locks", () => {
  it("não move pessoas com lockManual.turma=true", () => {
    const pessoas = [
      pessoa({ nome: "A", turmaId: "APF-2", lockManual: { turma: true } }),
      pessoa({ nome: "B" }), pessoa({ nome: "C" }), pessoa({ nome: "D" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    expect(r.find(p => p.nome === "A")?.turmaId).toBe("APF-2");
  });

  it("cargo com 1 pessoa só vai pra única turma", () => {
    const cfg = { ...baseConfig, turmasPorCargo: { ...baseConfig.turmasPorCargo, DPF: 1 } };
    const pessoas = [pessoa({ nome: "X", cargo: "DPF" })];
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    expect(r[0]!.turmaId).toBe("DPF-1");
  });

  it("se nº turmas = 0, deixa turmaId undefined", () => {
    const pessoas = [pessoa({ nome: "X", cargo: "PPF" })];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    expect(r[0]!.turmaId).toBeUndefined();
  });
});
