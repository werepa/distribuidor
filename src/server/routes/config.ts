import type { FastifyPluginAsync } from "fastify";
import { ConfigSchema } from "../../shared/schemas.js";

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
};

export default configRoutes;
