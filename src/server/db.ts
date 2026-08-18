import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DBSchema, DEFAULT_CONFIG, type DB } from "../shared/schemas.js";

const CAPACIDADE_PADRAO_MIGRACAO = 30;

// migra turmasPorCargo do formato antigo (nº de turmas por cargo) para o
// novo formato (capacidade de cada turma), semeando a partir da ocupação
// atual das turmas já existentes.
function migrarTurmasPorCargo(data: any): void {
  const tpc = data?.config?.turmasPorCargo;
  if (!tpc) return;
  for (const cargo of Object.keys(tpc)) {
    const valor = tpc[cargo];
    if (typeof valor !== "number") continue;
    const turmasDoCargo = (data.turmas ?? [])
      .filter((t: any) => t.cargo === cargo)
      .sort((a: any, b: any) => a.numero - b.numero);
    const caps: number[] = [];
    for (let i = 0; i < valor; i++) {
      const turma = turmasDoCargo[i];
      const ocupacao = turma
        ? (data.pessoas ?? []).filter((p: any) => p.turmaId === turma.id).length
        : 0;
      caps.push(ocupacao > 0 ? ocupacao : CAPACIDADE_PADRAO_MIGRACAO);
    }
    tpc[cargo] = caps;
  }
}

export async function openDB(path: string): Promise<Low<DB>> {
  await mkdir(dirname(path), { recursive: true });
  const adapter = new JSONFile<DB>(path);
  const now = new Date().toISOString();
  const defaults: DB = {
    version: 1,
    meta: { edicao: "CFP 2026", criadoEm: now, atualizadoEm: now },
    config: DEFAULT_CONFIG,
    alojamentos: [],
    pessoas: [],
    turmas: [],
    historico: []
  };
  const db = new Low<DB>(adapter, defaults);
  await db.read();
  if (!db.data) db.data = defaults;
  migrarTurmasPorCargo(db.data);
  const parsed = DBSchema.safeParse(db.data);
  if (!parsed.success) {
    throw new Error("db.json schema inválido: " + parsed.error.message);
  }
  db.data = parsed.data;
  await db.write();
  return db;
}
