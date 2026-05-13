# Distribuidor CFP — Plano 1: Fundação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estabelecer o esqueleto do app (Vite+React+Fastify+lowdb+TS), modelo de dados validado por zod, importação de pessoas a partir de `.xlsm` e tela de Pessoas com CRUD/filtros/export.

**Architecture:** Monorepo simples. Servidor Fastify único processo serve a SPA (build do Vite em produção, proxy em dev) e expõe REST em `/api/*`. lowdb sobre `data/db.json`. Schemas zod compartilhados front/back via `src/shared/`. Algoritmos puros virão nos planos seguintes.

**Tech Stack:** Node 20+, TypeScript 5, Vite 5, React 18, Fastify 4, lowdb 7, zod 3, TailwindCSS 3, shadcn/ui, xlsx (SheetJS), vitest 1, dnd-kit (instalado mas usado a partir do P2).

---

## Estrutura de arquivos criada neste plano

```
planilha/
├── package.json
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── data/                              # criado em runtime, gitignored
├── public/logo.png                    # já existe
├── src/
│   ├── shared/
│   │   └── schemas.ts                 # zod
│   ├── server/
│   │   ├── index.ts                   # bootstrap Fastify + abre browser
│   │   ├── db.ts                      # lowdb singleton
│   │   ├── backup.ts                  # rotação
│   │   └── routes/
│   │       ├── pessoas.ts
│   │       └── importar.ts
│   └── web/
│       ├── main.tsx
│       ├── index.css
│       ├── App.tsx
│       ├── api.ts
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   └── ui/                    # shadcn components instalados aqui
│       └── pages/
│           ├── Dashboard.tsx          # placeholder até P3
│           ├── Pessoas.tsx
│           ├── Turmas.tsx             # placeholder até P2
│           ├── Alojamentos.tsx        # placeholder até P2
│           ├── NomesGuerra.tsx        # placeholder até P3
│           ├── Configuracao.tsx       # placeholder até P3
│           └── Backups.tsx            # placeholder até P3
└── tests/
    ├── schemas.test.ts
    ├── db.test.ts
    ├── importar.test.ts
    └── pessoas.test.ts
```

---

### Task 1: Inicializar projeto e instalar dependências

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.server.json`, `.nvmrc`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "distribuidor-cfp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "concurrently -k -n SRV,WEB \"npm:dev:server\" \"npm:dev:web\"",
    "dev:server": "tsx watch src/server/index.ts",
    "dev:web": "vite",
    "build": "vite build && tsc -p tsconfig.server.json",
    "start": "node --enable-source-maps dist-server/server/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@fastify/static": "^7.0.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "fastify": "^4.26.0",
    "lowdb": "^7.0.1",
    "lucide-react": "^0.344.0",
    "open": "^10.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "tailwind-merge": "^2.2.0",
    "uuid": "^9.0.1",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.7",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "concurrently": "^8.2.2",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0",
    "vitest": "^1.2.0"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 2: Criar `tsconfig.json` (frontend + shared)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/web/*"],
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src/web", "src/shared", "tests"]
}
```

- [ ] **Step 3: Criar `tsconfig.server.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist-server",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src/server", "src/shared"]
}
```

- [ ] **Step 4: Criar `.nvmrc`**

Conteúdo: `20`

- [ ] **Step 5: Instalar dependências**

Run: `npm install`
Expected: instala sem erros, gera `package-lock.json` e `node_modules/`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.server.json .nvmrc
git commit -m "chore: scaffold projeto com toolchain TS+Vite+Fastify"
```

---

### Task 2: Configurar Vite, Tailwind e PostCSS

**Files:**
- Create: `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/web/main.tsx`, `src/web/index.css`, `src/web/App.tsx`

- [ ] **Step 1: Criar `vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: ".",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/web"),
      "@shared": path.resolve(__dirname, "src/shared")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5174"
    }
  },
  build: {
    outDir: "dist-web",
    emptyOutDir: true
  }
});
```

- [ ] **Step 2: Criar `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/web/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
} satisfies Config;
```

- [ ] **Step 3: Criar `postcss.config.js`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 4: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/logo.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Distribuidor CFP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/web/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Criar `src/web/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { @apply bg-slate-50 text-slate-900 font-sans antialiased; }
```

- [ ] **Step 6: Criar `src/web/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 7: Criar `src/web/App.tsx` (esqueleto, sem rotas ainda)**

```tsx
export default function App() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-slate-500">Distribuidor CFP — em construção</p>
    </div>
  );
}
```

- [ ] **Step 8: Verificar dev**

Run: `npx vite`
Expected: servidor inicia em `http://localhost:5173`, página exibe "Distribuidor CFP — em construção". Encerre com Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add vite.config.ts tailwind.config.ts postcss.config.js index.html src/web
git commit -m "chore: configurar Vite + Tailwind + esqueleto React"
```

---

### Task 3: Schemas zod compartilhados (TDD)

**Files:**
- Create: `src/shared/schemas.ts`
- Test: `tests/schemas.test.ts`

- [ ] **Step 1: Escrever teste falhando**

`tests/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  PessoaSchema,
  AlojamentoSchema,
  TurmaSchema,
  ConfigSchema,
  DBSchema,
  Cargo,
  Sexo,
  Situacao
} from "../src/shared/schemas";

