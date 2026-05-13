import type { Pessoa, Turma, Config } from "../../shared/schemas.js";

type CargoKey = keyof Config["turmasPorCargo"];
const CARGOS: CargoKey[] = ["APF", "DPF", "EPF", "PCF", "PPF"];

export function distribuirTurmas(pessoas: Pessoa[], turmas: Turma[], cfg: Config): Pessoa[] {
  const out: Pessoa[] = pessoas.map(p => ({ ...p, lockManual: { ...p.lockManual } }));

  for (const cargo of CARGOS) {
    const turmasC = turmas.filter(t => t.cargo === cargo).sort((a, b) => a.numero - b.numero);
    if (turmasC.length === 0) {
      out.filter(p => p.cargo === cargo).forEach(p => { p.turmaId = undefined; });
      continue;
    }

    const doCargo = out.filter(p => p.cargo === cargo);
    const livres = doCargo.filter(p => !p.lockManual.turma);
    const travados = doCargo.filter(p => p.lockManual.turma);

    livres.forEach(p => { p.turmaId = undefined; });

    const total = doCargo.length;
    const n = turmasC.length;
    const base = Math.floor(total / n);
    const sobra = total - base * n;
    const cap: number[] = Array.from({ length: n }, () => base);
    if (sobra > 0) cap[n - 1] = base + sobra;

    const atual: number[] = Array.from({ length: n }, () => 0);
    for (const p of travados) {
      const idx = turmasC.findIndex(t => t.id === p.turmaId);
      if (idx >= 0) atual[idx]!++;
    }

    livres.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const bSJ = livres.filter(p => p.situacao === "SUB JUDICE");
    const bF = livres.filter(p => p.situacao !== "SUB JUDICE" && p.sexo === "F");
    const bRest = livres.filter(p => p.situacao !== "SUB JUDICE" && p.sexo === "M");

    const placeRR = (bucket: Pessoa[]) => {
      let i = 0;
      for (const p of bucket) {
        let tentativas = 0;
        while (tentativas < n && atual[i % n]! >= cap[i % n]!) { i++; tentativas++; }
        const slot = i % n;
        p.turmaId = turmasC[slot]!.id;
        atual[slot]!++;
        i++;
      }
    };

    placeRR(bSJ);
    placeRR(bF);

    if (cfg.criterioDistribuicao === "round-robin") {
      placeRR(bRest);
    } else {
      let slot = 0;
      for (const p of bRest) {
        while (slot < n && atual[slot]! >= cap[slot]!) slot++;
        if (slot >= n) slot = atual.findIndex((c, i) => c < cap[i]!);
        if (slot < 0) slot = 0;
        p.turmaId = turmasC[slot]!.id;
        atual[slot]!++;
      }
    }
  }

  return out;
}
