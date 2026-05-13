# Distribuidor CFP — Plano 2: Distribuição (Turmas + Alojamentos)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar os algoritmos de distribuição de turmas e alojamentos como funções puras testáveis, expor rotas REST que os disparam, e construir as duas telas Kanban/grid com drag & drop, badges de violação e respeito a `lockManual`.

**Architecture:** Algoritmos puros em `src/server/domain/`, sem dependência de Fastify ou React. Rotas em `src/server/routes/` aplicam algoritmo sobre `db.data` e persistem. UI usa `dnd-kit` com `useSortable`. Validação de violações executada client-side (já temos pessoas + alojamentos) e exibida via badges.

**Tech Stack:** Mesma do P1 — adiciona uso ativo de `@dnd-kit/core` e `@dnd-kit/sortable`.

**Pré-requisito:** Plano 1 concluído (tag `p1-fundacao`).

---

## Estrutura de arquivos

```
src/
├── server/
│   ├── domain/
│   │   ├── distribuirTurmas.ts        # NOVO
│   │   └── distribuirAlojamentos.ts   # NOVO
│   └── routes/
│       ├── turmas.ts                  # NOVO
│       └── alojamentos.ts             # NOVO
└── web/
    ├── api.ts                         # MODIFICADO
    ├── components/
    │   ├── PessoaCard.tsx             # NOVO (compartilhado)
    │   └── ViolationBadge.tsx         # NOVO
    └── pages/
        ├── Turmas.tsx                 # SUBSTITUÍDO
        └── Alojamentos.tsx            # SUBSTITUÍDO

tests/
├── distribuirTurmas.test.ts           # NOVO
├── distribuirAlojamentos.test.ts      # NOVO
├── turmasRoutes.test.ts               # NOVO
└── alojamentosRoutes.test.ts          # NOVO
```

---

### Task 1: Algoritmo `distribuirTurmas` (TDD)

**Files:**
- Create: `src/server/domain/distribuirTurmas.ts`
- Test: `tests/distribuirTurmas.test.ts`

- [ ] **Step 1: Escrever testes**

`tests/distribuirTurmas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { distribuirTurmas } from "../src/server/domain/distribuirTurmas";
import type { Pessoa, Turma, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

function pessoa(p: Partial<Pessoa>): Pessoa {
  return {
    id: p.id ?? uuid(),
    nome: p.nome ?? "X",
    cpf: p.cpf ?? "0",
    cargo: p.cargo ?? "APF",
    sexo: p.sexo ?? "M",
    situacao: p.situacao ?? "REGULAR",
    email: "x@y",
    criadoEm: "2026-05-13T00:00:00Z",
    lockManual: p.lockManual ?? {},
    ...p
  };
}

const baseConfig: Config = {
  turmasPorCargo: { APF: 2, DPF: 1, EPF: 0, PCF: 0, PPF: 0 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [],
  stopWordsNomeGuerra: []
};

function turmasFor(cfg: Config): Turma[] {
  const out: Turma[] = [];
  (Object.keys(cfg.turmasPorCargo) as Array<keyof typeof cfg.turmasPorCargo>).forEach(c => {
    for (let i = 1; i <= cfg.turmasPorCargo[c]; i++) {
      out.push({ id: `${c}-${i}`, cargo: c as any, numero: i, label: `${c}-${String.fromCharCode(64 + i)}` });
    }
  });
  return out;
}

describe("distribuirTurmas — critério completar", () => {
  it("distribui par igualmente entre 2 turmas", () => {
    const pessoas = ["A","B","C","D"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1");
    const t2 = r.filter(p => p.turmaId === "APF-2");
    expect(t1.length).toBe(2);
    expect(t2.length).toBe(2);
  });

  it("ímpar permite apenas uma turma com tamanho ímpar (a última)", () => {
    const pessoas = ["A","B","C","D","E"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1").length;
    const t2 = r.filter(p => p.turmaId === "APF-2").length;
    expect([t1, t2].sort()).toEqual([2, 3]);
    expect(t2).toBe(3); // a última recebe o ímpar
  });

  it("ordena alfabeticamente dentro do cargo", () => {
    const pessoas = ["DELTA","ALPHA","CHARLIE","BRAVO"].map(n => pessoa({ nome: n, cargo: "APF" }));
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const t1 = r.filter(p => p.turmaId === "APF-1").map(p => p.nome);
    expect(t1).toEqual(["ALPHA", "BRAVO"]);
  });
});

describe("distribuirTurmas — balanceamento SUB JUDICE / Sexo F", () => {
  it("distribui SUB JUDICE igualmente entre turmas", () => {
    const pessoas = [
      pessoa({ nome: "A", situacao: "SUB JUDICE" }),
      pessoa({ nome: "B", situacao: "SUB JUDICE" }),
      pessoa({ nome: "C", situacao: "SUB JUDICE" }),
      pessoa({ nome: "D", situacao: "SUB JUDICE" }),
      pessoa({ nome: "E" }), pessoa({ nome: "F" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const sj1 = r.filter(p => p.turmaId === "APF-1" && p.situacao === "SUB JUDICE").length;
    const sj2 = r.filter(p => p.turmaId === "APF-2" && p.situacao === "SUB JUDICE").length;
    expect(Math.abs(sj1 - sj2)).toBeLessThanOrEqual(1);
    expect(sj1 + sj2).toBe(4);
  });

  it("distribui Sexo F igualmente entre turmas", () => {
    const pessoas = [
      pessoa({ nome: "A", sexo: "F" }), pessoa({ nome: "B", sexo: "F" }),
      pessoa({ nome: "C", sexo: "F" }), pessoa({ nome: "D", sexo: "F" }),
      pessoa({ nome: "E" }), pessoa({ nome: "F" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    const f1 = r.filter(p => p.turmaId === "APF-1" && p.sexo === "F").length;
    const f2 = r.filter(p => p.turmaId === "APF-2" && p.sexo === "F").length;
    expect(Math.abs(f1 - f2)).toBeLessThanOrEqual(1);
  });
});

describe("distribuirTurmas — critério round-robin", () => {
  it("distribui um por turma em rodízio", () => {
    const cfg = { ...baseConfig, criterioDistribuicao: "round-robin" as const };
    const pessoas = ["A","B","C","D"].map(n => pessoa({ nome: n }));
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    expect(r.find(p => p.nome === "A")?.turmaId).toBe("APF-1");
    expect(r.find(p => p.nome === "B")?.turmaId).toBe("APF-2");
    expect(r.find(p => p.nome === "C")?.turmaId).toBe("APF-1");
    expect(r.find(p => p.nome === "D")?.turmaId).toBe("APF-2");
  });
});

describe("distribuirTurmas — locks", () => {
  it("não move pessoas com lockManual.turma=true", () => {
    const pessoas = [
      pessoa({ nome: "A", turmaId: "APF-2", lockManual: { turma: true } }),
      pessoa({ nome: "B" }), pessoa({ nome: "C" }), pessoa({ nome: "D" })
    ];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    expect(r.find(p => p.nome === "A")?.turmaId).toBe("APF-2");
  });

  it("cargo com 1 pessoa só vai pra única turma", () => {
    const cfg = { ...baseConfig, turmasPorCargo: { ...baseConfig.turmasPorCargo, DPF: 1 } };
    const pessoas = [pessoa({ nome: "X", cargo: "DPF" })];
    const r = distribuirTurmas(pessoas, turmasFor(cfg), cfg);
    expect(r[0]!.turmaId).toBe("DPF-1");
  });

  it("se nº turmas = 0, deixa turmaId undefined", () => {
    const pessoas = [pessoa({ nome: "X", cargo: "PPF" })];
    const r = distribuirTurmas(pessoas, turmasFor(baseConfig), baseConfig);
    expect(r[0]!.turmaId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/distribuirTurmas.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/server/domain/distribuirTurmas.ts`:

