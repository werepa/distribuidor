# Distribuidor CFP — Plano 3: Nomes de Guerra + Incremental + Polimento

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar geração de nomes de guerra com unicidade fonética, redistribuição incremental ao incluir novas pessoas, telas de Configuração, Backups e Dashboard.

**Architecture:** Mais funções puras em `domain/` (normalização fonética, geração de nome, redistribuição incremental). Hook automático: ao criar pessoa, dispara redistribuição incremental. Telas de Configuração, Backups e Dashboard fecham o escopo do MVP.

**Tech Stack:** Mesma de P1 e P2.

**Pré-requisito:** Tags `p1-fundacao` e `p2-distribuicao` aplicadas.

---

## Estrutura de arquivos

```
src/
├── server/
│   ├── domain/
│   │   ├── normalizacaoFonetica.ts       # NOVO
│   │   ├── gerarNomesGuerra.ts           # NOVO
│   │   └── redistribuirIncremental.ts    # NOVO
│   └── routes/
│       ├── nomesGuerra.ts                # NOVO
│       ├── config.ts                     # NOVO
│       ├── backups.ts                    # NOVO
│       └── pessoas.ts                    # MODIFICADO (auto-incremental)
└── web/
    ├── api.ts                            # MODIFICADO
    └── pages/
        ├── NomesGuerra.tsx               # SUBSTITUÍDO
        ├── Configuracao.tsx              # SUBSTITUÍDO
        ├── Backups.tsx                   # SUBSTITUÍDO
        └── Dashboard.tsx                 # SUBSTITUÍDO

tests/
├── normalizacaoFonetica.test.ts          # NOVO
├── gerarNomesGuerra.test.ts              # NOVO
├── redistribuirIncremental.test.ts       # NOVO
├── nomesGuerraRoutes.test.ts             # NOVO
└── backups.test.ts                       # NOVO
```

---

### Task 1: `normalizacaoFonetica` (TDD)

**Files:**
- Create: `src/server/domain/normalizacaoFonetica.ts`
- Test: `tests/normalizacaoFonetica.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
import { describe, it, expect } from "vitest";
import { normalizar, tokenize } from "../src/server/domain/normalizacaoFonetica";

const subs = [
  { de: "TH", para: "T" }, { de: "LL", para: "L" }, { de: "CC", para: "C" },
  { de: "NN", para: "N" }, { de: "PH", para: "F" },
  { de: "LUIZ", para: "LUIS" }, { de: "SOUZA", para: "SOUSA" },
  { de: "RACHEL", para: "RAQUEL" }, { de: "VICTOR", para: "VITOR" }
];

describe("normalizar", () => {
  it("aplica substituições case-insensitive e retorna upper", () => {
    expect(normalizar("Luiz", subs)).toBe("LUIS");
    expect(normalizar("Souza", subs)).toBe("SOUSA");
    expect(normalizar("Rachel", subs)).toBe("RAQUEL");
    expect(normalizar("Victor", subs)).toBe("VITOR");
  });
  it("aplica substituições parciais", () => {
    expect(normalizar("Stephanie", subs)).toBe("STEFANIE");
    expect(normalizar("Carlla", subs)).toBe("CARLA");
    expect(normalizar("Athena", subs)).toBe("ATENA");
  });
  it("remove acentos", () => {
    expect(normalizar("João", subs)).toBe("JOAO");
    expect(normalizar("Açafrão", subs)).toBe("ACAFRAO");
  });
});

describe("tokenize", () => {
  it("divide por espaço e remove vazios", () => {
    expect(tokenize("FULANO   DE  TAL")).toEqual(["FULANO", "DE", "TAL"]);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/normalizacaoFonetica.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/server/domain/normalizacaoFonetica.ts`:

```ts
export interface Substituicao { de: string; para: string; }

export function tokenize(nome: string): string[] {
  return nome.trim().split(/\s+/).filter(Boolean);
}

function removerAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizar(palavra: string, subs: Substituicao[]): string {
  let s = removerAcentos(palavra).toUpperCase();
  // ordenar substituições por tamanho desc para evitar conflito (LUIZ antes de TH)
  const ordenadas = [...subs].sort((a, b) => b.de.length - a.de.length);
  for (const { de, para } of ordenadas) {
    if (de.length === palavra.length || de.length > 2) {
      // substituição "palavra inteira"
      if (s === de.toUpperCase()) { s = para.toUpperCase(); continue; }
    }
    s = s.split(de.toUpperCase()).join(para.toUpperCase());
  }
  return s;
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run tests/normalizacaoFonetica.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/normalizacaoFonetica.ts tests/normalizacaoFonetica.test.ts
git commit -m "feat(domain): normalizacao fonetica e tokenize"
```

---

### Task 2: `gerarNomesGuerra` (TDD)

