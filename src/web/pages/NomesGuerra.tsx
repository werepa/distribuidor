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

type FiltroNG = {
  busca: string;
  cargo: string;
  colisaoTurma: boolean;
  colisaoCargo: boolean;
  semNome: boolean;
  fixados: boolean;
};
const FILTRO_INICIAL: FiltroNG = {
  busca: "", cargo: "",
  colisaoTurma: false, colisaoCargo: false, semNome: false, fixados: false
};

export default function NomesGuerraPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [filtro, setFiltro] = useState<FiltroNG>(FILTRO_INICIAL);

  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setTurmas(await api.turmas.list());
  };
  useEffect(() => { recarregar(); }, []);

  const porTurma = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    turmas.forEach(t => m.set(t.id, []));
    pessoas.forEach(p => { if (p.turmaId && m.has(p.turmaId)) m.get(p.turmaId)!.push(p); });
    m.forEach(arr => arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    return m;
  }, [pessoas, turmas]);

  const conflitosTurma = useMemo(() => {
    const out = new Map<string, Set<string>>();
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

  const passa = (p: Pessoa): boolean => {
    if (filtro.cargo && p.cargo !== filtro.cargo) return false;
    if (filtro.colisaoTurma && !conflitosTurma.has(p.id)) return false;
    if (filtro.colisaoCargo && !conflitosCargo.has(p.id)) return false;
    if (filtro.semNome && p.nomeGuerra) return false;
    if (filtro.fixados && !p.lockManual.nomeGuerra) return false;
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase();
      if (!p.nome.toLowerCase().includes(b)
          && !(p.nomeGuerra ?? "").toLowerCase().includes(b)) return false;
    }
    return true;
  };

  const totalFiltrado = pessoas.filter(passa).length;

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-[34px] font-normal leading-none">
          Nomes de Guerra <span className="text-ink-mute text-base">({totalFiltrado}/{pessoas.length})</span>
        </h1>
        <button className="bg-seal text-paper hover:bg-seal-deep px-3 py-1 rounded text-sm"
          onClick={async () => { await api.nomesGuerra.gerar(); recarregar(); }}>
          ▶ Gerar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-sm">
        <input className="col-span-2 border rounded px-2 py-1" placeholder="buscar nome / nome de guerra…"
          value={filtro.busca} onChange={e => setFiltro({ ...filtro, busca: e.target.value })} />
        <select className="border rounded px-2 py-1" value={filtro.cargo}
          onChange={e => setFiltro({ ...filtro, cargo: e.target.value })}>
          <option value="">cargo</option>
          <option>APF</option><option>DPF</option><option>EPF</option><option>PCF</option><option>PPF</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filtro.colisaoTurma}
            onChange={e => setFiltro({ ...filtro, colisaoTurma: e.target.checked })} /> colisão turma
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filtro.colisaoCargo}
            onChange={e => setFiltro({ ...filtro, colisaoCargo: e.target.checked })} /> colisão cargo
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filtro.semNome}
            onChange={e => setFiltro({ ...filtro, semNome: e.target.checked })} /> sem nome
        </label>
        <label className="flex items-center gap-1 col-start-1 md:col-start-auto">
          <input type="checkbox" checked={filtro.fixados}
            onChange={e => setFiltro({ ...filtro, fixados: e.target.checked })} /> fixados 🔒
        </label>
      </div>

      <div className="space-y-6">
        {turmas.map(t => {
          const ps = (porTurma.get(t.id) ?? []).filter(passa);
          if (ps.length === 0) return null;
          return (
            <section key={t.id}>
              <h2 className="font-semibold text-sm mb-2">
                {t.label} <span className="text-ink-mute font-normal">({ps.length})</span>
              </h2>
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-1/2" />
                  <col className="w-2/5" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-paper-dim">
                  <tr>
                    <th className="text-left p-2">Nome completo</th>
                    <th className="text-left p-2">Nome de guerra</th>
                    <th className="text-left p-2">Cargo</th>
                  </tr>
                </thead>
                <tbody>
                  {ps.map(p => {
                    const cT = conflitosTurma.get(p.id);
                    const cC = conflitosCargo.get(p.id);
                    const cor = cT ? "bg-red-50" : cC ? "bg-amber-50" : "";
                    return (
                      <tr key={p.id} className={`border-b ${cor}`}>
                        <td className="p-2 truncate">{p.nome}</td>
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
                          {cT && <span className="ml-1 text-red-700 text-xs">⚠ turma</span>}
                          {!cT && cC && <span className="ml-1 text-amber-700 text-xs">⚠ cargo</span>}
                        </td>
                        <td className="p-2 text-xs text-ink-mute">{p.cargo} {p.sexo === "F" && "♀"}</td>
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
