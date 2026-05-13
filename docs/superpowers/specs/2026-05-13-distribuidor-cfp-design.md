# Distribuidor CFP — Design

**Data:** 2026-05-13
**Status:** Aprovado para implementação

## Objetivo

Substituir a planilha xlsm de recepção do CFP por uma aplicação local que distribui pessoas em **turmas** e **alojamentos** e gera **nomes de guerra**, armazenando tudo em um arquivo JSON local. Uso pessoal, instalação simples (`npm install && npm start`).

## Escopo (MVP)

- Cadastro/import de pessoas (FIC_COREC) a partir de `.xlsm`/CSV.
- Distribuição automática de turmas (com 2 critérios) e alojamentos (com folga 15%).
- Geração de nomes de guerra com unicidade fonética por turma.
- Edição manual livre via drag & drop, com avisos de violação de regras.
- Inclusão incremental de novas pessoas após distribuição inicial.
- Persistência em `data/db.json` com backups automáticos rotativos.

## Arquitetura

**Stack:**
- **Frontend:** Vite + React + TypeScript + TailwindCSS + shadcn/ui.
- **Backend (mesmo processo):** Fastify servindo a SPA buildada e expondo REST em `/api/*`.
- **Persistência:** `lowdb` sobre `data/db.json`. Backup automático em `data/backups/db-YYYYMMDD-HHmm.json` a cada escrita relevante; rotação mantém os 10 mais recentes.
- **Parsing xlsm:** `xlsx` (SheetJS) executado **no servidor** ao receber upload, evitando bundle pesado no front.
- **Drag & drop:** `dnd-kit`.
- **Validação:** `zod`, schemas compartilhados front/back via `src/shared/schemas.ts`.
- **Testes:** `vitest`.

**Comandos:**

```bash
npm install      # uma vez
npm start        # toda execução — sobe Fastify e abre http://localhost:5173 no navegador
npm test         # roda suite de testes do domínio
npm run dev      # modo dev com hot reload (Vite + tsx watch no servidor)
```

**Estrutura de pastas:**

