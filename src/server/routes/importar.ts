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
