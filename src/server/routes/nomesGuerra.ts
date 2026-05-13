import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { gerarNomesGuerra } from "../domain/gerarNomesGuerra.js";

const PatchSchema = z.object({
  nomeGuerra: z.string().nullable(),
  lock: z.boolean().optional()
});

const nomesRoutes: FastifyPluginAsync = async (app) => {
  app.post("/gerar", async () => {
    app.db.data.pessoas = gerarNomesGuerra(app.db.data.pessoas, app.db.data.config);
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    app.db.data.historico.push({
      ts: new Date().toISOString(), acao: "gerar-nomes-guerra", detalhes: {}
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
    p.nomeGuerra = parsed.data.nomeGuerra ?? undefined;
    if (parsed.data.lock !== undefined) p.lockManual.nomeGuerra = parsed.data.lock;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return p;
  });
};

export default nomesRoutes;
