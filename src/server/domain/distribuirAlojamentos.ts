import type { Pessoa, Alojamento, Config } from "../../shared/schemas.js";

const PREF_F = ["G", "D", "E"];

function compativel(p: Pessoa, a: Alojamento): boolean {
  const partes = a.cargoSexo.split("/");
  const sexoAloj = (partes[1] ?? partes[0] ?? "").trim().toUpperCase();
  return sexoAloj === p.sexo;
}

function ordenarAlojamentosPara(sexo: "M" | "F", alojs: Alojamento[]): Alojamento[] {
  if (sexo !== "F") return [...alojs].sort((a, b) => a.id.localeCompare(b.id));
  return [...alojs].sort((a, b) => {
    const ia = PREF_F.indexOf(a.bloco);
    const ib = PREF_F.indexOf(b.bloco);
    const ra = ia < 0 ? 99 : ia;
    const rb = ib < 0 ? 99 : ib;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}

export function distribuirAlojamentos(pessoas: Pessoa[], alojamentos: Alojamento[], cfg: Config): Pessoa[] {
  const out = pessoas.map(p => ({ ...p, lockManual: { ...p.lockManual } }));

  for (const sexo of ["M", "F"] as const) {
    const doSexo = out.filter(p => p.sexo === sexo);
    const compats = alojamentos.filter(a => doSexo.some(p => compativel(p, a)));
    if (compats.length === 0) {
      doSexo.forEach(p => { if (!p.lockManual.alojamento) p.alojamentoId = undefined; });
      continue;
    }
    const ordenados = ordenarAlojamentosPara(sexo, compats);

    const livres = doSexo.filter(p => !p.lockManual.alojamento);
    const travados = doSexo.filter(p => p.lockManual.alojamento);
    livres.forEach(p => { p.alojamentoId = undefined; });

    const capEfetiva = ordenados.map(a => Math.max(1, Math.floor(a.max * (1 - cfg.folgaAlojamento))));
    const ocup = ordenados.map(a => travados.filter(p => p.alojamentoId === a.id).length);

    livres.sort((a, b) => a.cargo.localeCompare(b.cargo) || a.nome.localeCompare(b.nome, "pt-BR"));

    // Phase 1: round-robin up to capEfetiva
    let i = 0;
    for (const p of livres) {
      let tentadas = 0;
      while (tentadas < ordenados.length) {
        const slot = i % ordenados.length;
        const a = ordenados[slot]!;
        if (compativel(p, a) && ocup[slot]! < capEfetiva[slot]!) {
          p.alojamentoId = a.id;
          ocup[slot]!++;
          i++;
          break;
        }
        i++; tentadas++;
      }
    }

    // Phase 2: overflow — also round-robin up to max
    let j = 0;
    for (const p of livres) {
      if (p.alojamentoId) continue;
      let tentadas = 0;
      while (tentadas < ordenados.length) {
        const slot = j % ordenados.length;
        const a = ordenados[slot]!;
        if (compativel(p, a) && ocup[slot]! < a.max) {
          p.alojamentoId = a.id;
          ocup[slot]!++;
          j++;
          break;
        }
        j++; tentadas++;
      }
    }
  }

  return out;
}
