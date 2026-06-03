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

  it("POST / cria alojamento (cargoSexo = sexo, bloco derivado)", async () => {
    const app = await buildApp();
    const r = await app.inject({
      method: "POST", url: "/api/alojamentos",
      payload: { id: "A 01", sexo: "M", max: 6 }
    });
    expect(r.statusCode).toBe(201);
    expect(app.db.data.alojamentos).toHaveLength(1);
    const a = app.db.data.alojamentos[0];
    expect(a).toMatchObject({ id: "A 01", bloco: "A", cargoSexo: "M", max: 6 });
  });

  it("POST / rejeita id duplicado", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "M", max: 6 }];
    });
    const r = await app.inject({
      method: "POST", url: "/api/alojamentos",
      payload: { id: "A 01", sexo: "M", max: 4 }
    });
    expect(r.statusCode).toBe(409);
    expect(app.db.data.alojamentos).toHaveLength(1);
  });

  it("PATCH /:id altera sexo e capacidade", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "M", max: 6 }];
    });
    const r = await app.inject({
      method: "PATCH", url: `/api/alojamentos/${encodeURIComponent("A 01")}`,
      payload: { sexo: "F", max: 4 }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.alojamentos[0]).toMatchObject({ id: "A 01", cargoSexo: "F", max: 4 });
  });

  it("PATCH /:id renomeia id com cascata nas pessoas", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "M", max: 6 }];
      db.data.pessoas = [{ ...mkP("A"), alojamentoId: "A 01" }];
    });
    const r = await app.inject({
      method: "PATCH", url: `/api/alojamentos/${encodeURIComponent("A 01")}`,
      payload: { novoId: "B 02" }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.alojamentos[0]).toMatchObject({ id: "B 02", bloco: "B" });
    expect(app.db.data.pessoas[0].alojamentoId).toBe("B 02");
  });

  it("PATCH /:id rejeita renomear para id existente", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [
        { id: "A 01", bloco: "A", cargoSexo: "M", max: 6 },
        { id: "A 02", bloco: "A", cargoSexo: "M", max: 6 }
      ];
    });
    const r = await app.inject({
      method: "PATCH", url: `/api/alojamentos/${encodeURIComponent("A 01")}`,
      payload: { novoId: "A 02" }
    });
    expect(r.statusCode).toBe(409);
  });

  it("DELETE /:id remove e zera alojamentoId das pessoas", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "M", max: 6 }];
      db.data.pessoas = [{ ...mkP("A"), alojamentoId: "A 01" }];
    });
    const r = await app.inject({ method: "DELETE", url: `/api/alojamentos/${encodeURIComponent("A 01")}` });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.alojamentos).toHaveLength(0);
    expect(app.db.data.pessoas[0].alojamentoId).toBeUndefined();
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
