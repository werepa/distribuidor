import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { openDB } from "../src/server/db";
import alojamentosRoutes from "../src/server/routes/alojamentos";
import type { Pessoa } from "../src/shared/schemas";

async function buildApp(seed?: (db: any) => void) {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const db = await openDB(join(dir, "db.json"));
  if (seed) seed(db);
  await db.write();
  const app = Fastify();
  app.decorate("db", db);
  await app.register(alojamentosRoutes, { prefix: "/api/alojamentos" });
  return app;
}

const mkP = (n: string, sexo: "M" | "F" = "M"): Pessoa => ({
  id: uuid(), nome: n, cpf: "0", cargo: "APF", sexo, situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", lockManual: {}
});

describe("rotas /api/alojamentos", () => {
  it("GET / lista alojamentos persistidos", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 }];
    });
    const r = await app.inject({ method: "GET", url: "/api/alojamentos" });
    expect(r.json()).toHaveLength(1);
  });

  it("POST /distribuir aplica algoritmo", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 }];
      db.data.pessoas = [mkP("A"), mkP("B")];
    });
    const r = await app.inject({ method: "POST", url: "/api/alojamentos/distribuir" });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas.every(p => p.alojamentoId === "A 01")).toBe(true);
  });

  it("PATCH /pessoa/:id seta alojamentoId e lock", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [
        { id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 },
        { id: "A 02", bloco: "A", cargoSexo: "APF/M", max: 6 }
      ];
      db.data.pessoas = [mkP("A")];
    });
    const id = app.db.data.pessoas[0].id;
    const r = await app.inject({
      method: "PATCH", url: `/api/alojamentos/pessoa/${id}`,
      payload: { alojamentoId: "A 02", lock: true }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas[0].alojamentoId).toBe("A 02");
    expect(app.db.data.pessoas[0].lockManual.alojamento).toBe(true);
  });
});
