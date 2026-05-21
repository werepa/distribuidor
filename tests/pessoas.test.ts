import { describe, it, expect, beforeEach } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/server/db";
import pessoasRoutes from "../src/server/routes/pessoas";

async function buildApp() {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const app = Fastify();
  const db = await openDB(join(dir, "db.json"));
  app.decorate("db", db);
  await app.register(pessoasRoutes, { prefix: "/api/pessoas" });
  return app;
}

describe("rotas /api/pessoas", () => {
  it("GET vazio retorna []", async () => {
    const app = await buildApp();
    const r = await app.inject({ method: "GET", url: "/api/pessoas" });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
  });

  it("POST cria pessoa com id e criadoEm gerados", async () => {
    const app = await buildApp();
    const r = await app.inject({
      method: "POST", url: "/api/pessoas",
      payload: { nome: "X", cpf: "1", cargo: "APF", sexo: "M", situacao: "REGULAR", email: "x@y" }
    });
    expect(r.statusCode).toBe(201);
    const p = r.json();
    expect(p.id).toBeTruthy();
    expect(p.criadoEm).toBeTruthy();
    expect(p.lockManual).toEqual({});
  });

  it("PATCH atualiza campos válidos", async () => {
    const app = await buildApp();
    const c = await app.inject({
      method: "POST", url: "/api/pessoas",
      payload: { nome: "X", cpf: "1", cargo: "APF", sexo: "M", situacao: "REGULAR", email: "x@y" }
    });
    const id = c.json().id;
    const r = await app.inject({
      method: "PATCH", url: `/api/pessoas/${id}`,
      payload: { nome: "Y" }
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().nome).toBe("Y");
  });

  it("DELETE remove", async () => {
    const app = await buildApp();
    const c = await app.inject({
      method: "POST", url: "/api/pessoas",
      payload: { nome: "X", cpf: "1", cargo: "APF", sexo: "M", situacao: "REGULAR", email: "x@y" }
    });
    const id = c.json().id;
    const r = await app.inject({ method: "DELETE", url: `/api/pessoas/${id}` });
    expect(r.statusCode).toBe(200);
    const list = await app.inject({ method: "GET", url: "/api/pessoas" });
    expect(list.json()).toEqual([]);
  });

  it("POST rejeita payload inválido (400)", async () => {
    const app = await buildApp();
    const r = await app.inject({
      method: "POST", url: "/api/pessoas",
      payload: { nome: "X" }
    });
    expect(r.statusCode).toBe(400);
  });

  it("POST aplica redistribuicao incremental quando há turmas", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "cfp-"));
    const Fastify = (await import("fastify")).default;
    const { openDB } = await import("../src/server/db");
    const pessoasRoutes = (await import("../src/server/routes/pessoas")).default;
    const app = Fastify();
    const db = await openDB(join(dir, "db.json"));
    db.data.turmas = [{ id: "APF-1", cargo: "APF", numero: 1, label: "APF-A" }];
    await db.write();
    app.decorate("db", db);
    await app.register(pessoasRoutes, { prefix: "/api/pessoas" });
    const r = await app.inject({
      method: "POST", url: "/api/pessoas",
      payload: { nome: "X Y", cpf: "1", cargo: "APF", sexo: "M", situacao: "REGULAR", email: "x@y" }
    });
    expect(r.statusCode).toBe(201);
    expect(r.json().turmaId).toBe("APF-1");
  });
});
