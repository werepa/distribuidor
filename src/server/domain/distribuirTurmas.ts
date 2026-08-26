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

    const bF = livres.filter(p => p.sexo === "F");
    const bM = livres.filter(p => p.sexo === "M");

    const splitPairs = (bucket: Pessoa[]): { pares: [Pessoa, Pessoa][]; sobra: Pessoa | undefined } => {
      const pares: [Pessoa, Pessoa][] = [];
      for (let i = 0; i + 1 < bucket.length; i += 2) pares.push([bucket[i]!, bucket[i + 1]!]);
      const sobra = bucket.length % 2 === 1 ? bucket[bucket.length - 1] : undefined;
      return { pares, sobra };
    };

    const restante = (i: number) => cap[i]! - atual[i]!;

    const overflowTarget = (): number => {
      for (let i = n - 1; i >= 0; i--) if (restante(i) > 0) return i;
      return n - 1;
    };

    const placePares = (pares: [Pessoa, Pessoa][]) => {
      if (pares.length === 0) return;

      if (cfg.criterioDistribuicao === "round-robin") {
        let i = 0;
        for (const [p1, p2] of pares) {
          let tentativas = 0;
          while (tentativas < n && restante(i % n) < 2) { i++; tentativas++; }
          const slot = tentativas < n ? i % n : overflowTarget();
          p1.turmaId = turmasC[slot]!.id;
          p2.turmaId = turmasC[slot]!.id;
          atual[slot]! += 2;
          i++;
        }
      } else {
        let cur = 0;
        for (const [p1, p2] of pares) {
          while (cur < n && restante(cur) < 2) cur++;
          const slot = cur < n ? cur : overflowTarget();
          p1.turmaId = turmasC[slot]!.id;
          p2.turmaId = turmasC[slot]!.id;
          atual[slot]! += 2;
        }
      }
    };

    const { pares: paresF, sobra: sobraF } = splitPairs(bF);
    const { pares: paresM, sobra: sobraM } = splitPairs(bM);

    placePares(paresF);
    placePares(paresM);

    if (sobraF || sobraM) {
      const slot = overflowTarget();
      if (sobraF) { sobraF.turmaId = turmasC[slot]!.id; atual[slot]!++; }
      if (sobraM) { sobraM.turmaId = turmasC[slot]!.id; atual[slot]!++; }
    }
  }

  return out;
}
