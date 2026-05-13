import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { distribuirAlojamentos } from "../domain/distribuirAlojamentos.js";

const PatchSchema = z.object({
  alojamentoId: z.string().nullable(),
  lock: z.boolean().optional()
});

const alojamentosRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => app.db.data.alojamentos);

  app.post("/distribuir", async () => {
    app.db.data.pessoas = distribuirAlojamentos(
      app.db.data.pessoas,
      app.db.data.alojamentos,
      app.db.data.config
    );
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    app.db.data.historico.push({
      ts: new Date().toISOString(), acao: "distribuir-alojamentos", detalhes: {}
    });
    await app.db.write();
    return { ok: true };
  });

  app.patch<{ Params: { id: string } }>("/pessoa/:id", async (req, reply) => {
    const parsed = PatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const i = app.db.data.pessoas.findIndex(p => p.id === req.params.id);
    if (i < 0) return reply.code(404).send({ error: "not found" });
    const p = app.db.data.pessoas[i]!;
    p.alojamentoId = parsed.data.alojamentoId ?? undefined;
    if (parsed.data.lock !== undefined) p.lockManual.alojamento = parsed.data.lock;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return p;
  });
};

export default alojamentosRoutes;