**Files:**
- Create: `src/server/domain/gerarNomesGuerra.ts`
- Test: `tests/gerarNomesGuerra.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
import { describe, it, expect } from "vitest";
import { gerarNomesGuerra } from "../src/server/domain/gerarNomesGuerra";
import type { Pessoa, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: 1, DPF: 1, EPF: 0, PCF: 0, PPF: 0 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [
    { de: "TH", para: "T" }, { de: "LUIZ", para: "LUIS" }, { de: "VICTOR", para: "VITOR" }
  ],
  stopWordsNomeGuerra: ["DE", "DI", "DO", "DOS", "E", "D", "SAO"]
};

const mkP = (nome: string, turmaId = "APF-1", sexo: "M" | "F" = "M", cargo: any = "APF", lock = false): Pessoa => ({
  id: uuid(), nome, cpf: "0", cargo, sexo, situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z",
  turmaId,
  lockManual: lock ? { nomeGuerra: true } : {}
});

describe("gerarNomesGuerra", () => {
  it("usa primeiro nome para mulher quando único na turma", () => {
    const ps = [mkP("MARIA SILVA", "APF-1", "F"), mkP("JOAO COSTA", "APF-1", "M")];
    const r = gerarNomesGuerra(ps, cfg);
    expect(r.find(p => p.nome === "MARIA SILVA")?.nomeGuerra).toBe("MARIA");
  });

  it("trata Luiz e Luis como conflito fonético na mesma turma", () => {
    const ps = [
      mkP("LUIZ ALMEIDA", "APF-1"),
      mkP("LUIS BARBOSA", "APF-1")
    ];
    const r = gerarNomesGuerra(ps, cfg);
    const a = r.find(p => p.nome === "LUIZ ALMEIDA")!;
    const b = r.find(p => p.nome === "LUIS BARBOSA")!;
    expect(a.nomeGuerra).not.toBe(b.nomeGuerra);
  });

  it("ignora stop-words isoladas como candidatos", () => {
    const ps = [mkP("CARLOS DE OLIVEIRA", "APF-1")];
    const r = gerarNomesGuerra(ps, cfg);
    expect(r[0]!.nomeGuerra).not.toBe("DE");
  });

  it("forma nome composto se simples conflita", () => {
    const ps = [mkP("CARLOS SILVA", "APF-1"), mkP("CARLOS ALMEIDA", "APF-1")];
    const r = gerarNomesGuerra(ps, cfg);
    const nomes = r.map(p => p.nomeGuerra);
    expect(new Set(nomes).size).toBe(2);
  });

  it("nomeGuerra=undefined e flag se irresolvível", () => {
    // três Carlos com mesmo sobrenome e sem outras palavras
    const ps = [
      mkP("CARLOS SILVA", "APF-1"),
      mkP("CARLOS SILVA", "APF-1"),
      mkP("CARLOS SILVA", "APF-1")
    ];
    const r = gerarNomesGuerra(ps, cfg);
    const semNome = r.filter(p => !p.nomeGuerra);
    expect(semNome.length).toBeGreaterThanOrEqual(1);
  });

  it("respeita lockManual.nomeGuerra", () => {
    const ps = [
      mkP("VICTOR HUGO", "APF-1", "M", "APF", true),
      mkP("VITOR LIMA", "APF-1")
    ];
    ps[0]!.nomeGuerra = "VICTOR";
    const r = gerarNomesGuerra(ps, cfg);
    expect(r.find(p => p.nome === "VICTOR HUGO")?.nomeGuerra).toBe("VICTOR");
  });

  it("preferencia unicidade dentro do cargo (mas não obrigatória)", () => {
    const ps = [
      mkP("ANA SILVA", "APF-1", "F"),
      mkP("ANA COSTA", "APF-2", "F")
    ];
    const cfg2 = { ...cfg, turmasPorCargo: { ...cfg.turmasPorCargo, APF: 2 } };
    const r = gerarNomesGuerra(ps, cfg2);
    const a = r[0]!.nomeGuerra; const b = r[1]!.nomeGuerra;
    expect(a).toBeTruthy(); expect(b).toBeTruthy();
    // não exigimos diferentes (preferencial), mas se possível devem ser
    expect(a !== b || a === undefined).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/gerarNomesGuerra.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/server/domain/gerarNomesGuerra.ts`:

