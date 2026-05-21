import type { FastifyPluginAsync } from "fastify";
import { resolve } from "node:path";
import { ConfigSchema, DEFAULT_CONFIG } from "../../shared/schemas.js";
import { backup } from "../backup.js";

const configRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => app.db.data.config);
  app.get("/meta", async () => app.db.data.meta);
  app.put("/", async (req, reply) => {
    const parsed = ConfigSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    app.db.data.config = parsed.data;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return { ok: true };
  });
  app.put<{ Body: { edicao: string } }>("/edicao", async (req, reply) => {
    const e = String((req.body as any)?.edicao ?? "").trim();
    if (!e) return reply.code(400).send({ error: "edicao obrigatória" });
    app.db.data.meta.edicao = e;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return { ok: true };
  });
  app.delete("/resetar", async () => {
    const dbPath = process.env.DB_PATH ?? resolve("data/db.json");
    if (process.env.NODE_ENV !== "test") await backup(dbPath);
    const now = new Date().toISOString();
    app.db.data.pessoas = [];
    app.db.data.turmas = [];
    app.db.data.alojamentos = [];
    app.db.data.historico = [{ ts: now, acao: "resetar-db", detalhes: {} }];
    app.db.data.config = DEFAULT_CONFIG;
    app.db.data.meta = { edicao: "CFP 2026", criadoEm: now, atualizadoEm: now };
    await app.db.write();
    return { ok: true };
  });
};

export default configRoutes;
