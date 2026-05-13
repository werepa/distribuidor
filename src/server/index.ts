import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import multipart from "@fastify/multipart";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import open from "open";
import { openDB } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DB_PATH = process.env.DB_PATH ?? join(ROOT, "data", "db.json");
const PORT = Number(process.env.PORT ?? 5180);
const PORT_TRY = 10;
const IS_DEV = process.env.NODE_ENV !== "production";

async function main() {
  const app = Fastify({ logger: { level: "info" } });
  const db = await openDB(DB_PATH);
  app.decorate("db", db);

  // rotas REST registradas em tasks subsequentes
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
  app.register(import("./routes/importar.js"), { prefix: "/api/importar" });
  app.register(import("./routes/turmas.js"), { prefix: "/api/turmas" });
  app.register(import("./routes/pessoas.js"), { prefix: "/api/pessoas" });
  app.register(import("./routes/alojamentos.js"), { prefix: "/api/alojamentos" });
  app.register(import("./routes/nomesGuerra.js"), { prefix: "/api/nomes-guerra" });
  app.register(import("./routes/config.js"), { prefix: "/api/config" });
  app.register(import("./routes/backups.js"), { prefix: "/api/backups" });

  app.get("/api/health", async () => ({ ok: true, edicao: db.data.meta.edicao }));

  // Em produção, servir SPA buildada
  const webDist = join(ROOT, "dist-web");
  if (!IS_DEV && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: "/" });
    app.setNotFoundHandler((_req, reply) => reply.sendFile("index.html"));
  }

  let bound: number | null = null;
  for (let i = 0; i < PORT_TRY; i++) {
    const tentar = PORT + i;
    try {
      await app.listen({ port: tentar, host: "127.0.0.1" });
      bound = tentar;
      break;
    } catch (err: any) {
      if (err?.code !== "EADDRINUSE") throw err;
      app.log.warn(`porta ${tentar} ocupada, tentando ${tentar + 1}…`);
    }
  }
  if (bound === null) {
    throw new Error(`Nenhuma porta livre entre ${PORT} e ${PORT + PORT_TRY - 1}`);
  }
  app.log.info(`API em http://localhost:${bound}`);

  if (!IS_DEV) {
    await open(`http://localhost:${bound}`);
  } else {
    app.log.info("DEV: abra http://localhost:5173 (Vite) — API na porta " + bound);
  }
}

declare module "fastify" {
  interface FastifyInstance {
    db: Awaited<ReturnType<typeof openDB>>;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