```ts
import type { Pessoa, Config } from "../../shared/schemas.js";
import { normalizar, tokenize } from "./normalizacaoFonetica.js";

function candidatosPara(pessoa: Pessoa, cfg: Config): string[] {
  const tokens = tokenize(pessoa.nome).map(t => t.toUpperCase());
  const stopUpper = new Set(cfg.stopWordsNomeGuerra.map(s => s.toUpperCase()));
  const palavras = tokens.filter(t => !stopUpper.has(t));
  if (palavras.length === 0) return [];

  const cands: string[] = [];
  // 1. primeiro nome (sempre, e prioritário para sexo F)
  cands.push(palavras[0]!);
  // 2. último sobrenome
  if (palavras.length > 1) cands.push(palavras[palavras.length - 1]!);
  // 3. primeiro + último
  if (palavras.length > 1) cands.push(`${palavras[0]} ${palavras[palavras.length - 1]}`);
  // 4. primeiro + meio
  if (palavras.length >= 3) {
    for (let i = 1; i < palavras.length - 1; i++) {
      cands.push(`${palavras[0]} ${palavras[i]}`);
    }
  }
  // 5. todos os 2-grams
  for (let i = 0; i < palavras.length - 1; i++) {
    cands.push(`${palavras[i]} ${palavras[i + 1]}`);
  }
  // 6. inclusão de stop-words formando "DA SILVA" etc.
  for (let i = 0; i < tokens.length - 1; i++) {
    if (stopUpper.has(tokens[i]!) && !stopUpper.has(tokens[i + 1]!)) {
      cands.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }
  // dedupe preservando ordem
  return [...new Set(cands)];
}

function chave(s: string, cfg: Config): string {
  return tokenize(s).map(t => normalizar(t, cfg.normalizacoesFoneticas)).join(" ");
}

export function gerarNomesGuerra(pessoas: Pessoa[], cfg: Config): Pessoa[] {
  const out = pessoas.map(p => ({ ...p, lockManual: { ...p.lockManual } }));

  // ocupados na turma e no cargo (mantendo locks)
  const ocupTurma = new Map<string, Set<string>>();
  const ocupCargo = new Map<string, Set<string>>();
  const trav = out.filter(p => p.lockManual.nomeGuerra && p.nomeGuerra);
  for (const p of trav) {
    if (p.turmaId) {
      if (!ocupTurma.has(p.turmaId)) ocupTurma.set(p.turmaId, new Set());
      ocupTurma.get(p.turmaId)!.add(chave(p.nomeGuerra!, cfg));
    }
    if (!ocupCargo.has(p.cargo)) ocupCargo.set(p.cargo, new Set());
    ocupCargo.get(p.cargo)!.add(chave(p.nomeGuerra!, cfg));
  }

  // ordenar deterministicamente: F primeiro (preferência), depois alfabético
  const livres = out.filter(p => !p.lockManual.nomeGuerra);
  livres.sort((a, b) => {
    if (a.sexo !== b.sexo) return a.sexo === "F" ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  for (const p of livres) {
    p.nomeGuerra = undefined;
    const cands = candidatosPara(p, cfg);
    let escolhido: string | undefined;
    let escolhidoSemConflitoCargo = false;

    for (const c of cands) {
      const k = chave(c, cfg);
      const turmaSet = p.turmaId ? (ocupTurma.get(p.turmaId) ?? new Set()) : new Set<string>();
      if (turmaSet.has(k)) continue;
      const cargoSet = ocupCargo.get(p.cargo) ?? new Set();
      const conflitoCargo = cargoSet.has(k);
      if (!escolhido || (escolhidoSemConflitoCargo === false && !conflitoCargo)) {
        escolhido = c;
        escolhidoSemConflitoCargo = !conflitoCargo;
        if (!conflitoCargo) break; // ideal: único na turma e no cargo
      }
    }

    if (escolhido) {
      p.nomeGuerra = escolhido;
      const k = chave(escolhido, cfg);
      if (p.turmaId) {
        if (!ocupTurma.has(p.turmaId)) ocupTurma.set(p.turmaId, new Set());
        ocupTurma.get(p.turmaId)!.add(k);
      }
      if (!ocupCargo.has(p.cargo)) ocupCargo.set(p.cargo, new Set());
      ocupCargo.get(p.cargo)!.add(k);
    }
  }

  return out;
}
```

- [ ] **Step 4: Rodar — devem passar**

Run: `npx vitest run tests/gerarNomesGuerra.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/gerarNomesGuerra.ts tests/gerarNomesGuerra.test.ts
git commit -m "feat(domain): gerarNomesGuerra com unicidade fonetica"
```

---

### Task 3: Rotas de nomes de guerra

**Files:**
- Create: `src/server/routes/nomesGuerra.ts`
- Modify: `src/server/index.ts`
- Test: `tests/nomesGuerraRoutes.test.ts`

- [ ] **Step 1: Escrever teste**

```ts
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { openDB } from "../src/server/db";
import nomesRoutes from "../src/server/routes/nomesGuerra";
import type { Pessoa } from "../src/shared/schemas";

async function buildApp(seed?: (db: any) => void) {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const db = await openDB(join(dir, "db.json"));
  if (seed) seed(db);
  await db.write();
  const app = Fastify();
  app.decorate("db", db);
  await app.register(nomesRoutes, { prefix: "/api/nomes-guerra" });
  return app;
}

const mkP = (nome: string, turmaId = "APF-1"): Pessoa => ({
  id: uuid(), nome, cpf: "0", cargo: "APF", sexo: "M", situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", turmaId, lockManual: {}
});

describe("rotas /api/nomes-guerra", () => {
  it("POST /gerar preenche nomeGuerra das pessoas", async () => {
    const app = await buildApp(db => {
      db.data.pessoas = [mkP("MARIA SILVA"), mkP("JOAO COSTA")];
    });
    const r = await app.inject({ method: "POST", url: "/api/nomes-guerra/gerar" });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas.every(p => p.nomeGuerra)).toBe(true);
  });

  it("PATCH /pessoa/:id seta nomeGuerra e lock", async () => {
    const app = await buildApp(db => { db.data.pessoas = [mkP("X Y")]; });
    const id = app.db.data.pessoas[0].id;
    const r = await app.inject({
      method: "PATCH", url: `/api/nomes-guerra/pessoa/${id}`,
      payload: { nomeGuerra: "CHEFE", lock: true }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas[0].nomeGuerra).toBe("CHEFE");
    expect(app.db.data.pessoas[0].lockManual.nomeGuerra).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/nomesGuerraRoutes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/routes/nomesGuerra.ts`**

