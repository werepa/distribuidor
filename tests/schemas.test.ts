import { describe, it, expect } from "vitest";
import {
  PessoaSchema,
  AlojamentoSchema,
  TurmaSchema,
  ConfigSchema,
  DBSchema,
  Cargo,
  Sexo,
  Situacao
} from "../src/shared/schemas";

describe("PessoaSchema", () => {
  it("aceita pessoa válida com mínimos obrigatórios", () => {
    const r = PessoaSchema.safeParse({
      id: "p1",
      nome: "FULANO DE TAL",
      cpf: "000.000.000-00",
      cargo: "APF",
      sexo: "M",
      situacao: "REGULAR",
      email: "f@x",
      criadoEm: "2026-05-13T00:00:00Z",
      lockManual: {}
    });
    expect(r.success).toBe(true);
  });
  it("rejeita cargo inválido", () => {
    const r = PessoaSchema.safeParse({
      id: "p1", nome: "X", cpf: "0", cargo: "XXX", sexo: "M",
      situacao: "REGULAR", email: "f@x",
      criadoEm: "2026-05-13T00:00:00Z", lockManual: {}
    });
    expect(r.success).toBe(false);
  });
});

describe("DBSchema", () => {
  it("valida estrutura mínima vazia", () => {
    const r = DBSchema.safeParse({
      version: 1,
      meta: { edicao: "CFP 2026", criadoEm: "2026-05-13T00:00:00Z", atualizadoEm: "2026-05-13T00:00:00Z" },
      config: {
        turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
        criterioDistribuicao: "completar",
        folgaAlojamento: 0.15,
        normalizacoesFoneticas: [],
        stopWordsNomeGuerra: ["DE","DI","DO","DOS","E","D","SAO"]
      },
      alojamentos: [],
      pessoas: [],
      turmas: [],
      historico: []
    });
    expect(r.success).toBe(true);
  });
});

describe("Enums exportados", () => {
  it("Cargo, Sexo, Situacao acessíveis", () => {
    expect(Cargo.options).toContain("APF");
    expect(Sexo.options).toContain("F");
    expect(Situacao.options).toContain("SUB JUDICE");
  });
});
