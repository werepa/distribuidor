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
  turmasPorCargo: { APF: [2, 2], DPF: [1], EPF: [], PCF: [], PPF: [] },
  criterioDistribuicao: "completar",
  criterioAlojamento: "dividido",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [],
  stopWordsNomeGuerra: []
};

function turmasFor(cfg: Config): Turma[] {
  const out: Turma[] = [];
  (Object.keys(cfg.turmasPorCargo) as Array<keyof typeof cfg.turmasPorCargo>).forEach(c => {
    cfg.turmasPorCargo[c].forEach((capacidade, idx) => {
      const i = idx + 1;
      out.push({ id: `${c}-${i}`, cargo: c as any, numero: i, label: `${c}-${String.fromCharCode(64 + i)}`, capacidade });
    });
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

  it("sobra além da capacidade configurada vai para a última turma", () => {
    const pessoas = ["A","B","C","D","E"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1").length;
    const t2 = r.filter(p => p.turmaId === "APF-2").length;
    expect(t1).toBe(2); // respeita a capacidade configurada (2)
    expect(t2).toBe(3); // absorve a 5ª pessoa além da capacidade
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

describe("distribuirTurmas — paridade (par/ímpar) entre turmas", () => {
  it("com 3 turmas e critério round-robin, distribui em pares (não 1 a 1) para manter todas as turmas com número par", () => {
    const cfg: Config = {
      ...baseConfig,
      turmasPorCargo: { APF: [10, 10, 10], DPF: [], EPF: [], PCF: [], PPF: [] },
      criterioDistribuicao: "round-robin"
    };
    const pessoas = ["A", "B", "C", "D"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    const counts = ["APF-1", "APF-2", "APF-3"].map(id => r.filter(p => p.turmaId === id).length);
    expect(counts.every(c => c % 2 === 0)).toBe(true);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("com total ímpar, apenas 1 turma fica com número ímpar de alunos", () => {
    const cfg: Config = {
      ...baseConfig,
      turmasPorCargo: { APF: [10, 10, 10], DPF: [], EPF: [], PCF: [], PPF: [] },
      criterioDistribuicao: "round-robin"
    };
    const pessoas = ["A", "B", "C", "D", "E"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    const counts = ["APF-1", "APF-2", "APF-3"].map(id => r.filter(p => p.turmaId === id).length);
    expect(counts.filter(c => c % 2 === 1).length).toBe(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("com total par, nenhuma turma fica com número ímpar de alunos", () => {
    const cfg: Config = {
      ...baseConfig,
      turmasPorCargo: { APF: [10, 10, 10], DPF: [], EPF: [], PCF: [], PPF: [] },
      criterioDistribuicao: "completar"
    };
    const pessoas = ["A", "B", "C", "D", "E", "F"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    const counts = ["APF-1", "APF-2", "APF-3"].map(id => r.filter(p => p.turmaId === id).length);
    expect(counts.every(c => c % 2 === 0)).toBe(true);
  });

  it("sexo F ímpar: no máximo 1 turma fica com número ímpar de mulheres (paridade tem prioridade sobre uniformidade)", () => {
    const cfg: Config = {
      ...baseConfig,
      turmasPorCargo: { APF: [10, 10, 10], DPF: [], EPF: [], PCF: [], PPF: [] },
      criterioDistribuicao: "round-robin"
    };
    const pessoas = [
      pessoa({ nome: "Fa", sexo: "F" }), pessoa({ nome: "Fb", sexo: "F" }), pessoa({ nome: "Fc", sexo: "F" }),
      pessoa({ nome: "Ma", sexo: "M" }), pessoa({ nome: "Mb", sexo: "M" }), pessoa({ nome: "Mc", sexo: "M" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    const ids = ["APF-1", "APF-2", "APF-3"];
    const femCounts = ids.map(id => r.filter(p => p.turmaId === id && p.sexo === "F").length);
    expect(femCounts.filter(c => c % 2 === 1).length).toBe(1);
    expect(femCounts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("estoura a capacidade configurada em pares: turma que recebe a sobra continua respeitando a paridade", () => {
    const cfg: Config = {
      ...baseConfig,
      turmasPorCargo: { APF: [2, 2, 2], DPF: [], EPF: [], PCF: [], PPF: [] },
      criterioDistribuicao: "completar"
    };
    const pessoas = ["A", "B", "C", "D", "E", "F", "G", "H"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    const counts = ["APF-1", "APF-2", "APF-3"].map(id => r.filter(p => p.turmaId === id).length);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(8);
    expect(counts.filter(c => c % 2 === 1).length).toBe(0);
  });
});

describe("distribuirTurmas — paridade de sexo F tem prioridade sobre uniformidade", () => {
  it("4 mulheres em 3 turmas => 2,2,0 (não 2,1,1), independente do critério configurado", () => {
    for (const criterioDistribuicao of ["completar", "round-robin"] as const) {
      const cfg: Config = {
        ...baseConfig,
        turmasPorCargo: { APF: [10, 10, 10], DPF: [], EPF: [], PCF: [], PPF: [] },
        criterioDistribuicao
      };
      const pessoas = ["Fa", "Fb", "Fc", "Fd"].map(n => pessoa({ nome: n, sexo: "F" }));
      const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
      const femCounts = ["APF-1", "APF-2", "APF-3"].map(id => r.filter(p => p.turmaId === id).length);
      expect(femCounts.sort((a, b) => b - a)).toEqual([2, 2, 0]);
    }
  });

  it("com número de mulheres ímpar, no máximo 1 turma fica ímpar, e a sobra vai para a turma com menos mulheres (menor diferença como desempate)", () => {
    const cfg: Config = {
      ...baseConfig,
      turmasPorCargo: { APF: [10, 10, 10], DPF: [], EPF: [], PCF: [], PPF: [] },
      criterioDistribuicao: "round-robin"
    };
    const pessoas = ["Fa", "Fb", "Fc", "Fd", "Fe"].map(n => pessoa({ nome: n, sexo: "F" }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    const femCounts = ["APF-1", "APF-2", "APF-3"].map(id => r.filter(p => p.turmaId === id).length);
    expect(femCounts.filter(c => c % 2 === 1).length).toBe(1);
    expect(femCounts.sort((a, b) => b - a)).toEqual([2, 2, 1]);
  });
});

describe("distribuirTurmas — critério round-robin", () => {
  it("distribui em pares por turma em rodízio (paridade tem prioridade sobre alternância individual)", () => {
    const cfg = { ...baseConfig, criterioDistribuicao: "round-robin" as const };
    const pessoas = ["A","B","C","D"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    expect(r.find(p => p.nome === "A")?.turmaId).toBe("APF-1");
    expect(r.find(p => p.nome === "B")?.turmaId).toBe("APF-1");
    expect(r.find(p => p.nome === "C")?.turmaId).toBe("APF-2");
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
    const pessoas = [pessoa({ nome: "X", cargo: "DPF" })];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    expect(r[0]!.turmaId).toBe("DPF-1");
  });

  it("se nº turmas = 0, deixa turmaId undefined", () => {
    const pessoas = [pessoa({ nome: "X", cargo: "PPF" })];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    expect(r[0]!.turmaId).toBeUndefined();
  });
});
