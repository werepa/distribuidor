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

// Núcleo realmente necessário para distribuir; demais campos são opcionais.
const obrig = ["nome", "cpf", "cargo", "sexo"] as const;

const COL_MAP: Record<string, string> = {
  NOME: "nome", CPF: "cpf", CARGO: "cargo", SEXO: "sexo",
  EMAIL: "email", "SITUAÇÃO": "situacao", SITUACAO: "situacao",
  DATANASCIMENTO: "dataNascimento", FATORH: "fatoRH", TIPOSANGUINEO: "tipoSanguineo",
  DDDTELEFONEFIXO: "dddTelefoneFixo", NUMTELEFONEFIXO: "numTelefoneFixo",
  DDDCEL: "dddCel", CELULAR: "celular", CURSO: "curso"
};

function mapHeader(rows: any[][]): Record<string, number> {
  const idx: Record<string, number> = {};
  if (rows.length === 0) return idx;
  rows[0]!.map(h => String(h ?? "").trim().toUpperCase())
    .forEach((h, i) => { if (COL_MAP[h]) idx[COL_MAP[h]!] = i; });
  return idx;
}

// Aceita "R"/"REGULAR", "SJ"/"SUB JUDICE", "E"/"ESP"/"ESPECIAL" (case-insensitive).
function normSituacao(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim().toUpperCase();
  if (s === "R" || s === "REGULAR") return "REGULAR";
  if (s === "SJ" || s === "SUB JUDICE" || s === "SUBJUDICE") return "SUB JUDICE";
  if (s === "E" || s === "ESP" || s === "ESPECIAL") return "ESPECIAL";
  return s; // deixa o safeParse decidir se é inválido
}

// Escolhe a aba cujo cabeçalho casa com mais colunas conhecidas, exigindo o núcleo.
function escolherAba(wb: XLSX.WorkBook): any[][] | undefined {
  let melhor: { score: number; rows: any[][] } | undefined;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name]!, { header: 1, raw: false });
    const idx = mapHeader(rows);
    if (obrig.some(k => idx[k] === undefined)) continue;
    const score = Object.keys(idx).length;
    if (!melhor || score > melhor.score) melhor = { score, rows };
  }
  return melhor?.rows;
}

function parsePessoas(rows: any[][]): { ok: Pessoa[]; erros: string[]; ignorados: number } {
  if (rows.length < 2) return { ok: [], erros: ["aba de pessoas vazia"], ignorados: 0 };
  const idx = mapHeader(rows);
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
    if (!cargoP.success || !sexoP.success) {
      erros.push(`linha ${r + 1}: valor inválido em cargo/sexo`);
      ignorados++; continue;
    }
    const p: Pessoa = {
      id: uuid(),
      nome: get("nome")!,
      cpf: get("cpf")!,
      cargo: cargoP.data,
      sexo: sexoP.data,
      criadoEm: now,
      lockManual: {}
    };
    const sitP = Situacao.safeParse(normSituacao(get("situacao")));
    if (sitP.success) p.situacao = sitP.data;
    for (const opt of ["email","dataNascimento","fatoRH","tipoSanguineo","dddTelefoneFixo","numTelefoneFixo","dddCel","celular","curso"] as const) {
      const v = get(opt); if (v) (p as any)[opt] = v;
    }
    ok.push(p);
  }
  return { ok, erros, ignorados };
}

function parseAlojamentos(sheet: XLSX.WorkSheet): Alojamento[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const out: Alojamento[] = [];
  for (let r = 2; r <= range.e.r; r++) {
    const id = String(sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v ?? "").trim();
    const cargoSexo = String(sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v ?? "").trim().toUpperCase();
    const max = Number(sheet[XLSX.utils.encode_cell({ r, c: 4 })]?.v ?? 0);
    if (!id || !max || !/^[A-Z] \d{2}$/.test(id)) continue;
    if (!cargoSexo.includes("M") && !cargoSexo.includes("F")) continue;
    out.push({ id, bloco: id.charAt(0), cargoSexo, max });
  }
  return out;
}