```ts
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
```

- [ ] **Step 4: Registrar em `src/server/index.ts`**

```ts
app.register(import("./routes/nomesGuerra.js"), { prefix: "/api/nomes-guerra" });
```

- [ ] **Step 5: Rodar testes — devem passar**

Run: `npx vitest run tests/nomesGuerraRoutes.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/nomesGuerra.ts src/server/index.ts tests/nomesGuerraRoutes.test.ts
git commit -m "feat(api): rotas /api/nomes-guerra"
```

---

### Task 4: Tela Nomes de Guerra

**Files:**
- Modify: `src/web/api.ts`, `src/web/pages/NomesGuerra.tsx`

- [ ] **Step 1: Estender `src/web/api.ts`**

Adicionar ao objeto `api`:

```ts
  nomesGuerra: {
    gerar: () => req<{ ok: true }>("/nomes-guerra/gerar", { method: "POST" }),
    set: (id: string, nomeGuerra: string | null, lock = true) =>
      req(`/nomes-guerra/pessoa/${id}`, { method: "PATCH", body: JSON.stringify({ nomeGuerra, lock }) })
  }
```

- [ ] **Step 2: Implementar tela**

`src/web/pages/NomesGuerra.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Pessoa, Turma } from "@shared/schemas";

function chaveSimples(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/TH/g, "T").replace(/LL/g, "L").replace(/CC/g, "C")
    .replace(/NN/g, "N").replace(/PH/g, "F")
    .replace(/\s+/g, " ").trim();
}

export default function NomesGuerraPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setTurmas(await api.turmas.list());
  };
  useEffect(() => { recarregar(); }, []);

  const porTurma = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    turmas.forEach(t => m.set(t.id, []));
    pessoas.forEach(p => { if (p.turmaId && m.has(p.turmaId)) m.get(p.turmaId)!.push(p); });
    return m;
  }, [pessoas, turmas]);

  const conflitosTurma = useMemo(() => {
    const out = new Map<string, Set<string>>(); // pessoaId -> set de tipos
    for (const ps of porTurma.values()) {
      const counts = new Map<string, string[]>();
      ps.forEach(p => {
        if (!p.nomeGuerra) return;
        const k = chaveSimples(p.nomeGuerra);
        if (!counts.has(k)) counts.set(k, []);
        counts.get(k)!.push(p.id);
      });
      for (const ids of counts.values()) {
        if (ids.length > 1) ids.forEach(id => {
          if (!out.has(id)) out.set(id, new Set());
          out.get(id)!.add("turma");
        });
      }
    }
    return out;
  }, [porTurma]);

  const conflitosCargo = useMemo(() => {
    const out = new Map<string, Set<string>>();
    const porCargo = new Map<string, Pessoa[]>();
    pessoas.forEach(p => {
      if (!porCargo.has(p.cargo)) porCargo.set(p.cargo, []);
      porCargo.get(p.cargo)!.push(p);
    });
    for (const ps of porCargo.values()) {
      const counts = new Map<string, string[]>();
      ps.forEach(p => {
        if (!p.nomeGuerra) return;
        const k = chaveSimples(p.nomeGuerra);
        if (!counts.has(k)) counts.set(k, []);
        counts.get(k)!.push(p.id);
      });
      for (const ids of counts.values()) {
        if (ids.length > 1) ids.forEach(id => {
          if (!out.has(id)) out.set(id, new Set());
          out.get(id)!.add("cargo");
        });
      }
    }
    return out;
  }, [pessoas]);

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Nomes de Guerra</h1>
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          onClick={async () => { await api.nomesGuerra.gerar(); recarregar(); }}>
          ▶ Gerar
        </button>
      </div>

      <div className="space-y-6">
        {turmas.map(t => {
          const ps = porTurma.get(t.id) ?? [];
          if (ps.length === 0) return null;
          return (
            <section key={t.id}>
              <h2 className="font-semibold text-sm mb-2">{t.label} <span className="text-slate-500 font-normal">({ps.length})</span></h2>
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr><th className="text-left p-2">Nome completo</th><th className="text-left p-2">Nome de guerra</th><th></th></tr>
                </thead>
                <tbody>
                  {ps.map(p => {
                    const cT = conflitosTurma.get(p.id);
                    const cC = conflitosCargo.get(p.id);
                    const cor = cT ? "bg-red-50" : cC ? "bg-amber-50" : "";
                    return (
                      <tr key={p.id} className={`border-b ${cor}`}>
                        <td className="p-2">{p.nome}</td>
                        <td className="p-2">
                          <input className="border rounded px-2 py-1 w-48"
                            defaultValue={p.nomeGuerra ?? ""}
                            onBlur={async e => {
                              const v = e.target.value.trim();
                              if (v !== (p.nomeGuerra ?? "")) {
                                await api.nomesGuerra.set(p.id, v || null, true);
                                recarregar();
                              }
                            }} />
                          {p.lockManual.nomeGuerra && <span className="ml-1" title="fixado">🔒</span>}
                          {cT && <span className="ml-1 text-red-700 text-xs">⚠ colisão na turma</span>}
                          {!cT && cC && <span className="ml-1 text-amber-700 text-xs">⚠ colisão no cargo</span>}
                        </td>
                        <td className="p-2 text-xs text-slate-500">{p.cargo} {p.sexo === "F" && "♀"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev` em `/nomes`. Clique Gerar. Observe colisões marcadas. Edite um valor → salva, lock vira 🔒.

