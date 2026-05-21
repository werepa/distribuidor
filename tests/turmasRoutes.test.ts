import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { openDB } from "../src/server/db";
import turmasRoutes from "../src/server/routes/turmas";
import type { Pessoa } from "../src/shared/schemas";

async function buildApp(seed?: (db: any) => void) {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const db = await openDB(join(dir, "db.json"));
  if (seed) seed(db);
  await db.write();
  const app = Fastify();
  app.decorate("db", db);
  await app.register(turmasRoutes, { prefix: "/api/turmas" });
  return app;
}

const mkP = (n: string, extra: Partial<Pessoa> = {}): Pessoa => ({
  id: uuid(), nome: n, cpf: "0", cargo: "APF", sexo: "M", situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", lockManual: {}, ...extra
});

describe("rotas /api/turmas", () => {
  it("GET / lista turmas geradas pela config", async () => {
    const app = await buildApp(db => {
      db.data.config.turmasPorCargo = { APF: 2, DPF: 1, EPF: 0, PCF: 0, PPF: 0 };
    });
    const r = await app.inject({ method: "GET", url: "/api/turmas" });
    expect(r.statusCode).toBe(200);
    const list = r.json();
    expect(list).toHaveLength(3);
    expect(list.map((t: any) => t.label).sort()).toEqual(["APF-A", "APF-B", "DPF-A"]);
  });

  it("POST /distribuir aplica algoritmo e persiste turmaId em pessoas", async () => {
    const app = await buildApp(db => {
      db.data.config.turmasPorCargo = { APF: 2, DPF: 0, EPF: 0, PCF: 0, PPF: 0 };
      db.data.pessoas = [mkP("A"), mkP("B"), mkP("C"), mkP("D")];
    });
    const r = await app.inject({ method: "POST", url: "/api/turmas/distribuir" });
    expect(r.statusCode).toBe(200);
    const ps = app.db.data.pessoas;
    expect(ps.every(p => p.turmaId)).toBe(true);
  });

  it("PATCH /pessoa/:id/turma seta turmaId e lockManual.turma=true", async () => {
    const app = await buildApp(db => {
      db.data.config.turmasPorCargo = { APF: 2, DPF: 0, EPF: 0, PCF: 0, PPF: 0 };
      db.data.pessoas = [mkP("A")];
    });
    const id = app.db.data.pessoas[0].id;
    const turmas = (await app.inject({ method: "GET", url: "/api/turmas" })).json();
    const tApfB = turmas.find((t: any) => t.label === "APF-B").id;
    const r = await app.inject({
      method: "PATCH", url: `/api/turmas/pessoa/${id}`,
      payload: { turmaId: tApfB, lock: true }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas[0].turmaId).toBe(tApfB);
    expect(app.db.data.pessoas[0].lockManual.turma).toBe(true);
  });
});