```
planilha/
├── data/
│   ├── db.json                  # base local (gitignore)
│   └── backups/                 # rotação automática (gitignore)
├── public/
│   └── logo.png                 # logo institucional usada no header
├── src/
│   ├── server/
│   │   ├── index.ts             # bootstrap Fastify + abertura do navegador
│   │   ├── db.ts                # singleton lowdb
│   │   ├── domain/
│   │   │   ├── distribuirTurmas.ts
│   │   │   ├── distribuirAlojamentos.ts
│   │   │   ├── gerarNomesGuerra.ts
│   │   │   ├── redistribuirIncremental.ts
│   │   │   └── normalizacaoFonetica.ts
│   │   └── routes/
│   │       ├── pessoas.ts
│   │       ├── turmas.ts
│   │       ├── alojamentos.ts
│   │       ├── nomesGuerra.ts
│   │       ├── importar.ts
│   │       └── backups.ts
│   ├── shared/
│   │   └── schemas.ts           # zod: Pessoa, Turma, Alojamento, Config, DB
│   └── web/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts               # client fetch tipado
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Pessoas.tsx
│       │   ├── Turmas.tsx
│       │   ├── Alojamentos.tsx
│       │   ├── NomesGuerra.tsx
│       │   ├── Configuracao.tsx
│       │   └── Backups.tsx
│       └── components/
│           ├── Sidebar.tsx
│           ├── PersonCard.tsx
│           ├── KanbanColumn.tsx
│           └── ...
├── tests/
│   ├── distribuirTurmas.test.ts
│   ├── distribuirAlojamentos.test.ts
│   └── gerarNomesGuerra.test.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Princípio de design:** os algoritmos em `domain/` são funções puras `(estado, config) => novoEstado`, sem dependência de Fastify/React/lowdb. Isso garante testabilidade isolada e troca de UI sem reescrever regras de negócio.

## Modelo de dados (`db.json`)

```ts
{
  version: 1,
  meta: {
    edicao: string,              // ex: "CFP 2026"
    criadoEm: ISO,
    atualizadoEm: ISO
  },
  config: {
    turmasPorCargo: {
      APF: number, DPF: number, EPF: number, PCF: number, PPF: number
    },
    criterioDistribuicao: "completar" | "round-robin",
    folgaAlojamento: number,     // padrão 0.15
    normalizacoesFoneticas: Array<{de: string, para: string}>,
    stopWordsNomeGuerra: string[]  // padrão: DE, DI, DO, DOS, E, D, SAO
  },
  alojamentos: [
    {
      id: string,                // ex: "A 01"
      bloco: string,             // primeira letra do id
      cargoSexo: string,         // ex: "APF/M" — vem da planilha
      max: number
    }
  ],
  pessoas: [
    {
      id: string,                // uuid
      // obrigatórios
      nome: string,
      cpf: string,
      cargo: "APF" | "DPF" | "EPF" | "PCF" | "PPF",
      sexo: "M" | "F",
      situacao: "REGULAR" | "SUB JUDICE" | "ESPECIAL",
      email: string,
      // opcionais
      dataNascimento?: ISO,
      fatoRH?: string,
      tipoSanguineo?: string,
      dddTelefoneFixo?: string,
      numTelefoneFixo?: string,
      dddCel?: string,
      celular?: string,
      curso?: string,
      // atribuições (preenchidas pelos algoritmos)
      turmaId?: string,
      alojamentoId?: string,
      nomeGuerra?: string,
      // metadados
      criadoEm: ISO,
      lockManual: {
        turma?: boolean,
        alojamento?: boolean,
        nomeGuerra?: boolean
      }
    }
  ],
  turmas: [
    {
      id: string,                // uuid
      cargo: "APF" | "DPF" | "EPF" | "PCF" | "PPF",
      numero: number,
      label: string              // ex: "APF-A"
    }
  ],
  historico: [
    { ts: ISO, acao: string, detalhes: object }
  ]
}
```

**Decisões:**

- Atribuições residem na própria pessoa (`turmaId`, `alojamentoId`, `nomeGuerra`) — evita FK divergentes e simplifica filtros.
- `lockManual` permite re-rodar algoritmos sem desfazer ajustes manuais.
- `historico` append-only viabiliza undo simples e auditoria.
- `version` permite migração de schema sem quebrar bases antigas.
- Alojamentos importados uma vez da aba "Alojamento (vagas)"; depois editáveis pela UI.

## Telas

Layout: sidebar fixa (200px) com `logo.png` no topo + área principal.

- **Dashboard** — totais por cargo/sexo/situação, status (X pessoas sem turma, Y sem alojamento, Z sem nome de guerra), botão "Importar xlsm".
- **Pessoas** — tabela com filtros (cargo, sexo, situação, sem turma, sem alojamento, sem nome), busca por nome/CPF, edição inline, adicionar manual, exportar JSON/CSV.
- **Turmas** — visualização Kanban (uma coluna por turma); drag & drop entre colunas; badges visuais para SUB JUDICE (⚖), Sexo F (♀), fixado manualmente (🔒); cor de fundo por cargo; aviso vermelho quando ação viola paridade ou balanceamento; botões Distribuir/Re-rodar (re-rodar respeita locks).
- **Alojamentos** — grid agrupado por bloco; cada card mostra `Aloj XX  ocupação/max  (folga: N vagas)`; drag & drop entre cards; aviso quando ultrapassar `max` ou misturar sexos incompatíveis.
- **Nomes de guerra** — agrupado por turma; cada linha mostra nome completo + sugestão de nome de guerra; alerta vermelho para colisão fonética dentro da turma e amarelo para colisão dentro do cargo; aceitar/editar manualmente (seta `lockManual.nomeGuerra`).
- **Configuração** — `edicao`, `turmasPorCargo`, `criterioDistribuicao`, `folgaAlojamento`, tabela de normalizações fonéticas e stop-words.
- **Backups** — lista os snapshots em `data/backups/`, permite restaurar (substitui `db.json` após confirmação) e fazer download manual.

## Algoritmos

Todos em `src/server/domain/`, funções puras testadas isoladamente.

### `distribuirTurmas(pessoas, config) → pessoas`

1. Para cada cargo:
   1. Se nº pessoas / nº turmas dá ímpar, permitir tamanho ímpar **somente em uma** turma (a última); demais ficam pares ajustando entre `floor` e `ceil`.
   2. Separar 3 buckets ordenados alfabeticamente: SUB JUDICE, Sexo F (não-SJ), demais.
   3. Distribuir cada bucket round-robin pelas turmas (garante balanceamento de SUB JUDICE e F).
   4. Dentro do espaço restante de cada turma, alocar pelo critério escolhido:
      - **`completar`** — preenche turma 1 até a cota, depois turma 2, etc.
      - **`round-robin`** — distribui um por vez pelas turmas em rodízio.
2. Pessoas com `lockManual.turma === true` mantêm sua turma; algoritmo distribui apenas as livres nas vagas restantes.

### `distribuirAlojamentos(pessoas, alojamentos, config) → pessoas`

1. Filtrar alojamentos compatíveis por sexo do ocupante (campo `cargoSexo`).
2. Sexo F: ordem de preferência **G, D, E**. Sexo M: ordem definida pela tabela importada (preferir blocos com mesmo cargo).
3. Calcular nº alojamentos necessários considerando folga: `ceil(N / (max * (1 - folga)))`.
4. Distribuir folga **entre** os alojamentos selecionados (round-robin de "uma vaga vazia por vez"), evitando concentração.
5. Dentro de cada alojamento, agrupar por mesmo cargo quando possível.
6. Pessoas com `lockManual.alojamento === true` mantêm seu alojamento.

### `gerarNomesGuerra(pessoas, config) → pessoas`

1. Tokenizar nome completo, remover stop-words isoladas (config: `DE`, `DI`, `DO`, `DOS`, `E`, `D`, `SAO`).
2. Para sexo F: candidato 1 = primeiro nome.
3. Normalizar fonéticamente cada token via tabela em config: `TH→T`, `LL→L`, `CC→C`, `NN→N`, `PH→F`, `LUIZ→LUIS`, `SOUZA→SOUSA`, `RACHEL→RAQUEL`, `VICTOR→VITOR`.
4. Tentar candidatos em ordem: primeiro nome → último nome → 1º+último → 1º+do_meio → composto incluindo stop-word (ex.: "DA SILVA").
5. Verificar unicidade na **turma** (obrigatório) e no **cargo** (preferencial — só muda se conseguir sem violar turma).
6. Se nenhum candidato único, gravar `nomeGuerra: null` e flag `precisaResolverManual: true`.
7. Pessoas com `lockManual.nomeGuerra === true` preservam o valor existente.

### `redistribuirIncremental(novaPessoa, estado) → estado`

- Insere na turma do mesmo cargo com menor contagem (respeitando paridade e balanceamento SUB JUDICE/F).
- Insere no alojamento de sexo/cargo compatível com mais folga restante.
- Gera nome de guerra evitando colisão com os já existentes na turma.

## Tratamento de erros e violações

- Validação de upload xlsm: campos obrigatórios faltantes geram relatório por linha antes de gravar.
- Drag & drop: ação que viola regra (lotação, paridade, balanceamento) é aceita mas marcada com badge de aviso na coluna; nada é silenciado.
- Backup automático antes de qualquer operação destrutiva (re-rodar algoritmo, restaurar backup, importar).

## Estratégia de testes

- Cada algoritmo: fixtures de 10–30 pessoas em `tests/fixtures/`, assert no shape de saída.
- Casos de borda obrigatórios:
  - `distribuirTurmas`: ímpar em múltiplas turmas, todos travados, cargo com 1 pessoa só.
  - `distribuirAlojamentos`: alojamento cheio, sem alojamento compatível para o sexo, folga 0%.
  - `gerarNomesGuerra`: colisão fonética irresolvível, nome só com stop-words, normalizações encadeadas.
  - `redistribuirIncremental`: turma cheia, todos os alojamentos lotados.
- Testes do servidor: smoke test de cada rota REST com lowdb em arquivo temporário.

## Fora do escopo (MVP)

- Multi-edição simultânea (apenas uma `meta.edicao` por `db.json`; trocar = trocar arquivo).
- Autenticação (uso pessoal local).
- Sincronização com nuvem.
- Geração dos demais artefatos da planilha original (Cracha, Enxoval, Educa, Rest etc.) — podem virar fases posteriores.

## Plano de implementação sugerido (alto nível)

1. Scaffold do monorepo (Vite + Fastify + TS + Tailwind + shadcn).
2. Schemas zod e lowdb com migração v0→v1.
3. Rota de import xlsm + tela Pessoas (CRUD).
4. Algoritmo + tela de Turmas com dnd.
5. Algoritmo + tela de Alojamentos com dnd.
6. Algoritmo + tela de Nomes de guerra.
7. Redistribuição incremental + tela de Configuração + Backups.
8. Polimento de Dashboard e exportações.

O plano detalhado por etapa será produzido pelo skill `writing-plans` em seguida.
