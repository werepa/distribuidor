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

describe("POST /api/importar/alojamentos", () => {
  it("importa alojamentos do formato dedicado, auto-detectando a aba", async () => {
    const app = await buildApp();
    // pré-existente que deve ser substituído
    app.db.data.alojamentos = [{ id: "X 99", bloco: "X", cargoSexo: "M", max: 2 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["nota", "irrelevante"]]), "Capa");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Alojamento", "Sexo", "MaximaOcupacao"],
      ["A 01", "M", "6"],
      ["G 02", "F", "4"]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Planilha1");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fd = new FormData();
    fd.append("file", buf, { filename: "alojs.xlsx", contentType: "application/octet-stream" });
    const r = await app.inject({
      method: "POST", url: "/api/importar/alojamentos",
      payload: fd, headers: fd.getHeaders()
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.inseridos).toBe(2);
    // substituiu a lista (X 99 saiu)
    expect(app.db.data.alojamentos).toHaveLength(2);
    expect(app.db.data.alojamentos[0]).toMatchObject({ id: "A 01", bloco: "A", cargoSexo: "M", max: 6 });
    expect(app.db.data.alojamentos[1]).toMatchObject({ id: "G 02", bloco: "G", cargoSexo: "F", max: 4 });
  });

  it("ignora linhas inválidas e relata", async () => {
    const app = await buildApp();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Alojamento", "Sexo", "MaximaOcupacao"],
      ["A 01", "X", "6"],   // sexo inválido
      ["", "M", "6"],        // sem id
      ["A 02", "M", "0"],    // max inválido
      ["A 03", "F", "5"]     // ok
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "qualquer");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fd = new FormData();
    fd.append("file", buf, { filename: "alojs.xlsx", contentType: "application/octet-stream" });
    const r = await app.inject({
      method: "POST", url: "/api/importar/alojamentos",
      payload: fd, headers: fd.getHeaders()
    });
    const body = r.json();
    expect(body.inseridos).toBe(1);
    expect(body.ignorados).toBe(3);
    expect(app.db.data.alojamentos).toHaveLength(1);
  });
});

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

  it("auto-detecta a aba correta independente do nome", async () => {
    const app = await buildApp();
    const wb = XLSX.utils.book_new();
    // aba irrelevante primeiro, para garantir que a escolha é por conteúdo
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["foo", "bar"], [1, 2]]), "Instruções");
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "CPF", "Sexo", "Cargo", "Situação"],
      ["FELIPE SOARES", "301.498.637-21", "M", "PPF", "R"]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Cadastro de Servidores");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fd = new FormData();
    fd.append("file", buf, { filename: "x.xlsx", contentType: "application/octet-stream" });
    const r = await app.inject({
      method: "POST", url: "/api/importar/xlsm",
      payload: fd, headers: fd.getHeaders()
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.inseridos).toBe(1);
    expect(app.db.data.pessoas[0]!.nome).toBe("FELIPE SOARES");
  });

  it("importa sem email (campo faltante opcional) e normaliza situação abreviada", async () => {
    const app = await buildApp();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "CPF", "Sexo", "Cargo", "Situação"],
      ["FELIPE SOARES", "301.498.637-21", "M", "PPF", "R"],
      ["MARIA SOUZA", "111.222.333-44", "F", "DPF", "SJ"]
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Cadastro de Servidores");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fd = new FormData();
    fd.append("file", buf, { filename: "x.xlsx", contentType: "application/octet-stream" });
    const r = await app.inject({
      method: "POST", url: "/api/importar/xlsm",
      payload: fd, headers: fd.getHeaders()
    });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.inseridos).toBe(2);
    expect(app.db.data.pessoas[0]!.email).toBeUndefined();
    expect(app.db.data.pessoas[0]!.situacao).toBe("REGULAR");
    expect(app.db.data.pessoas[1]!.situacao).toBe("SUB JUDICE");
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
