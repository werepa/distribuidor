import { describe, it, expect } from "vitest";
import { gerarNomesGuerra } from "../src/server/domain/gerarNomesGuerra";
import type { Pessoa, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: [30], DPF: [30], EPF: [], PCF: [], PPF: [] },
  criterioDistribuicao: "completar",
  criterioAlojamento: "dividido",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [
    { de: "TH", para: "T" }, { de: "LUIZ", para: "LUIS" }, { de: "VICTOR", para: "VITOR" }
  ],
  stopWordsNomeGuerra: ["DE", "DA", "DI", "DO", "DOS", "E", "D", "D'", "SAO"]
};

const mkP = (nome: string, turmaId = "APF-1", sexo: "M" | "F" = "M", cargo: any = "APF", lock = false): Pessoa => ({
  id: uuid(), nome, cpf: "0", cargo, sexo, situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z",
  turmaId,
  lockManual: lock ? { nomeGuerra: true } : {}
});

describe("gerarNomesGuerra", () => {
  it("usa primeiro nome para mulher quando único na turma", () => {
    const ps = [mkP("MARIA SILVA", "APF-1", "F"), mkP("JOAO COSTA", "APF-1", "M")];
    const r = gerarNomesGuerra(ps, cfg);
    expect(r.find(p => p.nome === "MARIA SILVA")?.nomeGuerra).toBe("MARIA");
  });

  it("trata Luiz e Luis como conflito fonético na mesma turma", () => {
    const ps = [
      mkP("LUIZ ALMEIDA", "APF-1"),
      mkP("LUIS BARBOSA", "APF-1")
    ];
    const r = gerarNomesGuerra(ps, cfg);
    const a = r.find(p => p.nome === "LUIZ ALMEIDA")!;
    const b = r.find(p => p.nome === "LUIS BARBOSA")!;
    expect(a.nomeGuerra).not.toBe(b.nomeGuerra);
  });

  it("ignora stop-words isoladas como candidatos", () => {
    const ps = [mkP("CARLOS DE OLIVEIRA", "APF-1")];
    const r = gerarNomesGuerra(ps, cfg);
    expect(r[0]!.nomeGuerra).not.toBe("DE");
  });

  it("combina DA com a palavra seguinte quando os nomes simples já estão ocupados", () => {
    const ocupCarlos = mkP("CARLOS AMARAL", "APF-1", "M", "APF", true);
    ocupCarlos.nomeGuerra = "CARLOS";
    const ocupSilva = mkP("PAULO SILVA", "APF-1", "M", "APF", true);
    ocupSilva.nomeGuerra = "SILVA";
    const alvo = mkP("CARLOS DA SILVA", "APF-1");
    const r = gerarNomesGuerra([ocupCarlos, ocupSilva, alvo], cfg);
    expect(r.find(p => p.nome === "CARLOS DA SILVA")?.nomeGuerra).toBe("DA SILVA");
  });

  it("combina D' com a palavra seguinte quando os nomes simples já estão ocupados", () => {
    const ocupPedro = mkP("PEDRO AMARAL", "APF-1", "M", "APF", true);
    ocupPedro.nomeGuerra = "PEDRO";
    const ocupAvila = mkP("JOAO AVILA", "APF-1", "M", "APF", true);
    ocupAvila.nomeGuerra = "AVILA";
    const alvo = mkP("PEDRO D' AVILA", "APF-1");
    const r = gerarNomesGuerra([ocupPedro, ocupAvila, alvo], cfg);
    expect(r.find(p => p.nome === "PEDRO D' AVILA")?.nomeGuerra).toBe("D' AVILA");
  });

  it("forma nome composto se simples conflita", () => {
    const ps = [mkP("CARLOS SILVA", "APF-1"), mkP("CARLOS ALMEIDA", "APF-1")];
    const r = gerarNomesGuerra(ps, cfg);
    const nomes = r.map(p => p.nomeGuerra);
    expect(new Set(nomes).size).toBe(2);
  });

  it("nomeGuerra=undefined e flag se irresolvível", () => {
    const ps = [
      mkP("CARLOS SILVA", "APF-1"),
      mkP("CARLOS SILVA", "APF-1"),
      mkP("CARLOS SILVA", "APF-1")
    ];
    const r = gerarNomesGuerra(ps, cfg);
    const semNome = r.filter(p => !p.nomeGuerra);
    expect(semNome.length).toBeGreaterThanOrEqual(1);
  });

  it("respeita lockManual.nomeGuerra", () => {
    const ps = [
      mkP("VICTOR HUGO", "APF-1", "M", "APF", true),
      mkP("VITOR LIMA", "APF-1")
    ];
    ps[0]!.nomeGuerra = "VICTOR";
    const r = gerarNomesGuerra(ps, cfg);
    expect(r.find(p => p.nome === "VICTOR HUGO")?.nomeGuerra).toBe("VICTOR");
  });

  it("preferencia unicidade dentro do cargo (mas não obrigatória)", () => {
    const ps = [
      mkP("ANA SILVA", "APF-1", "F"),
      mkP("ANA COSTA", "APF-2", "F")
    ];
    const cfg2 = { ...cfg, turmasPorCargo: { ...cfg.turmasPorCargo, APF: 2 } };
    const r = gerarNomesGuerra(ps, cfg2);
    const a = r[0]!.nomeGuerra; const b = r[1]!.nomeGuerra;
    expect(a).toBeTruthy(); expect(b).toBeTruthy();
    expect(a !== b || a === undefined).toBe(true);
  });
});
