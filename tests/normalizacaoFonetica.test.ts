import { describe, it, expect } from "vitest";
import { normalizar, tokenize } from "../src/server/domain/normalizacaoFonetica";

const subs = [
  { de: "TH", para: "T" }, { de: "LL", para: "L" }, { de: "CC", para: "C" },
  { de: "NN", para: "N" }, { de: "PH", para: "F" },
  { de: "LUIZ", para: "LUIS" }, { de: "SOUZA", para: "SOUSA" },
  { de: "RACHEL", para: "RAQUEL" }, { de: "VICTOR", para: "VITOR" }
];

describe("normalizar", () => {
  it("aplica substituições case-insensitive e retorna upper", () => {
    expect(normalizar("Luiz", subs)).toBe("LUIS");
    expect(normalizar("Souza", subs)).toBe("SOUSA");
    expect(normalizar("Rachel", subs)).toBe("RAQUEL");
    expect(normalizar("Victor", subs)).toBe("VITOR");
  });
  it("aplica substituições parciais", () => {
    expect(normalizar("Stephanie", subs)).toBe("STEFANIE");
    expect(normalizar("Carlla", subs)).toBe("CARLA");
    expect(normalizar("Athena", subs)).toBe("ATENA");
  });
  it("remove acentos", () => {
    expect(normalizar("João", subs)).toBe("JOAO");
    expect(normalizar("Açafrão", subs)).toBe("ACAFRAO");
  });
});

describe("tokenize", () => {
  it("divide por espaço e remove vazios", () => {
    expect(tokenize("FULANO   DE  TAL")).toEqual(["FULANO", "DE", "TAL"]);
  });
});