describe("PessoaSchema", () => {
  it("aceita pessoa válida com mínimos obrigatórios", () => {
    const r = PessoaSchema.safeParse({
      id: "p1",
      nome: "FULANO DE TAL",
      cpf: "000.000.000-00",
      cargo: "APF",
      sexo: "M",
      situacao: "REGULAR",
      email: "f@x",
      criadoEm: "2026-05-13T00:00:00Z",
      lockManual: {}
    });
    expect(r.success).toBe(true);
  });
  it("rejeita cargo inválido", () => {
    const r = PessoaSchema.safeParse({
      id: "p1", nome: "X", cpf: "0", cargo: "XXX", sexo: "M",
      situacao: "REGULAR", email: "f@x",
      criadoEm: "2026-05-13T00:00:00Z", lockManual: {}
    });
    expect(r.success).toBe(false);
  });
});

describe("DBSchema", () => {
  it("valida estrutura mínima vazia", () => {
    const r = DBSchema.safeParse({
      version: 1,
      meta: { edicao: "CFP 2026", criadoEm: "2026-05-13T00:00:00Z", atualizadoEm: "2026-05-13T00:00:00Z" },
      config: {
        turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
        criterioDistribuicao: "completar",
        folgaAlojamento: 0.15,
        normalizacoesFoneticas: [],
        stopWordsNomeGuerra: ["DE","DI","DO","DOS","E","D","SAO"]
      },
      alojamentos: [],
      pessoas: [],
      turmas: [],
      historico: []
    });
    expect(r.success).toBe(true);
  });
});

