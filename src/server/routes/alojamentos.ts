import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { distribuirAlojamentos } from "../domain/distribuirAlojamentos.js";
import { backup } from "../backup.js";
import type { Alojamento } from "../../shared/schemas.js";

const PatchSchema = z.object({
  alojamentoId: z.string().nullable(),
  lock: z.boolean().optional()
});

const SexoAloj = z.enum(["M", "F"]);
const CreateAlojSchema = z.object({
  id: z.string().min(1),
  sexo: SexoAloj,
  max: z.number().int().positive()
});
const UpdateAlojSchema = z.object({
  sexo: SexoAloj.optional(),
  max: z.number().int().positive().optional(),
  novoId: z.string().min(1).optional()
});

function blocoDe(id: string): string {
  return id.split(/\s+/)[0]?.trim() || id;
}

const alojamentosRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => app.db.data.alojamentos);

  app.post("/", async (req, reply) => {
    const parsed = CreateAlojSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { id, sexo, max } = parsed.data;
    if (app.db.data.alojamentos.some(a => a.id === id)) {
      return reply.code(409).send({ error: `alojamento ${id} já existe` });
    }
    const novo: Alojamento = { id, bloco: blocoDe(id), cargoSexo: sexo, max };
    app.db.data.alojamentos.push(novo);
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return reply.code(201).send(novo);
  });

  app.patch<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const parsed = UpdateAlojSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const a = app.db.data.alojamentos.find(x => x.id === req.params.id);
    if (!a) return reply.code(404).send({ error: "not found" });
    const { sexo, max, novoId } = parsed.data;
    if (novoId && novoId !== a.id) {
      if (app.db.data.alojamentos.some(x => x.id === novoId)) {
        return reply.code(409).send({ error: `alojamento ${novoId} já existe` });
      }
      const antigo = a.id;
      a.id = novoId;
      a.bloco = blocoDe(novoId);
      app.db.data.pessoas.forEach(p => { if (p.alojamentoId === antigo) p.alojamentoId = novoId; });
    }
    if (sexo !== undefined) a.cargoSexo = sexo;
    if (max !== undefined) a.max = max;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return a;
  });

  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const before = app.db.data.alojamentos.length;
    app.db.data.alojamentos = app.db.data.alojamentos.filter(a => a.id !== req.params.id);
    if (app.db.data.alojamentos.length === before) return reply.code(404).send({ error: "not found" });
    app.db.data.pessoas.forEach(p => { if (p.alojamentoId === req.params.id) p.alojamentoId = undefined; });
    if (process.env.NODE_ENV !== "test") await backup(process.env.DB_PATH ?? "data/db.json");
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return { ok: true };
  });

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
