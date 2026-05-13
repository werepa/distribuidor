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