describe("Enums exportados", () => {
  it("Cargo, Sexo, Situacao acessíveis", () => {
    expect(Cargo.options).toContain("APF");
    expect(Sexo.options).toContain("F");
    expect(Situacao.options).toContain("SUB JUDICE");
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar (módulo inexistente)**

Run: `npx vitest run tests/schemas.test.ts`
Expected: FAIL — não consegue resolver `../src/shared/schemas`.

- [ ] **Step 3: Implementar `src/shared/schemas.ts`**

```ts
import { z } from "zod";

export const Cargo = z.enum(["APF", "DPF", "EPF", "PCF", "PPF"]);
export const Sexo = z.enum(["M", "F"]);
export const Situacao = z.enum(["REGULAR", "SUB JUDICE", "ESPECIAL"]);
export const Criterio = z.enum(["completar", "round-robin"]);

export const LockManualSchema = z.object({
  turma: z.boolean().optional(),
  alojamento: z.boolean().optional(),
  nomeGuerra: z.boolean().optional()
});

export const PessoaSchema = z.object({
  id: z.string().min(1),
  nome: z.string().min(1),
  cpf: z.string().min(1),
  cargo: Cargo,
  sexo: Sexo,
  situacao: Situacao,
  email: z.string().min(1),
  dataNascimento: z.string().optional(),
  fatoRH: z.string().optional(),
  tipoSanguineo: z.string().optional(),
  dddTelefoneFixo: z.string().optional(),
  numTelefoneFixo: z.string().optional(),
  dddCel: z.string().optional(),
  celular: z.string().optional(),
  curso: z.string().optional(),
  turmaId: z.string().optional(),
  alojamentoId: z.string().optional(),
  nomeGuerra: z.string().optional(),
  criadoEm: z.string(),
  lockManual: LockManualSchema
});

export const TurmaSchema = z.object({
  id: z.string().min(1),
  cargo: Cargo,
  numero: z.number().int().positive(),
  label: z.string().min(1)
});

export const AlojamentoSchema = z.object({
  id: z.string().min(1),
  bloco: z.string().min(1),
  cargoSexo: z.string().min(1),
  max: z.number().int().positive()
});

export const ConfigSchema = z.object({
  turmasPorCargo: z.object({
    APF: z.number().int().nonnegative(),
    DPF: z.number().int().nonnegative(),
    EPF: z.number().int().nonnegative(),
    PCF: z.number().int().nonnegative(),
    PPF: z.number().int().nonnegative()
  }),
  criterioDistribuicao: Criterio,
  folgaAlojamento: z.number().min(0).max(0.9),
  normalizacoesFoneticas: z.array(z.object({ de: z.string(), para: z.string() })),
  stopWordsNomeGuerra: z.array(z.string())
});

export const MetaSchema = z.object({
  edicao: z.string().min(1),
  criadoEm: z.string(),
  atualizadoEm: z.string()
});

export const HistoricoEntrySchema = z.object({
  ts: z.string(),
  acao: z.string(),
  detalhes: z.unknown()
});

export const DBSchema = z.object({
  version: z.literal(1),
  meta: MetaSchema,
  config: ConfigSchema,
  alojamentos: z.array(AlojamentoSchema),
  pessoas: z.array(PessoaSchema),
  turmas: z.array(TurmaSchema),
  historico: z.array(HistoricoEntrySchema)
});

export type Pessoa = z.infer<typeof PessoaSchema>;
export type Turma = z.infer<typeof TurmaSchema>;
export type Alojamento = z.infer<typeof AlojamentoSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type DB = z.infer<typeof DBSchema>;
export type Meta = z.infer<typeof MetaSchema>;

export const DEFAULT_CONFIG: Config = {
  turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [
    { de: "TH", para: "T" },
    { de: "LL", para: "L" },
    { de: "CC", para: "C" },
    { de: "NN", para: "N" },
    { de: "PH", para: "F" },
    { de: "LUIZ", para: "LUIS" },
    { de: "SOUZA", para: "SOUSA" },
    { de: "RACHEL", para: "RAQUEL" },
    { de: "VICTOR", para: "VITOR" }
  ],
  stopWordsNomeGuerra: ["DE", "DI", "DO", "DOS", "E", "D", "SAO"]
};
```

- [ ] **Step 4: Rodar testes — devem passar**

Run: `npx vitest run tests/schemas.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/shared/schemas.ts tests/schemas.test.ts
git commit -m "feat(shared): schemas zod e tipos do dominio"
```

---

### Task 4: Singleton lowdb e bootstrap do `db.json` (TDD)

**Files:**
- Create: `src/server/db.ts`, `src/server/backup.ts`
- Test: `tests/db.test.ts`

- [ ] **Step 1: Escrever teste**

`tests/db.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDB } from "../src/server/db";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cfp-"));
});

describe("openDB", () => {
  it("cria db.json com defaults se não existe", async () => {
    const db = await openDB(join(dir, "db.json"));
    expect(db.data.version).toBe(1);
    expect(db.data.pessoas).toEqual([]);
    expect(db.data.config.folgaAlojamento).toBe(0.15);
    expect(existsSync(join(dir, "db.json"))).toBe(true);
  });

  it("re-abre preservando dados", async () => {
    const path = join(dir, "db.json");
    const a = await openDB(path);
    a.data.meta.edicao = "TESTE";
    await a.write();
    const b = await openDB(path);
    expect(b.data.meta.edicao).toBe("TESTE");
  });

  it("rejeita JSON com schema inválido", async () => {
    const path = join(dir, "db.json");
    require("node:fs").writeFileSync(path, JSON.stringify({ version: 1 }));
    await expect(openDB(path)).rejects.toThrow(/schema/i);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/db.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/db.ts`**

```ts
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DBSchema, DEFAULT_CONFIG, type DB } from "../shared/schemas.js";

export async function openDB(path: string): Promise<Low<DB>> {
  await mkdir(dirname(path), { recursive: true });
  const adapter = new JSONFile<DB>(path);
  const now = new Date().toISOString();
  const defaults: DB = {
    version: 1,
    meta: { edicao: "CFP 2026", criadoEm: now, atualizadoEm: now },
    config: DEFAULT_CONFIG,
    alojamentos: [],
    pessoas: [],
    turmas: [],
    historico: []
  };
  const db = new Low<DB>(adapter, defaults);
  await db.read();
  if (!db.data) db.data = defaults;
  const parsed = DBSchema.safeParse(db.data);
  if (!parsed.success) {
    throw new Error("db.json schema inválido: " + parsed.error.message);
  }
  db.data = parsed.data;
  await db.write();
  return db;
}
```

- [ ] **Step 4: Implementar `src/server/backup.ts`**

```ts
import { copyFile, mkdir, readdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

const KEEP = 10;

export async function backup(dbPath: string): Promise<string> {
  const dir = join(dirname(dbPath), "backups");
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = join(dir, `db-${stamp}.json`);
  await copyFile(dbPath, target);
  await rotate(dir);
  return target;
}

async function rotate(dir: string) {
  const files = (await readdir(dir)).filter(f => f.startsWith("db-")).sort();
  while (files.length > KEEP) {
    const old = files.shift()!;
    await unlink(join(dir, old));
  }
}
```

- [ ] **Step 5: Rodar testes — devem passar**

Run: `npx vitest run tests/db.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/server/db.ts src/server/backup.ts tests/db.test.ts
git commit -m "feat(server): lowdb singleton com validacao zod e backups"
```

---

### Task 5: Bootstrap do servidor Fastify

**Files:**
- Create: `src/server/index.ts`

- [ ] **Step 1: Implementar `src/server/index.ts`**

```ts
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import open from "open";
import { openDB } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const DB_PATH = process.env.DB_PATH ?? join(ROOT, "data", "db.json");
const PORT = Number(process.env.PORT ?? 5174);
const IS_DEV = process.env.NODE_ENV !== "production";

async function main() {
  const app = Fastify({ logger: { level: "info" } });
  const db = await openDB(DB_PATH);
  app.decorate("db", db);

  // rotas REST registradas em tasks subsequentes
  // app.register(import("./routes/pessoas.js"), { prefix: "/api/pessoas" });
  // app.register(import("./routes/importar.js"), { prefix: "/api/importar" });

  app.get("/api/health", async () => ({ ok: true, edicao: db.data.meta.edicao }));

  // Em produção, servir SPA buildada
  const webDist = join(ROOT, "dist-web");
  if (!IS_DEV && existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: "/" });
    app.setNotFoundHandler((_req, reply) => reply.sendFile("index.html"));
  }

  await app.listen({ port: PORT, host: "127.0.0.1" });
  app.log.info(`API em http://localhost:${PORT}`);

  if (!IS_DEV) {
    await open(`http://localhost:${PORT}`);
  } else {
    app.log.info("DEV: abra http://localhost:5173 (Vite)");
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
```

- [ ] **Step 2: Verificar startup do servidor**

Run em terminal 1: `npx tsx src/server/index.ts`
Expected: log "API em http://localhost:5174", arquivo `data/db.json` é criado.

Run em terminal 2: `curl -s http://localhost:5174/api/health`
Expected: `{"ok":true,"edicao":"CFP 2026"}`

Encerre o servidor.

- [ ] **Step 3: Verificar comando `npm run dev`**

Run: `npm run dev`
Expected: ambos servidor (porta 5174) e Vite (5173) sobem; navegador em `http://localhost:5173` mostra a página esqueleto. Encerre com Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/server/index.ts
git commit -m "feat(server): bootstrap Fastify com SPA serving e dev proxy"
```

---

### Task 6: Layout principal com sidebar e rotas placeholder

**Files:**
- Create: `src/web/components/Sidebar.tsx`, `src/web/pages/Dashboard.tsx`, `src/web/pages/Pessoas.tsx`, `src/web/pages/Turmas.tsx`, `src/web/pages/Alojamentos.tsx`, `src/web/pages/NomesGuerra.tsx`, `src/web/pages/Configuracao.tsx`, `src/web/pages/Backups.tsx`
- Modify: `src/web/App.tsx`

- [ ] **Step 1: Criar `src/web/components/Sidebar.tsx`**

```tsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, Home, Tag, Settings, Save
} from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pessoas", label: "Pessoas", icon: Users },
  { to: "/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/alojamentos", label: "Alojamentos", icon: Home },
  { to: "/nomes", label: "Nomes de guerra", icon: Tag },
  { to: "/config", label: "Configuração", icon: Settings },
  { to: "/backups", label: "Backups", icon: Save }
];

export function Sidebar() {
  return (
    <aside className="w-52 bg-slate-900 text-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-6">
        <img src="/logo.png" alt="logo" className="h-10 w-10 object-contain" />
        <span className="font-semibold text-white">Distribuidor CFP</span>
      </div>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800"
            }`
          }
        >
          <Icon size={16} /> {label}
        </NavLink>
      ))}
    </aside>
  );
}
```

- [ ] **Step 2: Criar páginas placeholder**

Para cada uma das 7 páginas, criar arquivo simples. Conteúdo de `src/web/pages/Dashboard.tsx`:

```tsx
export default function Dashboard() {
  return <div className="p-6"><h1 className="text-2xl font-semibold">Dashboard</h1><p className="text-slate-500 mt-2">Em construção (Plano 3).</p></div>;
}
```

Repetir o padrão para `Pessoas.tsx`, `Turmas.tsx`, `Alojamentos.tsx`, `NomesGuerra.tsx`, `Configuracao.tsx`, `Backups.tsx`, ajustando título e nota correspondente:

- `Pessoas.tsx` — "Pessoas" — "Em construção (será preenchido nas próximas tarefas deste plano)."
- `Turmas.tsx` — "Turmas" — "Em construção (Plano 2)."
- `Alojamentos.tsx` — "Alojamentos" — "Em construção (Plano 2)."
- `NomesGuerra.tsx` — "Nomes de guerra" — "Em construção (Plano 3)."
- `Configuracao.tsx` — "Configuração" — "Em construção (Plano 3)."
- `Backups.tsx` — "Backups" — "Em construção (Plano 3)."

- [ ] **Step 3: Atualizar `src/web/App.tsx` para rotear**

```tsx
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Pessoas from "./pages/Pessoas";
import Turmas from "./pages/Turmas";
import Alojamentos from "./pages/Alojamentos";
import NomesGuerra from "./pages/NomesGuerra";
import Configuracao from "./pages/Configuracao";
import Backups from "./pages/Backups";

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/turmas" element={<Turmas />} />
          <Route path="/alojamentos" element={<Alojamentos />} />
          <Route path="/nomes" element={<NomesGuerra />} />
          <Route path="/config" element={<Configuracao />} />
          <Route path="/backups" element={<Backups />} />
        </Routes>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Servir `logo.png` no Vite**

Mover (ou copiar) `logo.png` da raiz para `public/logo.png`:

Run: `mkdir -p public && cp logo.png public/logo.png`

- [ ] **Step 5: Verificar visual**

Run: `npm run dev` e abra `http://localhost:5173`.
Expected: sidebar à esquerda com logo e 7 itens; clicar em cada um navega para o placeholder.

- [ ] **Step 6: Commit**

```bash
git add src/web public/logo.png
git commit -m "feat(web): layout com sidebar, roteamento e paginas placeholder"
```

---

### Task 7: Cliente API tipado no front

**Files:**
- Create: `src/web/api.ts`

- [ ] **Step 1: Implementar `src/web/api.ts`**

```ts
import type { Pessoa } from "@shared/schemas";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export const api = {
  health: () => req<{ ok: boolean; edicao: string }>("/health"),

  pessoas: {
    list: () => req<Pessoa[]>("/pessoas"),
    create: (p: Omit<Pessoa, "id" | "criadoEm" | "lockManual">) =>
      req<Pessoa>("/pessoas", { method: "POST", body: JSON.stringify(p) }),
    update: (id: string, patch: Partial<Pessoa>) =>
      req<Pessoa>(`/pessoas/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id: string) =>
      req<{ ok: true }>(`/pessoas/${id}`, { method: "DELETE" })
  },

  importar: {
    xlsm: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return fetch(`${BASE}/importar/xlsm`, { method: "POST", body: fd })
        .then(r => r.ok ? r.json() : r.text().then(t => Promise.reject(new Error(t))))
        as Promise<{ inseridos: number; ignorados: number; erros: string[] }>;
    }
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/web/api.ts
git commit -m "feat(web): cliente API tipado"
```

---

### Task 8: Rotas REST de pessoas (TDD)

**Files:**
- Create: `src/server/routes/pessoas.ts`
- Modify: `src/server/index.ts`
- Test: `tests/pessoas.test.ts`

- [ ] **Step 1: Escrever teste**

`tests/pessoas.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/pessoas.test.ts`
Expected: FAIL — módulo de rotas inexistente.

- [ ] **Step 3: Implementar `src/server/routes/pessoas.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { PessoaSchema, type Pessoa } from "../../shared/schemas.js";
import { backup } from "../backup.js";

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
    app.db.data.pessoas.push(novo);
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    await app.db.write();
    return reply.code(201).send(novo);
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
```

- [ ] **Step 4: Registrar no `src/server/index.ts`**

Substituir o comentário `// app.register(import("./routes/pessoas.js")...` por:

```ts
app.register(import("./routes/pessoas.js"), { prefix: "/api/pessoas" });
```

- [ ] **Step 5: Rodar testes — devem passar**

Run: `npx vitest run tests/pessoas.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/pessoas.ts src/server/index.ts tests/pessoas.test.ts
git commit -m "feat(api): CRUD pessoas com validacao zod"
```

---

### Task 9: Rota de import xlsm (TDD)

**Files:**
- Create: `src/server/routes/importar.ts`
- Modify: `src/server/index.ts`, `package.json` (adicionar `@fastify/multipart`)
- Test: `tests/importar.test.ts`

- [ ] **Step 1: Adicionar dependência**

Run: `npm install @fastify/multipart`

- [ ] **Step 2: Escrever teste**

`tests/importar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { openDB } from "../src/server/db";
import importarRoutes from "../src/server/routes/importar";
import FormData from "form-data";

function makeXlsmBuffer(): Buffer {
  const wb = XLSX.utils.book_new();
  const data = [
    ["Nome", "CPF", "Cargo", "SEXO", "EMAIL", "SITUAÇÃO"],
    ["FULANO DE TAL", "111", "APF", "M", "f@x", "REGULAR"],
    ["BELTRANA SILVA", "222", "DPF", "F", "b@x", "SUB JUDICE"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "FIC_COREC");
  // aba alojamentos vazia mas presente
  const av = XLSX.utils.aoa_to_sheet([
    [], [],
    ["", "", "Aloj.", "cargo / sexo", "Max", "Ocup.", "Disp."],
    ["", "", "A 01", "APF/M", 6, 0, 6],
    ["", "", "G 02", "APF/F", 4, 0, 4]
  ]);
  XLSX.utils.book_append_sheet(wb, av, "Alojamento (vagas)");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

async function buildApp() {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const app = Fastify();
  await app.register(multipart);
  const db = await openDB(join(dir, "db.json"));
  app.decorate("db", db);
  await app.register(importarRoutes, { prefix: "/api/importar" });
  return app;
}

describe("POST /api/importar/xlsm", () => {
  it("importa pessoas e alojamentos da planilha", async () => {
    const app = await buildApp();
    const buf = makeXlsmBuffer();
    const fd = new FormData();
    fd.append("file", buf, { filename: "x.xlsm", contentType: "application/octet-stream" });
    const r = await app.inject({
      method: "POST", url: "/api/importar/xlsm",
      payload: fd, headers: fd.getHeaders()
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.inseridos).toBe(2);
    expect(body.alojamentos).toBe(2);
    expect(app.db.data.pessoas).toHaveLength(2);
    expect(app.db.data.pessoas[0]!.nome).toBe("FULANO DE TAL");
    expect(app.db.data.alojamentos[0]!.id).toBe("A 01");
    expect(app.db.data.alojamentos[0]!.bloco).toBe("A");
    expect(app.db.data.alojamentos[0]!.max).toBe(6);
  });

  it("ignora linhas sem campos obrigatórios e relata erros", async () => {
    const app = await buildApp();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "CPF", "Cargo", "SEXO", "EMAIL", "SITUAÇÃO"],
      ["", "111", "APF", "M", "f@x", "REGULAR"],          // sem nome
      ["VALIDO", "222", "APF", "M", "v@x", "REGULAR"]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "FIC_COREC");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fd = new FormData();
    fd.append("file", buf, { filename: "x.xlsm", contentType: "application/octet-stream" });
    const r = await app.inject({
      method: "POST", url: "/api/importar/xlsm",
      payload: fd, headers: fd.getHeaders()
    });
    const body = r.json();
    expect(body.inseridos).toBe(1);
    expect(body.ignorados).toBe(1);
    expect(body.erros[0]).toMatch(/linha 2/i);
  });
});
```

Adicionar `form-data` como devDep:

Run: `npm install -D form-data`

- [ ] **Step 3: Rodar — falha**

Run: `npx vitest run tests/importar.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `src/server/routes/importar.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import { Cargo, Sexo, Situacao, type Pessoa, type Alojamento } from "../../shared/schemas.js";
import { backup } from "../backup.js";

interface Resultado {
  inseridos: number;
  ignorados: number;
  alojamentos: number;
  erros: string[];
}

const obrig = ["nome", "cpf", "cargo", "sexo", "email", "situacao"] as const;

function parsePessoas(rows: any[][]): { ok: Pessoa[]; erros: string[]; ignorados: number } {
  if (rows.length < 2) return { ok: [], erros: ["FIC_COREC vazia"], ignorados: 0 };
  const headerRaw = rows[0]!.map(h => String(h ?? "").trim().toUpperCase());
  const idx: Record<string, number> = {};
  const map: Record<string, string> = {
    NOME: "nome", CPF: "cpf", CARGO: "cargo", SEXO: "sexo",
    EMAIL: "email", "SITUAÇÃO": "situacao", SITUACAO: "situacao",
    DATANASCIMENTO: "dataNascimento", FATORH: "fatoRH", TIPOSANGUINEO: "tipoSanguineo",
    DDDTELEFONEFIXO: "dddTelefoneFixo", NUMTELEFONEFIXO: "numTelefoneFixo",
    DDDCEL: "dddCel", CELULAR: "celular", CURSO: "curso"
  };
  headerRaw.forEach((h, i) => { if (map[h]) idx[map[h]!] = i; });
  for (const k of obrig) {
    if (idx[k] === undefined) {
      return { ok: [], erros: [`Coluna obrigatória ausente: ${k}`], ignorados: 0 };
    }
  }
  const ok: Pessoa[] = [];
  const erros: string[] = [];
  let ignorados = 0;
  const now = new Date().toISOString();
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const get = (k: string) => {
      const i = idx[k]; return i === undefined ? undefined : (row[i] ?? "").toString().trim();
    };
    const faltando = obrig.filter(k => !get(k));
    if (faltando.length) {
      erros.push(`linha ${r + 1}: faltando ${faltando.join(", ")}`);
      ignorados++; continue;
    }
    const cargoP = Cargo.safeParse(get("cargo"));
    const sexoP = Sexo.safeParse(get("sexo"));
    const sitP = Situacao.safeParse(get("situacao"));
    if (!cargoP.success || !sexoP.success || !sitP.success) {
      erros.push(`linha ${r + 1}: valor inválido em cargo/sexo/situacao`);
      ignorados++; continue;
    }
    const p: Pessoa = {
      id: uuid(),
      nome: get("nome")!,
      cpf: get("cpf")!,
      cargo: cargoP.data,
      sexo: sexoP.data,
      situacao: sitP.data,
      email: get("email")!,
      criadoEm: now,
      lockManual: {}
    };
    for (const opt of ["dataNascimento","fatoRH","tipoSanguineo","dddTelefoneFixo","numTelefoneFixo","dddCel","celular","curso"] as const) {
      const v = get(opt); if (v) (p as any)[opt] = v;
    }
    ok.push(p);
  }
  return { ok, erros, ignorados };
}

function parseAlojamentos(sheet: XLSX.WorkSheet): Alojamento[] {
  // Cabeçalho em C2:G2, dados em C3:G9 conforme spec
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const out: Alojamento[] = [];
  for (let r = 2; r <= Math.min(range.e.r, 50); r++) {
    const id = String(sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v ?? "").trim();
    const cargoSexo = String(sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v ?? "").trim();
    const max = Number(sheet[XLSX.utils.encode_cell({ r, c: 4 })]?.v ?? 0);
    if (!id || !cargoSexo || !max) continue;
    out.push({ id, bloco: id.charAt(0), cargoSexo, max });
  }
  return out;
}

const importarRoutes: FastifyPluginAsync = async (app) => {
  app.post("/xlsm", async (req, reply) => {
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "arquivo ausente" });
    const buf = await file.toBuffer();
    let wb: XLSX.WorkBook;
    try { wb = XLSX.read(buf, { type: "buffer" }); }
    catch { return reply.code(400).send({ error: "xlsm inválido" }); }

    const fic = wb.Sheets["FIC_COREC"];
    if (!fic) return reply.code(400).send({ error: "aba FIC_COREC ausente" });
    const rows = XLSX.utils.sheet_to_json<any[]>(fic, { header: 1, raw: false });
    const { ok, erros, ignorados } = parsePessoas(rows);

    let alojamentos: Alojamento[] = [];
    const al = wb.Sheets["Alojamento (vagas)"];
    if (al) alojamentos = parseAlojamentos(al);

    if (process.env.NODE_ENV !== "test" && app.db.data.pessoas.length > 0) {
      await backup(process.env.DB_PATH ?? "data/db.json");
    }
    app.db.data.pessoas.push(...ok);
    if (alojamentos.length) app.db.data.alojamentos = alojamentos;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    app.db.data.historico.push({
      ts: new Date().toISOString(),
      acao: "import",
      detalhes: { inseridos: ok.length, alojamentos: alojamentos.length, ignorados }
    });
    await app.db.write();

    const resultado: Resultado = { inseridos: ok.length, ignorados, alojamentos: alojamentos.length, erros };
    return resultado;
  });
};