// --- Importação dedicada de alojamentos (arquivo só de alojamentos) ---
const ALOJ_MAP: Record<string, string> = {
  ALOJAMENTO: "id", ALOJ: "id", ID: "id", SALA: "id",
  SEXO: "sexo",
  MAXIMAOCUPACAO: "max", MAXOCUPACAO: "max", MAX: "max", MAXIMA: "max",
  OCUPACAO: "max", CAPACIDADE: "max", MAXIMACAPACIDADE: "max", VAGAS: "max"
};

function normTok(h: unknown): string {
  return String(h ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase();
}

function mapAlojHeader(rows: any[][]): Record<string, number> {
  const idx: Record<string, number> = {};
  if (rows.length === 0) return idx;
  rows[0]!.forEach((h, i) => { const k = ALOJ_MAP[normTok(h)]; if (k && idx[k] === undefined) idx[k] = i; });
  return idx;
}

function blocoDe(id: string): string {
  return id.split(/\s+/)[0]?.trim() || id;
}

function parseAlojamentosDominio(wb: XLSX.WorkBook): { ok: Alojamento[]; erros: string[]; ignorados: number } {
  let melhor: { rows: any[][]; idx: Record<string, number>; score: number } | undefined;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name]!, { header: 1, raw: false });
    const idx = mapAlojHeader(rows);
    if (idx.id === undefined || idx.sexo === undefined || idx.max === undefined) continue;
    const score = Object.keys(idx).length;
    if (!melhor || score > melhor.score) melhor = { rows, idx, score };
  }
  if (!melhor) {
    return { ok: [], erros: ["nenhuma aba com colunas de alojamento (Alojamento/Sexo/MaximaOcupacao) encontrada"], ignorados: 0 };
  }
  const { rows, idx } = melhor;
  const ok: Alojamento[] = [];
  const erros: string[] = [];
  const vistos = new Set<string>();
  let ignorados = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const id = String(row[idx.id!] ?? "").trim();
    const sexo = String(row[idx.sexo!] ?? "").trim().toUpperCase();
    const maxRaw = String(row[idx.max!] ?? "").trim();
    if (!id && !sexo && !maxRaw) continue; // linha em branco
    const max = Number(maxRaw);
    if (!id) { erros.push(`linha ${r + 1}: sem id`); ignorados++; continue; }
    if (sexo !== "M" && sexo !== "F") { erros.push(`linha ${r + 1}: sexo inválido (${sexo})`); ignorados++; continue; }
    if (!Number.isInteger(max) || max <= 0) { erros.push(`linha ${r + 1}: capacidade inválida`); ignorados++; continue; }
    if (vistos.has(id)) { erros.push(`linha ${r + 1}: id duplicado (${id})`); ignorados++; continue; }
    vistos.add(id);
    ok.push({ id, bloco: blocoDe(id), cargoSexo: sexo, max });
  }
  return { ok, erros, ignorados };
}

const importarRoutes: FastifyPluginAsync = async (app) => {
  app.post("/alojamentos", async (req, reply) => {
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "arquivo ausente" });
    const buf = await file.toBuffer();
    let wb: XLSX.WorkBook;
    try { wb = XLSX.read(buf, { type: "buffer" }); }
    catch { return reply.code(400).send({ error: "arquivo inválido" }); }

    const { ok, erros, ignorados } = parseAlojamentosDominio(wb);
    if (ok.length === 0) return reply.code(400).send({ error: erros[0] ?? "nenhum alojamento válido", erros });

    if (process.env.NODE_ENV !== "test" && app.db.data.alojamentos.length > 0) {
      await backup(process.env.DB_PATH ?? "data/db.json");
    }
    app.db.data.alojamentos = ok;
    app.db.data.meta.atualizadoEm = new Date().toISOString();
    app.db.data.historico.push({
      ts: new Date().toISOString(), acao: "import-alojamentos", detalhes: { inseridos: ok.length, ignorados }
    });
    await app.db.write();
    return { inseridos: ok.length, ignorados, erros };
  });

  app.post("/xlsm", async (req, reply) => {
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "arquivo ausente" });
    const buf = await file.toBuffer();
    let wb: XLSX.WorkBook;
    try { wb = XLSX.read(buf, { type: "buffer" }); }
    catch { return reply.code(400).send({ error: "xlsm inválido" }); }

    const rows = escolherAba(wb);
    if (!rows) return reply.code(400).send({ error: "nenhuma aba com colunas de pessoas (nome/cpf/cargo/sexo) encontrada" });
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
