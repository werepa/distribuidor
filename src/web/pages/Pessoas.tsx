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
