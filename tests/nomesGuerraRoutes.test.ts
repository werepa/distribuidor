import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { openDB } from "../src/server/db";
import nomesRoutes from "../src/server/routes/nomesGuerra";
import type { Pessoa } from "../src/shared/schemas";

async function buildApp(seed?: (db: any) => void) {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const db = await openDB(join(dir, "db.json"));
  if (seed) seed(db);
  await db.write();
  const app = Fastify();
  app.decorate("db", db);
  await app.register(nomesRoutes, { prefix: "/api/nomes-guerra" });
  return app;
}

const mkP = (nome: string, turmaId = "APF-1"): Pessoa => ({
  id: uuid(), nome, cpf: "0", cargo: "APF", sexo: "M", situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", turmaId, lockManual: {}
});

describe("rotas /api/nomes-guerra", () => {
  it("POST /gerar preenche nomeGuerra das pessoas", async () => {
    const app = await buildApp(db => {
      db.data.pessoas = [mkP("MARIA SILVA"), mkP("JOAO COSTA")];
    });
    const r = await app.inject({ method: "POST", url: "/api/nomes-guerra/gerar" });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas.every(p => p.nomeGuerra)).toBe(true);
  });

  it("PATCH /pessoa/:id seta nomeGuerra e lock", async () => {
    const app = await buildApp(db => { db.data.pessoas = [mkP("X Y")]; });
    const id = app.db.data.pessoas[0].id;
    const r = await app.inject({
      method: "PATCH", url: `/api/nomes-guerra/pessoa/${id}`,
      payload: { nomeGuerra: "CHEFE", lock: true }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas[0].nomeGuerra).toBe("CHEFE");
    expect(app.db.data.pessoas[0].lockManual.nomeGuerra).toBe(true);
  });
});
