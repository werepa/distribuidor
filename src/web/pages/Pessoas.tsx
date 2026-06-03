import { useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus, Pencil } from "lucide-react";
import { api } from "../api";
import { PrintButton } from "../components/PrintButton";
import { PrintHeader } from "../components/PrintHeader";
import type { Pessoa, Meta } from "@shared/schemas";

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

type Ordem = "nome" | "cargo" | "situacao" | "turma" | "alojamento";
const SIT_ORDEM: Record<string, number> = { "REGULAR": 0, "SUB JUDICE": 1, "ESPECIAL": 2 };

export default function Pessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_INICIAL);
  const [ordem, setOrdemRaw] = useState<Ordem>(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("pessoas.ordem") : null;
    const validas: Ordem[] = ["nome", "cargo", "situacao", "turma", "alojamento"];
    return validas.includes(saved as Ordem) ? (saved as Ordem) : "nome";
  });
  const setOrdem = (o: Ordem) => {
    setOrdemRaw(o);
    try { localStorage.setItem("pessoas.ordem", o); } catch {}
  };
  const [carregando, setCarregando] = useState(true);

  const recarregar = () => {
    setCarregando(true);
    api.pessoas.list().then(p => { setPessoas(p); setCarregando(false); });
  };

  useEffect(() => {
    recarregar();
    api.config.meta().then(setMeta);
  }, []);

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
  }).sort((a, b) => {
    const porNome = a.nome.localeCompare(b.nome, "pt-BR");
    if (ordem === "cargo" && a.cargo !== b.cargo) return a.cargo.localeCompare(b.cargo);
    if (ordem === "situacao" && a.situacao !== b.situacao) {
      return (SIT_ORDEM[a.situacao ?? ""] ?? 99) - (SIT_ORDEM[b.situacao ?? ""] ?? 99);
    }
    if (ordem === "turma") {
      const ta = a.turmaId ?? "￿", tb = b.turmaId ?? "￿";
      if (ta !== tb) return ta.localeCompare(tb);
    }
    if (ordem === "alojamento") {
      const aa = a.alojamentoId ?? "￿", ab = b.alojamentoId ?? "￿";
      if (aa !== ab) return aa.localeCompare(ab);
    }
    return porNome;
  }), [pessoas, filtro, ordem]);

  const headerBtn = (col: Ordem, label: string) => (
    <th className="text-left p-2">
      <button
        className={`flex items-center gap-1 hover:text-wax-deep ${ordem === col ? "text-wax-deep font-semibold" : ""}`}
        onClick={() => setOrdem(col)}>
        {label}{ordem === col && <span>↑</span>}
      </button>
    </th>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 no-print">
        <h1 className="text-[34px] font-normal leading-none">Pessoas <span className="text-ink-mute text-sm font-mono uppercase tracking-widest2">({lista.length}/{pessoas.length})</span></h1>
        <div className="flex gap-2">
          <AdicionarBtn onDone={recarregar} />
          <ImportarBtn onDone={recarregar} />
          <ExportarBtn pessoas={pessoas} />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4 text-sm no-print">
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
        <label className="flex items-center gap-1"><input type="checkbox" checked={filtro.semNome} onChange={e => setFiltro({ ...filtro, semNome: e.target.checked })} /> sem nome guerra</label>
      </div>

      <PrintHeader
        titulo="Relação de pessoas"
        edicao={meta?.edicao ?? "—"}
        totalLabel="Total"
        total={lista.length}
        filtroLabel={resumoFiltro(filtro, ordem)} />

      {carregando ? <p>Carregando…</p> : (
        <table className="w-full text-sm border-collapse pessoas-table">
          <thead className="bg-paper-dim border-b border-bone">
            <tr>
              <th className="hidden print:table-cell text-left p-2 w-10">#</th>
              {headerBtn("nome", "Nome / CPF")}
              {headerBtn("cargo", "Cargo")}
              <th className="text-left p-2">Sexo</th>
              {headerBtn("situacao", "Situação")}
              {headerBtn("turma", "Turma")}
              {headerBtn("alojamento", "Alojamento")}
              <th className="text-left p-2">Nome Guerra</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p, i) => (
              <LinhaPessoa key={p.id} p={p} idx={i + 1} onChange={recarregar} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function resumoFiltro(f: Filtro, o: Ordem): string | undefined {
  const partes: string[] = [];
  if (f.busca) partes.push(`busca "${f.busca}"`);
  if (f.cargo) partes.push(`cargo ${f.cargo}`);
  if (f.sexo) partes.push(`sexo ${f.sexo}`);
  if (f.situacao) partes.push(f.situacao);
  if (f.semTurma) partes.push("sem turma");
  if (f.semAlojamento) partes.push("sem alojamento");
  if (f.semNome) partes.push("sem nome de guerra");
  if (o !== "nome") partes.push(`ordenado por ${o}`);
  return partes.length ? partes.join(" · ") : undefined;
}

function LinhaPessoa({ p, idx, onChange }: { p: Pessoa; idx: number; onChange: () => void }) {
  const [editando, setEditando] = useState(false);
  return (
    <>
      <tr className="border-b border-bone/60 group hover:bg-paper-dim align-top">
        <td className="hidden print:table-cell p-2 font-mono text-xs text-ink-mute">{String(idx).padStart(3, "0")}</td>
        <td className="p-2 leading-tight">
          <div>{p.nome}</div>
          <div className="font-mono text-[10px] text-ink-mute mt-0.5">{formatarCPF(p.cpf)}</div>
        </td>
        <td className="p-2">{p.cargo}</td>
        <td className="p-2">{p.sexo}</td>
        <td className="p-2">{p.situacao}</td>
        <td className="p-2 text-ink-mute">{p.turmaId ?? "—"}</td>
        <td className="p-2 text-ink-mute">{p.alojamentoId ?? "—"}</td>
        <td className="p-2 text-ink-mute">{p.nomeGuerra ?? "—"}</td>
        <td className="p-2 w-20 no-print">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              aria-label={`Editar ${p.nome}`}
              title={`Editar ${p.nome}`}
              className="p-1 rounded hover:bg-wax-soft text-wax-deep"
              onClick={() => setEditando(true)}>
              <Pencil size={16} />
            </button>
            <button
              aria-label={`Excluir ${p.nome}`}
              title={`Excluir ${p.nome}`}
              className="p-1 rounded hover:bg-red-100 text-red-600"
              onClick={async () => {
                if (confirm(`Excluir ${p.nome}?`)) { await api.pessoas.remove(p.id); onChange(); }
              }}>
              <Trash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {editando && (
        <PessoaModal
          pessoaInicial={p}
          onClose={() => setEditando(false)}
          onSaved={() => { setEditando(false); onChange(); }} />
      )}
    </>
  );
}

function formatarCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

type NovaPessoa = {
  nome: string; cpf: string; cargo: "APF" | "DPF" | "EPF" | "PCF" | "PPF";
  sexo: "M" | "F"; situacao: "REGULAR" | "SUB JUDICE" | "ESPECIAL"; email: string;
};

const PESSOA_VAZIA: NovaPessoa = {
  nome: "", cpf: "", cargo: "APF", sexo: "M", situacao: "REGULAR", email: ""
};

function AdicionarBtn({ onDone }: { onDone: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button
        className="bg-wax hover:bg-wax-deep text-paper px-3 py-1 rounded text-sm flex items-center gap-1"
        onClick={() => setAberto(true)}>
        <UserPlus size={14} /> Adicionar
      </button>
      {aberto && (
        <PessoaModal
          onClose={() => setAberto(false)}
          onSaved={() => { setAberto(false); onDone(); }} />
      )}
    </>
  );
}

function PessoaModal({ pessoaInicial, onClose, onSaved }: {
  pessoaInicial?: Pessoa;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editando = !!pessoaInicial;
  const [form, setForm] = useState<NovaPessoa>(pessoaInicial ? {
    nome: pessoaInicial.nome,
    cpf: pessoaInicial.cpf,
    cargo: pessoaInicial.cargo,
    sexo: pessoaInicial.sexo,
    situacao: pessoaInicial.situacao ?? "REGULAR",
    email: pessoaInicial.email ?? ""
  } : PESSOA_VAZIA);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!form.nome.trim() || !form.cpf.trim() || !form.email.trim()) {
      alert("Nome, CPF e e-mail são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      if (editando) await api.pessoas.update(pessoaInicial!.id, form);
      else await api.pessoas.create(form);
      onSaved();
    } catch (err: any) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl"
        onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">
          {editando ? "Editar pessoa" : "Adicionar pessoa"}
        </h2>

        <div className="space-y-3 text-sm">
          <label className="block">
            <span className="text-slate-600">Nome completo *</span>
            <input autoFocus className="border rounded px-2 py-1 w-full mt-1"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-slate-600">CPF *</span>
              <input className="border rounded px-2 py-1 w-full mt-1"
                value={form.cpf}
                onChange={e => setForm({ ...form, cpf: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-slate-600">E-mail *</span>
              <input type="email" className="border rounded px-2 py-1 w-full mt-1"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-slate-600">Cargo</span>
              <select className="border rounded px-2 py-1 w-full mt-1"
                value={form.cargo}
                onChange={e => setForm({ ...form, cargo: e.target.value as NovaPessoa["cargo"] })}>
                <option>APF</option><option>DPF</option><option>EPF</option>
                <option>PCF</option><option>PPF</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-600">Sexo</span>
              <select className="border rounded px-2 py-1 w-full mt-1"
                value={form.sexo}
                onChange={e => setForm({ ...form, sexo: e.target.value as NovaPessoa["sexo"] })}>
                <option>M</option><option>F</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-600">Situação</span>
              <select className="border rounded px-2 py-1 w-full mt-1"
                value={form.situacao}
                onChange={e => setForm({ ...form, situacao: e.target.value as NovaPessoa["situacao"] })}>
                <option>REGULAR</option>
                <option>SUB JUDICE</option>
                <option>ESPECIAL</option>
              </select>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button className="px-3 py-1 rounded text-sm border" onClick={onClose} disabled={salvando}>
            Cancelar
          </button>
          <button
            className="bg-wax hover:bg-wax-deep text-paper px-3 py-1 rounded text-sm disabled:opacity-50"
            onClick={salvar}
            disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportarBtn({ onDone }: { onDone: () => void }) {
  return (
    <label className="bg-seal text-paper hover:bg-seal-deep px-3 py-1 rounded text-sm cursor-pointer">
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