- [ ] **Step 4: Commit**

```bash
git add src/web/api.ts src/web/pages/NomesGuerra.tsx
git commit -m "feat(web): tela Nomes de Guerra com edicao e alertas de colisao"
```

---

### Task 5: `redistribuirIncremental` (TDD)

**Files:**
- Create: `src/server/domain/redistribuirIncremental.ts`
- Test: `tests/redistribuirIncremental.test.ts`

- [ ] **Step 1: Escrever teste**

```ts
import { describe, it, expect } from "vitest";
import { redistribuirIncremental } from "../src/server/domain/redistribuirIncremental";
import type { Pessoa, Turma, Alojamento, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: 2, DPF: 0, EPF: 0, PCF: 0, PPF: 0 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [], stopWordsNomeGuerra: ["DE"]
};

const turmas: Turma[] = [
  { id: "APF-1", cargo: "APF", numero: 1, label: "APF-A" },
  { id: "APF-2", cargo: "APF", numero: 2, label: "APF-B" }
];
const alojs: Alojamento[] = [
  { id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 }
];

const mkP = (nome: string, turmaId?: string, alojamentoId?: string): Pessoa => ({
  id: uuid(), nome, cpf: "0", cargo: "APF", sexo: "M", situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", turmaId, alojamentoId, lockManual: {}
});

describe("redistribuirIncremental", () => {
  it("insere na turma com menor contagem", () => {
    const existentes = [
      mkP("A", "APF-1"), mkP("B", "APF-1"),
      mkP("C", "APF-2")
    ];
    const nova = mkP("Z");
    const r = redistribuirIncremental(nova, existentes, turmas, alojs, cfg);
    expect(r.find(p => p.id === nova.id)?.turmaId).toBe("APF-2");
  });

  it("insere no alojamento com mais folga", () => {
    const existentes = [mkP("A", "APF-1", "A 01"), mkP("B", "APF-1", "A 01")];
    const nova = mkP("Z");
    const r = redistribuirIncremental(nova, existentes, turmas, alojs, cfg);
    expect(r.find(p => p.id === nova.id)?.alojamentoId).toBe("A 01");
  });

  it("gera nome de guerra evitando colisão na turma", () => {
    const existentes = [mkP("LUIZ ALMEIDA", "APF-1")];
    existentes[0]!.nomeGuerra = "LUIZ";
    const nova = mkP("LUIS BARBOSA");
    const r = redistribuirIncremental(nova, existentes, turmas, alojs, cfg);
    const novaR = r.find(p => p.id === nova.id)!;
    expect(novaR.nomeGuerra).toBeTruthy();
    expect(novaR.nomeGuerra).not.toBe("LUIZ");
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/redistribuirIncremental.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/server/domain/redistribuirIncremental.ts`:

```ts
import type { Pessoa, Turma, Alojamento, Config } from "../../shared/schemas.js";
import { distribuirTurmas } from "./distribuirTurmas.js";
import { distribuirAlojamentos } from "./distribuirAlojamentos.js";
import { gerarNomesGuerra } from "./gerarNomesGuerra.js";

export function redistribuirIncremental(
  nova: Pessoa,
  existentes: Pessoa[],
  turmas: Turma[],
  alojamentos: Alojamento[],
  cfg: Config
): Pessoa[] {
  // Travar todos os existentes em seus locais (preserva manual e auto)
  const trav = existentes.map(p => ({
    ...p,
    lockManual: {
      ...p.lockManual,
      turma: p.turmaId !== undefined ? true : p.lockManual.turma,
      alojamento: p.alojamentoId !== undefined ? true : p.lockManual.alojamento,
      nomeGuerra: p.nomeGuerra !== undefined ? true : p.lockManual.nomeGuerra
    }
  }));
  let pool = [...trav, { ...nova, lockManual: { ...nova.lockManual } }];

  pool = distribuirTurmas(pool, turmas, cfg);
  pool = distribuirAlojamentos(pool, alojamentos, cfg);
  pool = gerarNomesGuerra(pool, cfg);

  // restaurar lockManual original dos existentes (não queremos contagiar o "lock automático")
  return pool.map(p => {
    const orig = existentes.find(e => e.id === p.id);
    if (!orig) return p;
    return { ...p, lockManual: { ...orig.lockManual } };
  });
}
```

- [ ] **Step 4: Rodar testes — devem passar**

