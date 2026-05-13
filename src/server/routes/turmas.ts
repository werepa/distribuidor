import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { Cargo, type Turma } from "../../shared/schemas.js";
import { distribuirTurmas } from "../domain/distribuirTurmas.js";

function gerarTurmas(cfg: { turmasPorCargo: Record<string, number> }): Turma[] {
  const out: Turma[] = [];
  for (const cargo of Cargo.options) {
    const n = cfg.turmasPorCargo[cargo] ?? 0;
    for (let i = 1; i <= n; i++) {
      out.push({
        id: `${cargo}-${i}`,
        cargo,
        numero: i,
        label: `${cargo}-${String.fromCharCode(64 + i)}`
      });
    }
  }
  return out;
}

const PatchSchema = z.object({
  turmaId: z.string().nullable(),
  lock: z.boolean().optional()
});

const turmasRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => gerarTurmas(app.db.data.config));

  app.post("/distribuir", async () => {
    const turmas = gerarTurmas(app.db.data.config);
    app.db.data.turmas = turmas;
    app.db.data.pessoas = distribuirTurmas(app.db.data.pessoas, turmas, app.db.data.config);
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    app.db.data.historico.push({
      ts: new Date().toISOString(),
      acao: "distribuir-turmas",
      detalhes: { turmas: turmas.length }
    });
    await app.db.write();
    return { ok: true, turmas: turmas.length };
  });

  app.patch<{ Params: { id: string } }>("/pessoa/:id", async (req, reply) => {
    const parsed = PatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const i = app.db.data.pessoas.findIndex(p => p.id === req.params.id);
    if (i < 0) return reply.code(404).send({ error: "not found" });
    const p = app.db.data.pessoas[i]!;
    p.turmaId = parsed.data.turmaId ?? undefined;
    if (parsed.data.lock !== undefined) p.lockManual.turma = parsed.data.lock;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return p;
  });
};

export default turmasRoutes;