```ts
import type { Pessoa, Turma, Config, Cargo as CargoT } from "../../shared/schemas.js";

type CargoKey = keyof Config["turmasPorCargo"];
const CARGOS: CargoKey[] = ["APF", "DPF", "EPF", "PCF", "PPF"];

export function distribuirTurmas(pessoas: Pessoa[], turmas: Turma[], cfg: Config): Pessoa[] {
  // clonar (evitar mutação externa)
  const out: Pessoa[] = pessoas.map(p => ({ ...p, lockManual: { ...p.lockManual } }));

  for (const cargo of CARGOS) {
    const turmasC = turmas.filter(t => t.cargo === cargo).sort((a, b) => a.numero - b.numero);
    if (turmasC.length === 0) {
      out.filter(p => p.cargo === cargo).forEach(p => { p.turmaId = undefined; });
      continue;
    }

    const doCargo = out.filter(p => p.cargo === cargo);
    const livres = doCargo.filter(p => !p.lockManual.turma);
    const travados = doCargo.filter(p => p.lockManual.turma);

    // limpar atribuição de quem está livre
    livres.forEach(p => { p.turmaId = undefined; });

    // capacidade target por turma (paridade): se ímpar, só a última pode ter ímpar
    const total = doCargo.length;
    const n = turmasC.length;
    const base = Math.floor(total / n);
    const sobra = total - base * n;
    // distribuir sobra preferencialmente em uma única turma (a última)
    const cap: number[] = Array.from({ length: n }, () => base);
    if (sobra > 0) cap[n - 1] = base + sobra;

    // descontar locks
    const atual: number[] = Array.from({ length: n }, () => 0);
    for (const p of travados) {
      const idx = turmasC.findIndex(t => t.id === p.turmaId);
      if (idx >= 0) atual[idx]!++;
    }

    // ordenar livres alfabeticamente por nome
    livres.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    // 3 buckets para balanceamento round-robin
    const bSJ = livres.filter(p => p.situacao === "SUB JUDICE");
    const bF = livres.filter(p => p.situacao !== "SUB JUDICE" && p.sexo === "F");
    const bRest = livres.filter(p => p.situacao !== "SUB JUDICE" && p.sexo === "M");

    const placeRR = (bucket: Pessoa[]) => {
      let i = 0;
      for (const p of bucket) {
        let tentativas = 0;
        while (tentativas < n && atual[i % n]! >= cap[i % n]!) { i++; tentativas++; }
        const slot = i % n;
        p.turmaId = turmasC[slot]!.id;
        atual[slot]!++;
        i++;
      }
    };

    // SJ e F sempre round-robin (balanceamento obrigatório)
    placeRR(bSJ);
    placeRR(bF);

    // restante segue critério escolhido
    if (cfg.criterioDistribuicao === "round-robin") {
      placeRR(bRest);
    } else {
      // completar: preencher turma 1 até cap, depois turma 2…
      let slot = 0;
      for (const p of bRest) {
        while (slot < n && atual[slot]! >= cap[slot]!) slot++;
        if (slot >= n) slot = atual.findIndex(c => c < cap[atual.indexOf(c)]!); // fallback
        if (slot < 0) slot = 0;
        p.turmaId = turmasC[slot]!.id;
        atual[slot]!++;
      }
    }
  }

  return out;
}
```

