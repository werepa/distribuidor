import { useEffect, useState } from "react";
import { api } from "../api";
import type { Config, Meta } from "@shared/schemas";

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.config.get().then(setConfig);
    api.config.meta().then(setMeta);
  }, []);

  if (!config || !meta) return <div className="p-6">Carregando…</div>;

  const salvar = async () => {
    setSalvando(true);
    await api.config.save(config);
    await api.config.setEdicao(meta.edicao);
    setSalvando(false);
    alert("Configuração salva.");
  };

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Configuração</h1>

      <section className="space-y-3 mb-6">
        <label className="block">
          <span className="text-sm font-medium">Edição</span>
          <input className="border rounded px-2 py-1 w-full mt-1"
            value={meta.edicao}
            onChange={e => setMeta({ ...meta, edicao: e.target.value })} />
        </label>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Turmas por cargo</h2>
        <div className="grid grid-cols-5 gap-2">
          {(["APF","DPF","EPF","PCF","PPF"] as const).map(c => (
            <label key={c} className="block">
              <span className="text-xs">{c}</span>
              <input type="number" min={0} className="border rounded px-2 py-1 w-full"
                value={config.turmasPorCargo[c]}
                onChange={e => setConfig({ ...config,
                  turmasPorCargo: { ...config.turmasPorCargo, [c]: Number(e.target.value) }
                })} />
            </label>
          ))}
        </div>
      </section>

      <section className="mb-6 space-y-3">
        <label className="block">
          <span className="text-sm font-medium">Critério de distribuição</span>
          <select className="border rounded px-2 py-1 mt-1"
            value={config.criterioDistribuicao}
            onChange={e => setConfig({ ...config, criterioDistribuicao: e.target.value as any })}>
            <option value="completar">completar</option>
            <option value="round-robin">round-robin</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Folga de alojamento (0–0.9)</span>
          <input type="number" step="0.05" min={0} max={0.9}
            className="border rounded px-2 py-1 mt-1 w-32"
            value={config.folgaAlojamento}
            onChange={e => setConfig({ ...config, folgaAlojamento: Number(e.target.value) })} />
        </label>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Normalizações fonéticas</h2>
        <table className="text-sm">
          <thead><tr><th className="text-left">de</th><th className="text-left">para</th><th></th></tr></thead>
          <tbody>
            {config.normalizacoesFoneticas.map((n, i) => (
              <tr key={i}>
                <td><input className="border rounded px-1" value={n.de}
                  onChange={e => {
                    const arr = [...config.normalizacoesFoneticas]; arr[i] = { ...n, de: e.target.value };
                    setConfig({ ...config, normalizacoesFoneticas: arr });
                  }} /></td>
                <td><input className="border rounded px-1" value={n.para}
                  onChange={e => {
                    const arr = [...config.normalizacoesFoneticas]; arr[i] = { ...n, para: e.target.value };
                    setConfig({ ...config, normalizacoesFoneticas: arr });
                  }} /></td>
                <td><button className="text-red-600 text-xs"
                  onClick={() => setConfig({ ...config,
                    normalizacoesFoneticas: config.normalizacoesFoneticas.filter((_, j) => j !== i)
                  })}>x</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="text-blue-600 text-sm mt-2"
          onClick={() => setConfig({ ...config,
            normalizacoesFoneticas: [...config.normalizacoesFoneticas, { de: "", para: "" }]
          })}>+ adicionar</button>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Stop-words (nome de guerra)</h2>
        <input className="border rounded px-2 py-1 w-full"
          value={config.stopWordsNomeGuerra.join(", ")}
          onChange={e => setConfig({ ...config,
            stopWordsNomeGuerra: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
          })} />
      </section>

      <button disabled={salvando} className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={salvar}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}