export default importarRoutes;
```

- [ ] **Step 5: Registrar multipart e a rota no `src/server/index.ts`**

Adicionar import no topo:

```ts
import multipart from "@fastify/multipart";
```

Antes de `app.register(import("./routes/pessoas.js")...)`, adicionar:

```ts
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
app.register(import("./routes/importar.js"), { prefix: "/api/importar" });
```

- [ ] **Step 6: Rodar testes — devem passar**

Run: `npx vitest run tests/importar.test.ts`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add src/server/routes/importar.ts src/server/index.ts tests/importar.test.ts package.json package-lock.json
git commit -m "feat(api): import xlsm de FIC_COREC e Alojamento (vagas)"
```

---

### Task 10: Tela Pessoas — listagem, filtros, busca

**Files:**
- Modify: `src/web/pages/Pessoas.tsx`

- [ ] **Step 1: Implementar listagem com filtros**

Substituir o conteúdo de `src/web/pages/Pessoas.tsx` por:

```tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Pessoa } from "@shared/schemas";

type Filtro = {
  busca: string;
  cargo: string;
  sexo: string;
  situacao: string;
  semTurma: boolean;
  semAlojamento: boolean;
  semNome: boolean;
};

const FILTRO_INICIAL: Filtro = {
  busca: "", cargo: "", sexo: "", situacao: "",
  semTurma: false, semAlojamento: false, semNome: false
};

export default function Pessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INICIAL);
  const [carregando, setCarregando] = useState(true);

  const recarregar = () => {
    setCarregando(true);
    api.pessoas.list().then(p => { setPessoas(p); setCarregando(false); });
  };

  useEffect(() => { recarregar(); }, []);

  const lista = useMemo(() => pessoas.filter(p => {
    if (filtro.cargo && p.cargo !== filtro.cargo) return false;
    if (filtro.sexo && p.sexo !== filtro.sexo) return false;
    if (filtro.situacao && p.situacao !== filtro.situacao) return false;
    if (filtro.semTurma && p.turmaId) return false;
    if (filtro.semAlojamento && p.alojamentoId) return false;
    if (filtro.semNome && p.nomeGuerra) return false;
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase();
      if (!p.nome.toLowerCase().includes(b) && !p.cpf.includes(b)) return false;
    }
    return true;
  }), [pessoas, filtro]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Pessoas <span className="text-slate-500 text-base">({lista.length}/{pessoas.length})</span></h1>
        <div className="flex gap-2">
          <ImportarBtn onDone={recarregar} />
          <ExportarBtn pessoas={pessoas} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4 text-sm">
        <input className="col-span-2 border rounded px-2 py-1" placeholder="buscar nome/CPF…"
          value={filtro.busca} onChange={e => setFiltro({ ...filtro, busca: e.target.value })} />
        <select className="border rounded px-2 py-1" value={filtro.cargo} onChange={e => setFiltro({ ...filtro, cargo: e.target.value })}>
          <option value="">cargo</option><option>APF</option><option>DPF</option><option>EPF</option><option>PCF</option><option>PPF</option>
        </select>
        <select className="border rounded px-2 py-1" value={filtro.sexo} onChange={e => setFiltro({ ...filtro, sexo: e.target.value })}>
          <option value="">sexo</option><option>M</option><option>F</option>
        </select>
        <select className="border rounded px-2 py-1" value={filtro.situacao} onChange={e => setFiltro({ ...filtro, situacao: e.target.value })}>
          <option value="">situação</option><option>REGULAR</option><option>SUB JUDICE</option><option>ESPECIAL</option>
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filtro.semTurma} onChange={e => setFiltro({ ...filtro, semTurma: e.target.checked })} /> sem turma</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={filtro.semNome} onChange={e => setFiltro({ ...filtro, semNome: e.target.checked })} /> sem nome G.</label>
      </div>

      {carregando ? <p>Carregando…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left p-2">Nome</th>
              <th className="text-left p-2">CPF</th>
              <th className="text-left p-2">Cargo</th>
              <th className="text-left p-2">Sexo</th>
              <th className="text-left p-2">Situação</th>
              <th className="text-left p-2">Turma</th>
              <th className="text-left p-2">Alojamento</th>
              <th className="text-left p-2">Nome G.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map(p => (
              <LinhaPessoa key={p.id} p={p} onChange={recarregar} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LinhaPessoa({ p, onChange }: { p: Pessoa; onChange: () => void }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(p.nome);
  return (
    <tr className="border-b hover:bg-slate-50">
      <td className="p-2">
        {editing ? (
          <input className="border rounded px-1" value={nome} onChange={e => setNome(e.target.value)}
            onBlur={async () => { await api.pessoas.update(p.id, { nome }); setEditing(false); onChange(); }} autoFocus />
        ) : <span onClick={() => setEditing(true)} className="cursor-pointer">{p.nome}</span>}
      </td>
      <td className="p-2">{p.cpf}</td>
      <td className="p-2">{p.cargo}</td>
      <td className="p-2">{p.sexo}</td>
      <td className="p-2">{p.situacao}</td>
      <td className="p-2 text-slate-500">{p.turmaId ?? "—"}</td>
      <td className="p-2 text-slate-500">{p.alojamentoId ?? "—"}</td>
      <td className="p-2 text-slate-500">{p.nomeGuerra ?? "—"}</td>
      <td className="p-2">
        <button className="text-red-600 text-xs"
          onClick={async () => {
            if (confirm(`Excluir ${p.nome}?`)) { await api.pessoas.remove(p.id); onChange(); }
          }}>excluir</button>
      </td>
    </tr>
  );
}

function ImportarBtn({ onDone }: { onDone: () => void }) {
  return (
    <label className="bg-blue-600 text-white px-3 py-1 rounded text-sm cursor-pointer">
      Importar xlsm
      <input type="file" accept=".xlsm,.xlsx" className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          const r = await api.importar.xlsm(f);
          alert(`Inseridos: ${r.inseridos}\nIgnorados: ${r.ignorados}\nErros:\n${r.erros.join("\n")}`);
          onDone();
        }} />
    </label>
  );
}

function ExportarBtn({ pessoas }: { pessoas: Pessoa[] }) {
  const baixar = (tipo: "json" | "csv") => {
    let conteudo: string, mime: string, ext: string;
    if (tipo === "json") {
      conteudo = JSON.stringify(pessoas, null, 2); mime = "application/json"; ext = "json";
    } else {
      const cols = ["nome","cpf","cargo","sexo","situacao","email","turmaId","alojamentoId","nomeGuerra"];
      const head = cols.join(",");
      const linhas = pessoas.map(p => cols.map(c => JSON.stringify((p as any)[c] ?? "")).join(","));
      conteudo = [head, ...linhas].join("\n"); mime = "text/csv"; ext = "csv";
    }
    const blob = new Blob([conteudo], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pessoas-${Date.now()}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex gap-1">
      <button className="border px-3 py-1 rounded text-sm" onClick={() => baixar("json")}>JSON</button>
      <button className="border px-3 py-1 rounded text-sm" onClick={() => baixar("csv")}>CSV</button>
    </div>
  );
}
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`. Em `http://localhost:5173/pessoas`:
- Importar `~/Downloads/PLANILHA DE RECEPCAO CFP 2026 (1).xlsm` — esperar alerta com `inseridos: N`.
- Tabela popula com pessoas; filtros funcionam; clicar no nome torna editável; excluir remove.
- Exportar JSON e CSV baixam arquivos válidos.

