import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DBSchema, DEFAULT_CONFIG, type DB } from "../shared/schemas.js";

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
  const parsed = DBSchema.safeParse(db.data);
  if (!parsed.success) {
    throw new Error("db.json schema inválido: " + parsed.error.message);
  }
  db.data = parsed.data;
  await db.write();
  return db;
}