Run: `npx vitest run tests/redistribuirIncremental.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/redistribuirIncremental.ts tests/redistribuirIncremental.test.ts
git commit -m "feat(domain): redistribuirIncremental para inclusao posterior"
```

---

### Task 6: Auto-incremental ao criar pessoa

**Files:**
- Modify: `src/server/routes/pessoas.ts`

- [ ] **Step 1: Modificar handler POST**

Em `src/server/routes/pessoas.ts`, importar:

```ts
import { redistribuirIncremental } from "../domain/redistribuirIncremental.js";
```

Substituir o handler `app.post("/", ...)` por:

```ts
  app.post("/", async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const novo: Pessoa = {
      ...parsed.data,
      id: uuid(),
      criadoEm: new Date().toISOString(),
      lockManual: {}
    };
    // Auto-redistribuição se já há turmas/alojamentos
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
```

- [ ] **Step 2: Verificar testes existentes seguem passando**

Run: `npx vitest run tests/pessoas.test.ts`
Expected: passa (criar pessoa em DB sem turmas funciona via fallback `push`).

- [ ] **Step 3: Adicionar teste de auto-incremental**

Anexar a `tests/pessoas.test.ts`:

```ts
it("POST aplica redistribuicao incremental quando há turmas", async () => {
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const Fastify = (await import("fastify")).default;
  const { openDB } = await import("../src/server/db");
  const pessoasRoutes = (await import("../src/server/routes/pessoas")).default;
  const app = Fastify();
  const db = await openDB(join(dir, "db.json"));
  db.data.turmas = [{ id: "APF-1", cargo: "APF", numero: 1, label: "APF-A" }];
  await db.write();
  app.decorate("db", db);
  await app.register(pessoasRoutes, { prefix: "/api/pessoas" });
  const r = await app.inject({
    method: "POST", url: "/api/pessoas",
    payload: { nome: "X Y", cpf: "1", cargo: "APF", sexo: "M", situacao: "REGULAR", email: "x@y" }
  });
  expect(r.statusCode).toBe(201);
  expect(r.json().turmaId).toBe("APF-1");
});
```

Run: `npx vitest run tests/pessoas.test.ts`
Expected: passa.

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/pessoas.ts tests/pessoas.test.ts
git commit -m "feat(api): auto-redistribuicao ao criar pessoa"
```

---

### Task 7: Rotas e tela de Configuração

**Files:**
- Create: `src/server/routes/config.ts`
- Modify: `src/server/index.ts`, `src/web/api.ts`, `src/web/pages/Configuracao.tsx`

- [ ] **Step 1: Implementar `src/server/routes/config.ts`**

```ts
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
```

- [ ] **Step 2: Registrar em `src/server/index.ts`**

```ts
app.register(import("./routes/config.js"), { prefix: "/api/config" });
```

- [ ] **Step 3: Estender `src/web/api.ts`**

Adicionar imports de tipo `Config, Meta` e ao objeto `api`:

```ts
  config: {
    get: () => req<Config>("/config"),
    meta: () => req<Meta>("/config/meta"),
    save: (c: Config) => req("/config", { method: "PUT", body: JSON.stringify(c) }),
    setEdicao: (edicao: string) => req("/config/edicao", { method: "PUT", body: JSON.stringify({ edicao }) })
  }
