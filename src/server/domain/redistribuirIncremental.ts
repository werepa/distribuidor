import type { Pessoa, Turma, Alojamento, Config } from "../../shared/schemas.js";
import { distribuirTurmas } from "./distribuirTurmas.js";
import { distribuirAlojamentos } from "./distribuirAlojamentos.js";
import { gerarNomesGuerra } from "./gerarNomesGuerra.js";

export function redistribuirIncremental(
  nova: Pessoa,
  existentes: Pessoa[],
  turmas: Turma[],
  alojamentos: Alojamento[],
  cfg: Config
): Pessoa[] {
  const trav = existentes.map(p => ({
    ...p,
    lockManual: {
      ...p.lockManual,
      turma: p.turmaId !== undefined ? true : p.lockManual.turma,
      alojamento: p.alojamentoId !== undefined ? true : p.lockManual.alojamento,
      nomeGuerra: p.nomeGuerra !== undefined ? true : p.lockManual.nomeGuerra
    }
  }));
  let pool = [...trav, { ...nova, lockManual: { ...nova.lockManual } }];

  pool = distribuirTurmas(pool, turmas, cfg);
  pool = distribuirAlojamentos(pool, alojamentos, cfg);
  pool = gerarNomesGuerra(pool, cfg);

  return pool.map(p => {
    const orig = existentes.find(e => e.id === p.id);
    if (!orig) return p;
    return { ...p, lockManual: { ...orig.lockManual } };
  });
}
