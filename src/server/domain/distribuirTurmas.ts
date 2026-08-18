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

    const n = turmasC.length;
    const capsConfig = cfg.turmasPorCargo[cargo] ?? [];
    const cap: number[] = Array.from({ length: n }, (_, i) => capsConfig[i] ?? 0);

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
        if (slot >= n) {
          const abaixoDaCapacidade = atual.findIndex((c, i) => c < cap[i]!);
          // todas as turmas já atingiram a capacidade configurada: a sobra vai para a última
          slot = abaixoDaCapacidade >= 0 ? abaixoDaCapacidade : n - 1;
        }
        p.turmaId = turmasC[slot]!.id;
        atual[slot]!++;
      }
    }
  }

  return out;
}