```

(Importar `Meta` adicionalmente em `import type { ... }`.)

- [ ] **Step 4: Implementar `src/web/pages/Configuracao.tsx`**

```tsx
import { useEffect, useState } from "react";
import { api } from "../api";
import type { Config, Meta } from "@shared/schemas";

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.config.get().then(setConfig);
    api.config.meta().then(setMeta);
  }, []);

  if (!config || !meta) return <div className="p-6">Carregando…</div>;

  const salvar = async () => {
    setSalvando(true);
    await api.config.save(config);
    await api.config.setEdicao(meta.edicao);
    setSalvando(false);
    alert("Configuração salva.");
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Configuração</h1>

      <section className="space-y-3 mb-6">
        <label className="block">
          <span className="text-sm font-medium">Edição</span>
          <input className="border rounded px-2 py-1 w-full mt-1"
            value={meta.edicao}
            onChange={e => setMeta({ ...meta, edicao: e.target.value })} />
        </label>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Turmas por cargo</h2>
        <div className="grid grid-cols-5 gap-2">
          {(["APF","DPF","EPF","PCF","PPF"] as const).map(c => (
            <label key={c} className="block">
              <span className="text-xs">{c}</span>
              <input type="number" min={0} className="border rounded px-2 py-1 w-full"
                value={config.turmasPorCargo[c]}
                onChange={e => setConfig({ ...config,
                  turmasPorCargo: { ...config.turmasPorCargo, [c]: Number(e.target.value) }
                })} />
            </label>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Critério de distribuição</span>
          <select className="border rounded px-2 py-1 mt-1"
            value={config.criterioDistribuicao}
            onChange={e => setConfig({ ...config, criterioDistribuicao: e.target.value as any })}>
            <option value="completar">completar</option>
            <option value="round-robin">round-robin</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Folga de alojamento (0–0.9)</span>
          <input type="number" step="0.05" min={0} max={0.9}
            className="border rounded px-2 py-1 mt-1 w-32"
            value={config.folgaAlojamento}
            onChange={e => setConfig({ ...config, folgaAlojamento: Number(e.target.value) })} />
        </label>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Normalizações fonéticas</h2>
        <table className="text-sm">
          <thead><tr><th className="text-left">de</th><th className="text-left">para</th><th></th></tr></thead>
          <tbody>
            {config.normalizacoesFoneticas.map((n, i) => (
              <tr key={i}>
                <td><input className="border rounded px-1" value={n.de}
                  onChange={e => {
                    const arr = [...config.normalizacoesFoneticas]; arr[i] = { ...n, de: e.target.value };
                    setConfig({ ...config, normalizacoesFoneticas: arr });
                  }} /></td>
                <td><input className="border rounded px-1" value={n.para}
                  onChange={e => {
                    const arr = [...config.normalizacoesFoneticas]; arr[i] = { ...n, para: e.target.value };
                    setConfig({ ...config, normalizacoesFoneticas: arr });
                  }} /></td>
                <td><button className="text-red-600 text-xs"
                  onClick={() => setConfig({ ...config,
                    normalizacoesFoneticas: config.normalizacoesFoneticas.filter((_, j) => j !== i)
                  })}>x</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="text-blue-600 text-sm mt-2"
          onClick={() => setConfig({ ...config,
            normalizacoesFoneticas: [...config.normalizacoesFoneticas, { de: "", para: "" }]
          })}>+ adicionar</button>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Stop-words (nome de guerra)</h2>
        <input className="border rounded px-2 py-1 w-full"
          value={config.stopWordsNomeGuerra.join(", ")}
          onChange={e => setConfig({ ...config,
            stopWordsNomeGuerra: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
          })} />
      </section>

      <button disabled={salvando} className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={salvar}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Verificar manualmente**

Run: `npm run dev` em `/config`. Editar nº de turmas, salvar, voltar a `/turmas` — `Distribuir` agora respeita a nova config.

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/config.ts src/server/index.ts src/web/api.ts src/web/pages/Configuracao.tsx
git commit -m "feat: tela e rotas de Configuracao"
```

---

### Task 8: Rotas e tela de Backups (TDD)

**Files:**
- Create: `src/server/routes/backups.ts`
- Modify: `src/server/index.ts`, `src/web/api.ts`, `src/web/pages/Backups.tsx`
- Test: `tests/backups.test.ts`

- [ ] **Step 1: Escrever teste**

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backup } from "../src/server/backup";

describe("backup", () => {
  it("cria snapshot e mantém no máximo 10", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cfp-"));
    const dbPath = join(dir, "db.json");
    writeFileSync(dbPath, "{}");
    for (let i = 0; i < 12; i++) {
      await backup(dbPath);
      // tornar timestamps distintos
      await new Promise(r => setTimeout(r, 5));
    }
    const files = readdirSync(join(dir, "backups"));
    expect(files.length).toBeLessThanOrEqual(10);
    expect(files.every(f => f.startsWith("db-"))).toBe(true);
  });
});
```

Run: `npx vitest run tests/backups.test.ts`
Expected: passa (a função já existe do P1; este é um teste de garantia).

- [ ] **Step 2: Implementar `src/server/routes/backups.ts`**

```ts
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
    await backup(dbPath()); // snapshot do estado atual antes de restaurar
    await copyFile(src, dbPath());
    return { ok: true, msg: "Reinicie o servidor para carregar o backup restaurado." };
  });
};

export default backupsRoutes;
```

- [ ] **Step 3: Registrar em `src/server/index.ts`**

```ts
app.register(import("./routes/backups.js"), { prefix: "/api/backups" });
```

- [ ] **Step 4: Estender `src/web/api.ts`**

```ts
  backups: {
    list: () => req<Array<{ nome: string; tamanho: number; mtime: string }>>("/backups"),
    criar: () => req<{ ok: true; path: string }>("/backups", { method: "POST" }),
    restaurar: (nome: string) => req<{ ok: true; msg: string }>(
      "/backups/restaurar", { method: "POST", body: JSON.stringify({ nome }) })
  }
```

- [ ] **Step 5: Implementar `src/web/pages/Backups.tsx`**

```tsx
import { useEffect, useState } from "react";
import { api } from "../api";

export default function BackupsPage() {
  const [list, setList] = useState<Array<{ nome: string; tamanho: number; mtime: string }>>([]);
  const recarregar = () => api.backups.list().then(setList);
  useEffect(() => { recarregar(); }, []);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Backups</h1>
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          onClick={async () => { await api.backups.criar(); recarregar(); }}>
          ▶ Criar snapshot agora
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr><th className="text-left p-2">Arquivo</th><th className="text-left p-2">Quando</th><th className="text-left p-2">Tamanho</th><th></th></tr>
        </thead>
        <tbody>
          {list.map(b => (
            <tr key={b.nome} className="border-b">
              <td className="p-2 font-mono text-xs">{b.nome}</td>
              <td className="p-2">{new Date(b.mtime).toLocaleString("pt-BR")}</td>
              <td className="p-2">{(b.tamanho / 1024).toFixed(1)} KB</td>
              <td className="p-2">
                <button className="text-amber-700 text-xs"
                  onClick={async () => {
                    if (!confirm(`Restaurar ${b.nome}? Estado atual será salvo como backup.`)) return;
                    const r = await api.backups.restaurar(b.nome);
                    alert(r.msg);
                  }}>restaurar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/backups.ts src/server/index.ts src/web/api.ts src/web/pages/Backups.tsx tests/backups.test.ts
git commit -m "feat: rotas e tela de Backups"
```

---

### Task 9: Tela Dashboard

**Files:**
- Modify: `src/web/pages/Dashboard.tsx`

- [ ] **Step 1: Implementar**

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import type { Pessoa, Meta } from "@shared/schemas";

export default function DashboardPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  useEffect(() => {
    api.pessoas.list().then(setPessoas);
    api.config.meta().then(setMeta);
  }, []);

  const total = pessoas.length;
  const porCargo: Record<string, number> = {};
  pessoas.forEach(p => { porCargo[p.cargo] = (porCargo[p.cargo] ?? 0) + 1; });
  const semTurma = pessoas.filter(p => !p.turmaId).length;
  const semAloj = pessoas.filter(p => !p.alojamentoId).length;
  const semNome = pessoas.filter(p => !p.nomeGuerra).length;
  const sj = pessoas.filter(p => p.situacao === "SUB JUDICE").length;
  const fem = pessoas.filter(p => p.sexo === "F").length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{meta?.edicao ?? "—"} <span className="text-slate-500 text-base">· Dashboard</span></h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Card label="Total de pessoas" value={total} />
        <Card label="SUB JUDICE" value={sj} />
        <Card label="Sexo F" value={fem} />
        <Card label="Cargos" value={Object.keys(porCargo).length} />
      </div>

      <h2 className="font-semibold mt-6 mb-2">Por cargo</h2>
      <div className="grid grid-cols-5 gap-2">
        {(["APF","DPF","EPF","PCF","PPF"] as const).map(c => (
          <Card key={c} label={c} value={porCargo[c] ?? 0} />
        ))}
      </div>

      <h2 className="font-semibold mt-6 mb-2">Pendências</h2>
      <ul className="text-sm space-y-1">
        <li><Link to="/pessoas" className="text-blue-600 underline">{semTurma}</Link> sem turma</li>
        <li><Link to="/pessoas" className="text-blue-600 underline">{semAloj}</Link> sem alojamento</li>
        <li><Link to="/nomes" className="text-blue-600 underline">{semNome}</Link> sem nome de guerra</li>
      </ul>

      <div className="mt-8">
        <Link to="/pessoas" className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Ir para Pessoas</Link>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npm run dev` em `/`. Confirmar contadores corretos e links.

- [ ] **Step 3: Commit**

```bash
git add src/web/pages/Dashboard.tsx
git commit -m "feat(web): tela Dashboard com contadores e pendencias"
```

---

### Task 10: Smoke test final do MVP

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos os testes (P1 + P2 + P3) passam.

- [ ] **Step 2: Build de produção**

Run: `npm run build && NODE_ENV=production npm start`
Expected: navegador abre. Walkthrough:
1. `/config` — definir `turmasPorCargo` realista (ex.: APF=4, DPF=2). Salvar.
2. `/pessoas` — importar a planilha real.
3. `/turmas` — Distribuir, observar balanceamento, arrastar uma pessoa.
4. `/alojamentos` — Distribuir, conferir folga.
5. `/nomes` — Gerar, conferir colisões em vermelho.
6. Adicionar pessoa nova em `/pessoas` (botão "Adicionar" — se ainda não existe, criar via curl ou estender a tela; ver nota abaixo).
7. `/backups` — confirmar snapshots criados.

- [ ] **Step 3: Tag final**

```bash
git tag p3-mvp-completo
```

---

## Notas finais (P3)

- A tela Pessoas ainda não tem botão "Adicionar manualmente" — o teste auto-incremental garante que a rota POST funciona; adicionar o botão é trivial e foi omitido no MVP. Para cobrir, criar pessoa via `curl -X POST /api/pessoas -H "content-type: application/json" -d '{...}'` ou adicionar um modal de criação na tela Pessoas em iteração futura.
- A redistribuição incremental trava existentes; isso significa que ao adicionar uma 50ª pessoa no APF, todos os 49 anteriores ficam fixados. Re-rodar Distribuir manualmente solta esses locks (porque o algoritmo ignora locks falsos? não — explicitar: locks foram setados pela própria operação anterior). Para resetar, há duas opções pós-MVP: (a) botão "Re-rodar do zero" que limpa locks não-manuais; (b) distinguir `lockManual` de `lockAuto`. Decidir conforme uso real.
- Restaurar backup via UI grava em `db.json` mas o servidor mantém a versão em memória; usuário deve reiniciar `npm start`. Mensagem na resposta deixa isso explícito.
- Algoritmo de geração de nomes de guerra usa heurística "preferencial" para conflito no cargo — pode produzir colisões legítimas no cargo (mas nunca na turma). UI marca em amarelo para revisão manual.
