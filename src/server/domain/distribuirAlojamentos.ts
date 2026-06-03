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

// Aloca um grupo de pessoas livres nas salas dadas (já ordenadas), usando o mapa
// de ocupação compartilhado (semeado com pessoas travadas). Duas fases:
// 1) round-robin até a capacidade efetiva (com folga); 2) overflow até o max.
function alocarGrupo(livres: Pessoa[], salas: Alojamento[], ocup: Map<string, number>, cfg: Config): void {
  if (salas.length === 0) return;
  const ordered = [...livres].sort(
    (a, b) => a.cargo.localeCompare(b.cargo) || a.nome.localeCompare(b.nome, "pt-BR")
  );
  const capEf = new Map(salas.map(a => [a.id, Math.max(1, Math.floor(a.max * (1 - cfg.folgaAlojamento)))]));

  let i = 0;
  for (const p of ordered) {
    let tentadas = 0;
    while (tentadas < salas.length) {
      const a = salas[i % salas.length]!;
      if (compativel(p, a) && (ocup.get(a.id) ?? 0) < capEf.get(a.id)!) {
        p.alojamentoId = a.id;
        ocup.set(a.id, (ocup.get(a.id) ?? 0) + 1);
        i++;
        break;
      }
      i++; tentadas++;
    }
  }

  let j = 0;
  for (const p of ordered) {
    if (p.alojamentoId) continue;
    let tentadas = 0;
    while (tentadas < salas.length) {
      const a = salas[j % salas.length]!;
      if (compativel(p, a) && (ocup.get(a.id) ?? 0) < a.max) {
        p.alojamentoId = a.id;
        ocup.set(a.id, (ocup.get(a.id) ?? 0) + 1);
        j++;
        break;
      }
      j++; tentadas++;
    }
  }
}

// Agrupa pessoas pela chave, devolvendo um Map em ordem determinística de chave.
function agruparPessoas(livres: Pessoa[], chave: (p: Pessoa) => string): Map<string, Pessoa[]> {
  const m = new Map<string, Pessoa[]>();
  for (const p of livres) {
    const k = chave(p);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(p);
  }
  return new Map([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

// Particiona as salas entre os grupos sem compartilhar sala entre grupos distintos.
// Salas que já contêm pessoa travada são reservadas ao grupo dessa pessoa.
function particionarSalas(
  ordenados: Alojamento[],
  grupos: Map<string, Pessoa[]>,
  travados: Pessoa[],
  chave: (p: Pessoa) => string
): Map<string, Alojamento[]> {
  const result = new Map<string, Alojamento[]>();
  const usadas = new Set<string>();

  for (const a of ordenados) {
    const locked = travados.find(p => p.alojamentoId === a.id);
    if (locked) {
      const k = chave(locked);
      if (!result.has(k)) result.set(k, []);
      result.get(k)!.push(a);
      usadas.add(a.id);
    }
  }

  const livresSalas = ordenados.filter(a => !usadas.has(a.id));
  let ptr = 0;
  for (const [k, membros] of grupos) {
    const atual = result.get(k) ?? [];
    let cap = atual.reduce((s, a) => s + a.max, 0);
    while (cap < membros.length && ptr < livresSalas.length) {
      const a = livresSalas[ptr++]!;
      atual.push(a);
      cap += a.max;
    }
    result.set(k, atual);
  }
  return result;
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

    const ocup = new Map<string, number>();
    for (const a of ordenados) ocup.set(a.id, travados.filter(p => p.alojamentoId === a.id).length);

    if (cfg.criterioAlojamento === "cargo" || cfg.criterioAlojamento === "cargo-turma") {
      const chave: (p: Pessoa) => string = cfg.criterioAlojamento === "cargo"
        ? p => p.cargo
        : p => `${p.cargo}|${p.turmaId ?? ""}`;
      const grupos = agruparPessoas(livres, chave);
      const salasPorGrupo = particionarSalas(ordenados, grupos, travados, chave);
      for (const [k, membros] of grupos) {
        alocarGrupo(membros, salasPorGrupo.get(k) ?? [], ocup, cfg);
      }
    } else {
      // "dividido" (padrão): um único grupo por sexo, espalhando ao máximo.
      alocarGrupo(livres, ordenados, ocup, cfg);
    }
  }

  return out;
}
