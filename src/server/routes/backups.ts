import type { FastifyPluginAsync } from "fastify";
import { readdir, copyFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { backup } from "../backup.js";

const dbPath = () => process.env.DB_PATH ?? resolve("data/db.json");

const backupsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    const dir = join(dirname(dbPath()), "backups");
    try {
      const files = await readdir(dir);
      const out = await Promise.all(
        files.filter(f => f.startsWith("db-")).map(async f => {
          const full = join(dir, f);
          const s = await stat(full);
          return { nome: f, tamanho: s.size, mtime: s.mtime.toISOString() };
        })
      );
      return out.sort((a, b) => b.mtime.localeCompare(a.mtime));
    } catch {
      return [];
    }
  });

  app.post("/", async () => {
    const path = await backup(dbPath());
    return { ok: true, path };
  });

  app.post<{ Body: { nome: string } }>("/restaurar", async (req, reply) => {
    const nome = String((req.body as any)?.nome ?? "");
    if (!nome.startsWith("db-") || nome.includes("/") || nome.includes("..")) {
      return reply.code(400).send({ error: "nome inválido" });
    }
    const src = join(dirname(dbPath()), "backups", nome);
    await backup(dbPath());
    await copyFile(src, dbPath());
    return { ok: true, msg: "Reinicie o servidor para carregar o backup restaurado." };
  });
};

export default backupsRoutes;
