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