Encerrar com Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add src/web/pages/Pessoas.tsx
git commit -m "feat(web): tela Pessoas com listagem, filtros, edicao, import e export"
```

---

### Task 11: Smoke test final do plano

- [ ] **Step 1: Rodar suite completa**

Run: `npm test`
Expected: todos os testes passam (schemas, db, pessoas, importar).

- [ ] **Step 2: Validar build de produção**

Run: `npm run build && NODE_ENV=production npm start`
Expected: navegador abre `http://localhost:5174` mostrando o app sidebar + páginas. Encerrar.

- [ ] **Step 3: Verificar `data/db.json` e `.gitignore`**

Run: `cat .gitignore | grep data && ls data/`
Expected: `data/db.json` está listado no gitignore e existe no disco.

- [ ] **Step 4: Tag de fim de plano**

```bash
git tag p1-fundacao
```

---

## Notas finais (P1)

- Para testes de import com multipart use `form-data`; alguns ambientes Fastify exigem `req.file()` em vez de `req.parts()`.
- `xlsx` da SheetJS vem por CDN no `package.json` (sem warning de licença).
- Em dev, navegador deve usar `http://localhost:5173` (Vite proxy → 5174). Em produção, o Fastify serve a SPA buildada na porta 5174.
- Os algoritmos (P2) e nomes de guerra/incremental (P3) consumirão o mesmo `db.json` populado por este plano.