- [ ] **Step 4: Rodar testes — devem passar**

Run: `npx vitest run tests/distribuirTurmas.test.ts`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/distribuirTurmas.ts tests/distribuirTurmas.test.ts
git commit -m "feat(domain): algoritmo distribuirTurmas com balanceamento SJ/F e locks"
```

---

### Task 2: Rotas REST de turmas (TDD)

**Files:**
- Create: `src/server/routes/turmas.ts`
- Modify: `src/server/index.ts`
- Test: `tests/turmasRoutes.test.ts`

- [ ] **Step 1: Escrever teste**

`tests/turmasRoutes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { openDB } from "../src/server/db";
import turmasRoutes from "../src/server/routes/turmas";
import type { Pessoa } from "../src/shared/schemas";

async function buildApp(seed?: (db: any) => void) {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const db = await openDB(join(dir, "db.json"));
  if (seed) seed(db);
  await db.write();
  const app = Fastify();
  app.decorate("db", db);
  await app.register(turmasRoutes, { prefix: "/api/turmas" });
  return app;
}

const mkP = (n: string, extra: Partial<Pessoa> = {}): Pessoa => ({
  id: uuid(), nome: n, cpf: "0", cargo: "APF", sexo: "M", situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", lockManual: {}, ...extra
});

