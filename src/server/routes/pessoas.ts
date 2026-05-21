import type { FastifyPluginAsync } from "fastify";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { PessoaSchema, type Pessoa } from "../../shared/schemas.js";
import { backup } from "../backup.js";
import { redistribuirIncremental } from "../domain/redistribuirIncremental.js";

const CreateSchema = PessoaSchema.omit({ id: true, criadoEm: true, lockManual: true });
const UpdateSchema = PessoaSchema.partial().omit({ id: true, criadoEm: true });

const pessoasRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => app.db.data.pessoas);

  app.post("/", async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const novo: Pessoa = {
      ...parsed.data,
      id: uuid(),
      criadoEm: new Date().toISOString(),
      lockManual: {}
    };
    if (app.db.data.turmas.length > 0 || app.db.data.alojamentos.length > 0) {
      app.db.data.pessoas = redistribuirIncremental(
        novo,
        app.db.data.pessoas,
        app.db.data.turmas,
        app.db.data.alojamentos,
        app.db.data.config
      );
    } else {
      app.db.data.pessoas.push(novo);
    }
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    app.db.data.historico.push({
      ts: new Date().toISOString(), acao: "criar-pessoa-incremental", detalhes: { id: novo.id }
    });
    await app.db.write();
    const final = app.db.data.pessoas.find(p => p.id === novo.id)!;
    return reply.code(201).send(final);
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const i = app.db.data.pessoas.findIndex(p => p.id === req.params.id);
    if (i < 0) return reply.code(404).send({ error: "not found" });
    app.db.data.pessoas[i] = { ...app.db.data.pessoas[i]!, ...parsed.data };
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return app.db.data.pessoas[i];
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const before = app.db.data.pessoas.length;
    app.db.data.pessoas = app.db.data.pessoas.filter(p => p.id !== req.params.id);
    if (app.db.data.pessoas.length === before) return reply.code(404).send({ error: "not found" });
    if (process.env.NODE_ENV !== "test") await backup(process.env.DB_PATH ?? "data/db.json");
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return { ok: true };
  });
};

export default pessoasRoutes;