describe("rotas /api/turmas", () => {
  it("GET / lista turmas geradas pela config", async () => {
    const app = await buildApp(db => {
      db.data.config.turmasPorCargo = { APF: 2, DPF: 1, EPF: 0, PCF: 0, PPF: 0 };
    });
    const r = await app.inject({ method: "GET", url: "/api/turmas" });
    expect(r.statusCode).toBe(200);
    const list = r.json();
    expect(list).toHaveLength(3);
    expect(list.map((t: any) => t.label).sort()).toEqual(["APF-A", "APF-B", "DPF-A"]);
  });

  it("POST /distribuir aplica algoritmo e persiste turmaId em pessoas", async () => {
    const app = await buildApp(db => {
      db.data.config.turmasPorCargo = { APF: 2, DPF: 0, EPF: 0, PCF: 0, PPF: 0 };
      db.data.pessoas = [mkP("A"), mkP("B"), mkP("C"), mkP("D")];
    });
    const r = await app.inject({ method: "POST", url: "/api/turmas/distribuir" });
    expect(r.statusCode).toBe(200);
    const ps = app.db.data.pessoas;
    expect(ps.every(p => p.turmaId)).toBe(true);
  });

  it("PATCH /pessoa/:id/turma seta turmaId e lockManual.turma=true", async () => {
    const app = await buildApp(db => {
      db.data.config.turmasPorCargo = { APF: 2, DPF: 0, EPF: 0, PCF: 0, PPF: 0 };
      db.data.pessoas = [mkP("A")];
    });
    const id = app.db.data.pessoas[0].id;
    // recuperar o id da turma APF-2
    const turmas = (await app.inject({ method: "GET", url: "/api/turmas" })).json();
    const tApfB = turmas.find((t: any) => t.label === "APF-B").id;
    const r = await app.inject({
      method: "PATCH", url: `/api/turmas/pessoa/${id}`,
      payload: { turmaId: tApfB, lock: true }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas[0].turmaId).toBe(tApfB);
    expect(app.db.data.pessoas[0].lockManual.turma).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/turmasRoutes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/routes/turmas.ts`**

```ts
import type { FastifyPluginAsync } from "fastify";
import { v4 as uuid } from "uuid";
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
```

- [ ] **Step 4: Registrar rota**

Em `src/server/index.ts`, adicionar antes de `pessoas`:

```ts
app.register(import("./routes/turmas.js"), { prefix: "/api/turmas" });
```

- [ ] **Step 5: Rodar testes — devem passar**

Run: `npx vitest run tests/turmasRoutes.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/turmas.ts src/server/index.ts tests/turmasRoutes.test.ts
git commit -m "feat(api): rotas /api/turmas (listar, distribuir, mover)"
```

---

### Task 3: Cliente API + componentes compartilhados

**Files:**
- Modify: `src/web/api.ts`
- Create: `src/web/components/PessoaCard.tsx`, `src/web/components/ViolationBadge.tsx`

- [ ] **Step 1: Estender `src/web/api.ts`**

Adicionar ao final do arquivo (antes do export final):

```ts
import type { Turma, Alojamento } from "@shared/schemas";
```

E adicionar ao objeto `api`:

```ts
  turmas: {
    list: () => req<Turma[]>("/turmas"),
    distribuir: () => req<{ ok: true; turmas: number }>("/turmas/distribuir", { method: "POST" }),
    mover: (id: string, turmaId: string | null, lock = true) =>
      req(`/turmas/pessoa/${id}`, { method: "PATCH", body: JSON.stringify({ turmaId, lock }) })
  },
  alojamentos: {
    list: () => req<Alojamento[]>("/alojamentos"),
    distribuir: () => req<{ ok: true }>("/alojamentos/distribuir", { method: "POST" }),
    mover: (id: string, alojamentoId: string | null, lock = true) =>
      req(`/alojamentos/pessoa/${id}`, { method: "PATCH", body: JSON.stringify({ alojamentoId, lock }) })
  }
```

- [ ] **Step 2: Criar `src/web/components/PessoaCard.tsx`**

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Pessoa } from "@shared/schemas";

const cargoColor: Record<string, string> = {
  APF: "bg-blue-100 text-blue-900",
  DPF: "bg-emerald-100 text-emerald-900",
  EPF: "bg-violet-100 text-violet-900",
  PCF: "bg-amber-100 text-amber-900",
  PPF: "bg-rose-100 text-rose-900"
};

export function PessoaCard({ p }: { p: Pessoa }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`px-2 py-1 rounded text-xs cursor-grab ${cargoColor[p.cargo] ?? "bg-slate-100"}`}>
      <span className="truncate">{p.nome}</span>
      <span className="ml-1">
        {p.situacao === "SUB JUDICE" && <span title="SUB JUDICE">⚖</span>}
        {p.sexo === "F" && <span title="Sexo F">♀</span>}
        {p.lockManual.turma && <span title="fixado">🔒</span>}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Criar `src/web/components/ViolationBadge.tsx`**

```tsx
export function ViolationBadge({ msgs }: { msgs: string[] }) {
  if (msgs.length === 0) return null;
  return (
    <span title={msgs.join("\n")}
      className="ml-1 inline-block bg-red-100 text-red-700 text-[10px] px-1 rounded">
      ⚠ {msgs.length}
    </span>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/web/api.ts src/web/components/PessoaCard.tsx src/web/components/ViolationBadge.tsx
git commit -m "feat(web): cliente API estendido + componentes compartilhados de DnD"
```

---

### Task 4: Tela Turmas com drag & drop

**Files:**
- Modify: `src/web/pages/Turmas.tsx`

- [ ] **Step 1: Implementar tela completa**

Substituir `src/web/pages/Turmas.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../api";
import type { Pessoa, Turma } from "@shared/schemas";
import { PessoaCard } from "../components/PessoaCard";
import { ViolationBadge } from "../components/ViolationBadge";

function violacoesDaTurma(membros: Pessoa[], todas: Pessoa[][]): string[] {
  const out: string[] = [];
  // paridade: se múltiplas turmas têm tamanho ímpar, é violação
  const oddCount = todas.filter(t => t.length % 2 === 1).length;
  if (oddCount > 1 && membros.length % 2 === 1) {
    out.push("Mais de uma turma com tamanho ímpar");
  }
  return out;
}

function violacoesGlobais(turmasMap: Map<string, Pessoa[]>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  // balanceamento SUB JUDICE e F dentro do mesmo cargo
  const porCargo = new Map<string, Array<{ id: string; ps: Pessoa[] }>>();
  for (const [id, ps] of turmasMap) {
    const cargo = ps[0]?.cargo;
    if (!cargo) continue;
    if (!porCargo.has(cargo)) porCargo.set(cargo, []);
    porCargo.get(cargo)!.push({ id, ps });
  }
  for (const [, lista] of porCargo) {
    if (lista.length < 2) continue;
    const sjs = lista.map(l => l.ps.filter(p => p.situacao === "SUB JUDICE").length);
    const fs = lista.map(l => l.ps.filter(p => p.sexo === "F").length);
    const desbalSJ = Math.max(...sjs) - Math.min(...sjs) > 1;
    const desbalF = Math.max(...fs) - Math.min(...fs) > 1;
    lista.forEach(l => {
      const arr = out.get(l.id) ?? [];
      if (desbalSJ) arr.push("SUB JUDICE desbalanceado no cargo");
      if (desbalF) arr.push("Sexo F desbalanceado no cargo");
      if (arr.length) out.set(l.id, arr);
    });
  }
  return out;
}

export default function TurmasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setTurmas(await api.turmas.list());
  };
  useEffect(() => { recarregar(); }, []);

  const semTurma = useMemo(() => pessoas.filter(p => !p.turmaId), [pessoas]);
  const porTurma = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    turmas.forEach(t => m.set(t.id, []));
    pessoas.forEach(p => { if (p.turmaId && m.has(p.turmaId)) m.get(p.turmaId)!.push(p); });
    return m;
  }, [pessoas, turmas]);
  const violacoesPorTurma = useMemo(() => violacoesGlobais(porTurma), [porTurma]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const pessoaId = String(e.active.id);
    const overId = String(e.over.id);
    const targetTurma = turmas.find(t => t.id === overId)
      ?? turmas.find(t => t.id === pessoas.find(p => p.id === overId)?.turmaId);
    if (!targetTurma) return;
    const p = pessoas.find(x => x.id === pessoaId);
    if (!p || p.turmaId === targetTurma.id) return;
    if (p.cargo !== targetTurma.cargo) {
      alert(`Não é possível mover ${p.cargo} para turma ${targetTurma.cargo}.`);
      return;
    }
    await api.turmas.mover(pessoaId, targetTurma.id, true);
    await recarregar();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Turmas</h1>
        <div className="flex gap-2">
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            onClick={async () => { await api.turmas.distribuir(); recarregar(); }}>
            ▶ Distribuir
          </button>
        </div>
      </div>

      {semTurma.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          {semTurma.length} pessoa(s) sem turma — clique em <strong>Distribuir</strong>.
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {turmas.map(t => {
            const ps = porTurma.get(t.id) ?? [];
            const violations = [
              ...violacoesDaTurma(ps, [...porTurma.values()].filter(x => x[0]?.cargo === t.cargo)),
              ...(violacoesPorTurma.get(t.id) ?? [])
            ];
            return (
              <div key={t.id} className="min-w-[180px] bg-white border rounded-lg p-2">
                <div className="font-semibold text-sm mb-2 flex justify-between">
                  <span>{t.label} <ViolationBadge msgs={violations} /></span>
                  <span className="text-slate-500 text-xs">{ps.length}</span>
                </div>
                <SortableContext items={ps.map(p => p.id)} strategy={verticalListSortingStrategy} id={t.id}>
                  <div className="flex flex-col gap-1 min-h-[40px]" data-turma={t.id}>
                    {ps.map(p => <PessoaCard key={p.id} p={p} />)}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      <div className="mt-6 text-xs text-slate-500">
        ⚖ SUB JUDICE · ♀ Sexo F · 🔒 fixado manualmente
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev`. Em `http://localhost:5173/pessoas`, importe a planilha. Vá para Configuração (placeholder) — temporariamente, edite `data/db.json` definindo `turmasPorCargo` com valores realistas (ex.: APF: 3) **fora** do servidor, ou simplesmente clique Distribuir aceitando os defaults (1 por cargo). Vá para `/turmas`:

- Colunas Kanban aparecem por turma.
- Clique Distribuir — pessoas se distribuem.
- Arraste uma pessoa entre turmas do mesmo cargo — atualiza no servidor.
- Tentar arrastar APF para coluna DPF deve gerar alerta.

- [ ] **Step 3: Commit**

```bash
git add src/web/pages/Turmas.tsx
git commit -m "feat(web): tela Turmas com Kanban DnD e badges de violacao"
```

---

### Task 5: Algoritmo `distribuirAlojamentos` (TDD)

**Files:**
- Create: `src/server/domain/distribuirAlojamentos.ts`
- Test: `tests/distribuirAlojamentos.test.ts`

- [ ] **Step 1: Escrever testes**

`tests/distribuirAlojamentos.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { distribuirAlojamentos } from "../src/server/domain/distribuirAlojamentos";
import type { Pessoa, Alojamento, Config } from "../src/shared/schemas";
import { v4 as uuid } from "uuid";

const cfg: Config = {
  turmasPorCargo: { APF: 1, DPF: 1, EPF: 1, PCF: 1, PPF: 1 },
  criterioDistribuicao: "completar",
  folgaAlojamento: 0.15,
  normalizacoesFoneticas: [], stopWordsNomeGuerra: []
};

const mkP = (n: string, sexo: "M" | "F" = "M", cargo: any = "APF", lock = false): Pessoa => ({
  id: uuid(), nome: n, cpf: "0", cargo, sexo, situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z",
  lockManual: lock ? { alojamento: true } : {}
});

const aloj = (id: string, cargoSexo: string, max: number): Alojamento =>
  ({ id, bloco: id.charAt(0), cargoSexo, max });

describe("distribuirAlojamentos", () => {
  it("aloca apenas em alojamentos compatíveis com sexo", () => {
    const ps = [mkP("A", "F"), mkP("B", "F")];
    const al = [aloj("A 01", "APF/M", 6), aloj("G 02", "APF/F", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r[0]!.alojamentoId).toBe("G 02");
    expect(r[1]!.alojamentoId).toBe("G 02");
  });

  it("respeita capacidade máxima sem folga quando suficientemente cheio", () => {
    const ps = Array.from({ length: 10 }, (_, i) => mkP(`P${i}`, "M"));
    const al = [aloj("A 01", "APF/M", 6), aloj("A 02", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    const a01 = r.filter(p => p.alojamentoId === "A 01").length;
    const a02 = r.filter(p => p.alojamentoId === "A 02").length;
    expect(a01 + a02).toBe(10);
    expect(a01).toBeLessThanOrEqual(6);
    expect(a02).toBeLessThanOrEqual(6);
  });

  it("distribui folga entre alojamentos (não concentra em um só)", () => {
    const ps = Array.from({ length: 10 }, (_, i) => mkP(`P${i}`, "M"));
    const al = [aloj("A 01", "APF/M", 6), aloj("A 02", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, { ...cfg, folgaAlojamento: 0.2 });
    const a01 = r.filter(p => p.alojamentoId === "A 01").length;
    const a02 = r.filter(p => p.alojamentoId === "A 02").length;
    expect(Math.abs(a01 - a02)).toBeLessThanOrEqual(1);
  });

  it("respeita lockManual.alojamento", () => {
    const ps = [
      mkP("A", "M"), mkP("B", "M")
    ];
    ps[0]!.alojamentoId = "A 02";
    ps[0]!.lockManual.alojamento = true;
    const al = [aloj("A 01", "APF/M", 6), aloj("A 02", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r.find(p => p.nome === "A")?.alojamentoId).toBe("A 02");
  });

  it("Sexo F prefere blocos G, D, E nessa ordem", () => {
    const ps = [mkP("A", "F"), mkP("B", "F")];
    const al = [
      aloj("E 01", "DPF/F", 6),
      aloj("D 01", "DPF/F", 6),
      aloj("G 01", "DPF/F", 6)
    ];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r[0]!.alojamentoId).toBe("G 01");
  });

  it("deixa alojamentoId undefined se nenhum compatível", () => {
    const ps = [mkP("A", "F")];
    const al = [aloj("A 01", "APF/M", 6)];
    const r = distribuirAlojamentos(ps, al, cfg);
    expect(r[0]!.alojamentoId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/distribuirAlojamentos.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`src/server/domain/distribuirAlojamentos.ts`:

```ts
import type { Pessoa, Alojamento, Config } from "../../shared/schemas.js";

const PREF_F = ["G", "D", "E"];

function compativel(p: Pessoa, a: Alojamento): boolean {
  // cargoSexo no formato "APF/M" — usamos só a parte do sexo
  const partes = a.cargoSexo.split("/");
  const sexoAloj = (partes[1] ?? partes[0] ?? "").trim().toUpperCase();
  return sexoAloj === p.sexo;
}

function ordenarAlojamentosPara(sexo: "M" | "F", alojs: Alojamento[]): Alojamento[] {
  if (sexo !== "F") return [...alojs].sort((a, b) => a.id.localeCompare(b.id));
  // F: preferir blocos PREF_F na ordem dada; demais por id
  return [...alojs].sort((a, b) => {
    const ia = PREF_F.indexOf(a.bloco);
    const ib = PREF_F.indexOf(b.bloco);
    const ra = ia < 0 ? 99 : ia;
    const rb = ib < 0 ? 99 : ib;
    if (ra !== rb) return ra - rb;
    return a.id.localeCompare(b.id);
  });
}

export function distribuirAlojamentos(pessoas: Pessoa[], alojamentos: Alojamento[], cfg: Config): Pessoa[] {
  const out = pessoas.map(p => ({ ...p, lockManual: { ...p.lockManual } }));

  for (const sexo of ["M", "F"] as const) {
    const doSexo = out.filter(p => p.sexo === sexo);
    const compats = alojamentos.filter(a => doSexo.some(p => compativel(p, a)));
    if (compats.length === 0) {
      doSexo.forEach(p => { if (!p.lockManual.alojamento) p.alojamentoId = undefined; });
      continue;
    }
    const ordenados = ordenarAlojamentosPara(sexo, compats);

    const livres = doSexo.filter(p => !p.lockManual.alojamento);
    const travados = doSexo.filter(p => p.lockManual.alojamento);
    livres.forEach(p => { p.alojamentoId = undefined; });

    // capacidade efetiva por alojamento aplicando folga
    const capEfetiva = ordenados.map(a => Math.max(1, Math.floor(a.max * (1 - cfg.folgaAlojamento))));
    // ocupação atual (de travados)
    const ocup = ordenados.map(a => travados.filter(p => p.alojamentoId === a.id).length);

    // ordenar livres por cargo + nome para agrupar mesmo cargo
    livres.sort((a, b) => a.cargo.localeCompare(b.cargo) || a.nome.localeCompare(b.nome, "pt-BR"));

    // distribuir round-robin para espalhar folga
    let i = 0;
    for (const p of livres) {
      let tentadas = 0;
      while (tentadas < ordenados.length) {
        const slot = i % ordenados.length;
        const a = ordenados[slot]!;
        if (compativel(p, a) && ocup[slot]! < capEfetiva[slot]!) {
          p.alojamentoId = a.id;
          ocup[slot]!++;
          i++;
          break;
        }
        i++; tentadas++;
      }
      // se cap efetiva esgotou, tentar até o max (excedendo folga)
      if (!p.alojamentoId) {
        for (let s = 0; s < ordenados.length; s++) {
          const a = ordenados[s]!;
          if (compativel(p, a) && ocup[s]! < a.max) {
            p.alojamentoId = a.id;
            ocup[s]!++;
            break;
          }
        }
      }
    }
  }

  return out;
}
```

- [ ] **Step 4: Rodar testes — devem passar**

Run: `npx vitest run tests/distribuirAlojamentos.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/server/domain/distribuirAlojamentos.ts tests/distribuirAlojamentos.test.ts
git commit -m "feat(domain): distribuirAlojamentos com folga e preferencia por bloco"
```

---

### Task 6: Rotas REST de alojamentos (TDD)

**Files:**
- Create: `src/server/routes/alojamentos.ts`
- Modify: `src/server/index.ts`
- Test: `tests/alojamentosRoutes.test.ts`

- [ ] **Step 1: Escrever teste**

`tests/alojamentosRoutes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { v4 as uuid } from "uuid";
import { openDB } from "../src/server/db";
import alojamentosRoutes from "../src/server/routes/alojamentos";
import type { Pessoa } from "../src/shared/schemas";

async function buildApp(seed?: (db: any) => void) {
  const dir = mkdtempSync(join(tmpdir(), "cfp-"));
  const db = await openDB(join(dir, "db.json"));
  if (seed) seed(db);
  await db.write();
  const app = Fastify();
  app.decorate("db", db);
  await app.register(alojamentosRoutes, { prefix: "/api/alojamentos" });
  return app;
}

const mkP = (n: string, sexo: "M" | "F" = "M"): Pessoa => ({
  id: uuid(), nome: n, cpf: "0", cargo: "APF", sexo, situacao: "REGULAR",
  email: "x@y", criadoEm: "2026-05-13T00:00:00Z", lockManual: {}
});

describe("rotas /api/alojamentos", () => {
  it("GET / lista alojamentos persistidos", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 }];
    });
    const r = await app.inject({ method: "GET", url: "/api/alojamentos" });
    expect(r.json()).toHaveLength(1);
  });

  it("POST /distribuir aplica algoritmo", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [{ id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 }];
      db.data.pessoas = [mkP("A"), mkP("B")];
    });
    const r = await app.inject({ method: "POST", url: "/api/alojamentos/distribuir" });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas.every(p => p.alojamentoId === "A 01")).toBe(true);
  });

  it("PATCH /pessoa/:id seta alojamentoId e lock", async () => {
    const app = await buildApp(db => {
      db.data.alojamentos = [
        { id: "A 01", bloco: "A", cargoSexo: "APF/M", max: 6 },
        { id: "A 02", bloco: "A", cargoSexo: "APF/M", max: 6 }
      ];
      db.data.pessoas = [mkP("A")];
    });
    const id = app.db.data.pessoas[0].id;
    const r = await app.inject({
      method: "PATCH", url: `/api/alojamentos/pessoa/${id}`,
      payload: { alojamentoId: "A 02", lock: true }
    });
    expect(r.statusCode).toBe(200);
    expect(app.db.data.pessoas[0].alojamentoId).toBe("A 02");
    expect(app.db.data.pessoas[0].lockManual.alojamento).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `npx vitest run tests/alojamentosRoutes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `src/server/routes/alojamentos.ts`**

```ts
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
```

- [ ] **Step 4: Registrar em `src/server/index.ts`**

```ts
app.register(import("./routes/alojamentos.js"), { prefix: "/api/alojamentos" });
```

- [ ] **Step 5: Rodar testes — devem passar**

Run: `npx vitest run tests/alojamentosRoutes.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/server/routes/alojamentos.ts src/server/index.ts tests/alojamentosRoutes.test.ts
git commit -m "feat(api): rotas /api/alojamentos"
```

---

### Task 7: Tela Alojamentos com drag & drop

**Files:**
- Modify: `src/web/pages/Alojamentos.tsx`

- [ ] **Step 1: Implementar tela completa**

```tsx
import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../api";
import type { Pessoa, Alojamento } from "@shared/schemas";
import { PessoaCard } from "../components/PessoaCard";
import { ViolationBadge } from "../components/ViolationBadge";

export default function AlojamentosPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [alojs, setAlojs] = useState<Alojamento[]>([]);

  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setAlojs(await api.alojamentos.list());
  };
  useEffect(() => { recarregar(); }, []);

  const porAlojamento = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    alojs.forEach(a => m.set(a.id, []));
    pessoas.forEach(p => { if (p.alojamentoId && m.has(p.alojamentoId)) m.get(p.alojamentoId)!.push(p); });
    return m;
  }, [pessoas, alojs]);

  const semAlojamento = pessoas.filter(p => !p.alojamentoId);

  // agrupar por bloco
  const blocos = useMemo(() => {
    const m = new Map<string, Alojamento[]>();
    alojs.forEach(a => {
      if (!m.has(a.bloco)) m.set(a.bloco, []);
      m.get(a.bloco)!.push(a);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [alojs]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const pessoaId = String(e.active.id);
    const overId = String(e.over.id);
    const targetAloj = alojs.find(a => a.id === overId)
      ?? alojs.find(a => a.id === pessoas.find(p => p.id === overId)?.alojamentoId);
    if (!targetAloj) return;
    const p = pessoas.find(x => x.id === pessoaId);
    if (!p || p.alojamentoId === targetAloj.id) return;
    const sexoAloj = (targetAloj.cargoSexo.split("/")[1] ?? "").trim().toUpperCase();
    if (sexoAloj && sexoAloj !== p.sexo) {
      alert(`Alojamento ${targetAloj.id} é destinado a sexo ${sexoAloj}.`);
      return;
    }
    await api.alojamentos.mover(pessoaId, targetAloj.id, true);
    await recarregar();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Alojamentos</h1>
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          onClick={async () => { await api.alojamentos.distribuir(); recarregar(); }}>
          ▶ Distribuir
        </button>
      </div>

      {semAlojamento.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          {semAlojamento.length} pessoa(s) sem alojamento.
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="space-y-6">
          {blocos.map(([bloco, lista]) => (
            <section key={bloco}>
              <h2 className="font-semibold text-sm text-slate-700 mb-2">Bloco {bloco}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {lista.map(a => {
                  const ps = porAlojamento.get(a.id) ?? [];
                  const violations: string[] = [];
                  if (ps.length > a.max) violations.push(`Lotação excedida (${ps.length}/${a.max})`);
                  const sexoAloj = (a.cargoSexo.split("/")[1] ?? "").trim().toUpperCase();
                  if (sexoAloj && ps.some(p => p.sexo !== sexoAloj)) violations.push("Sexo incompatível");
                  const folga = a.max - ps.length;
                  return (
                    <div key={a.id} className="bg-white border rounded-lg p-2">
                      <div className="font-semibold text-sm flex justify-between mb-2">
                        <span>{a.id} <span className="text-slate-500 font-normal">{a.cargoSexo}</span> <ViolationBadge msgs={violations} /></span>
                        <span className="text-slate-500 text-xs">{ps.length}/{a.max} (folga {folga})</span>
                      </div>
                      <SortableContext items={ps.map(p => p.id)} strategy={verticalListSortingStrategy} id={a.id}>
                        <div className="flex flex-col gap-1 min-h-[40px]" data-aloj={a.id}>
                          {ps.map(p => <PessoaCard key={p.id} p={p} />)}
                        </div>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 2: Verificar manualmente**

Run: `npm run dev` em `http://localhost:5173/alojamentos`:
- Importar planilha caso ainda não tenha; alojamentos populados.
- Clicar Distribuir — pessoas atribuídas.
- Arrastar entre alojamentos do mesmo sexo — atualiza.
- Tentar arrastar M para alojamento F — alerta bloqueia.

- [ ] **Step 3: Commit**

```bash
git add src/web/pages/Alojamentos.tsx
git commit -m "feat(web): tela Alojamentos com grid por bloco e DnD"
```

---

### Task 8: Smoke test final do plano

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos os testes (de P1 e P2) passam.

- [ ] **Step 2: Walkthrough manual end-to-end**

Run: `npm run dev`. Sequência:
1. Importar `~/Downloads/PLANILHA DE RECEPCAO CFP 2026 (1).xlsm`.
2. (Por enquanto, editar `data/db.json` manualmente para definir `turmasPorCargo` realista, ex.: APF: 4, DPF: 2 — Configuração será UI no P3.)
3. Em /turmas, clicar Distribuir — verificar visualmente balanceamento.
4. Arrastar uma pessoa entre turmas — confirmar persistência (recarregar a página).
5. Em /alojamentos, clicar Distribuir — verificar capacidades.
6. Arrastar uma pessoa entre alojamentos do mesmo sexo.
7. Inspecionar `data/db.json` e `data/backups/` — backups foram gerados nas operações destrutivas.

- [ ] **Step 3: Tag**

```bash
git tag p2-distribuicao
```

---

## Notas finais (P2)

- A geração de IDs de turma (`APF-1`, `APF-2`, etc.) é determinística — mudar `turmasPorCargo` para um número menor descarta as turmas removidas mas não as referências em `pessoas.turmaId`. Esse caso será tratado quando a UI de Configuração existir (P3): ao salvar config, redistribuição automática.
- Os algoritmos toleram incoerência (pessoa apontando para turma inexistente): a UI mostra como "sem turma" e um clique em Distribuir resolve.
- Drag & drop entre cargos diferentes é bloqueado por UX simples (alert). Se quiser permitir trocar de cargo via DnD, será uma extensão futura.
