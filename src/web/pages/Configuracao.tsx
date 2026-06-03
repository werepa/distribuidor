import { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2, Save, GraduationCap, Home, Tag, Settings as SettingsIcon } from "lucide-react";
import { api } from "../api";
import type { Config, Meta } from "@shared/schemas";

const CARGOS = ["APF", "DPF", "EPF", "PCF", "PPF"] as const;

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [confirmTxt, setConfirmTxt] = useState("");
  const [resetando, setResetando] = useState(false);

  useEffect(() => {
    api.config.get().then(setConfig);
    api.config.meta().then(setMeta);
  }, []);

  const upConfig = (patch: Partial<Config>) => {
    setConfig(c => c ? { ...c, ...patch } : c);
    setDirty(true);
  };
  const upMeta = (patch: Partial<Meta>) => {
    setMeta(m => m ? { ...m, ...patch } : m);
    setDirty(true);
  };

  if (!config || !meta) {
    return <div className="p-6 text-slate-500">Carregando…</div>;
  }

  const salvar = async () => {
    setSalvando(true);
    try {
      await api.config.save(config);
      await api.config.setEdicao(meta.edicao);
      setDirty(false);
    } finally {
      setSalvando(false);
    }
  };

  const totalTurmas = CARGOS.reduce((s, c) => s + (config.turmasPorCargo[c] || 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <SettingsIcon size={24} className="text-slate-500" /> Configuração
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Parâmetros gerais da edição e regras dos algoritmos de distribuição.
          </p>
        </div>
        <button
          disabled={salvando || !dirty}
          className="bg-seal hover:bg-seal-deep disabled:bg-bone disabled:cursor-not-allowed text-paper px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"
          onClick={salvar}>
          <Save size={16} />
          {salvando ? "Salvando…" : dirty ? "Salvar alterações" : "Salvo"}
        </button>
      </div>

      {/* CARD: Edição */}
      <Card>
        <CardHeader title="Edição" subtitle="Identificação do curso/turma corrente" />
        <CardBody>
          <Field label="Nome da edição">
            <input
              className="border border-slate-300 rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={meta.edicao}
              onChange={e => upMeta({ edicao: e.target.value })} />
          </Field>
          <p className="text-xs text-slate-500 mt-1">
            Aparece no Dashboard e nos exports.
          </p>
        </CardBody>
      </Card>

      {/* CARD: Turmas */}
      <Card icon={<GraduationCap size={18} />}>
        <CardHeader
          title="Turmas por cargo"
          subtitle={`${totalTurmas} turma${totalTurmas === 1 ? "" : "s"} no total`} />
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CARGOS.map(c => (
              <Field key={c} label={c}>
                <input type="number" min={0}
                  className="border border-slate-300 rounded-md px-3 py-2 w-full text-center font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={config.turmasPorCargo[c]}
                  onChange={e => upConfig({
                    turmasPorCargo: { ...config.turmasPorCargo, [c]: Number(e.target.value) || 0 }
                  })} />
              </Field>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* CARD: Critérios */}
      <Card icon={<Home size={18} />}>
        <CardHeader title="Critérios de distribuição" subtitle="Como turmas e alojamentos são preenchidos" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Critério para turmas">
              <select
                className="border border-slate-300 rounded-md px-3 py-2 w-full bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={config.criterioDistribuicao}
                onChange={e => upConfig({ criterioDistribuicao: e.target.value as Config["criterioDistribuicao"] })}>
                <option value="completar">Completar (preenche turma até o limite)</option>
                <option value="round-robin">Round-robin (um em cada por vez)</option>
              </select>
            </Field>
            <Field label="Critério para alojamentos">
              <select
                className="border border-slate-300 rounded-md px-3 py-2 w-full bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={config.criterioAlojamento}
                onChange={e => upConfig({ criterioAlojamento: e.target.value as Config["criterioAlojamento"] })}>
                <option value="dividido">Mais dividido possível (espalha e mistura)</option>
                <option value="cargo">Por cargo (sala só com o mesmo cargo)</option>
                <option value="cargo-turma">Por cargo e turma (mesmo cargo e mesma turma)</option>
              </select>
            </Field>
            <Field label="Folga de alojamento" hint="0 = lotação total · 0.15 = 15% de vagas livres">
              <div className="flex items-center gap-2">
                <input type="number" step="0.05" min={0} max={0.9}
                  className="border border-slate-300 rounded-md px-3 py-2 w-24 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={config.folgaAlojamento}
                  onChange={e => upConfig({ folgaAlojamento: Number(e.target.value) })} />
                <span className="text-sm text-slate-500">
                  ({(config.folgaAlojamento * 100).toFixed(0)}%)
                </span>
              </div>
            </Field>
          </div>
        </CardBody>
      </Card>

      {/* CARD: Nomes de guerra */}
      <Card icon={<Tag size={18} />}>
        <CardHeader
          title="Nomes de guerra"
          subtitle="Regras fonéticas e palavras ignoradas ao gerar candidatos" />
        <CardBody>
          {/* Normalizações */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-slate-700">Normalizações fonéticas</h3>
              <button
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                onClick={() => upConfig({
                  normalizacoesFoneticas: [...config.normalizacoesFoneticas, { de: "", para: "" }]
                })}>
                <Plus size={14} /> adicionar
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Ex.: <code className="bg-slate-100 px-1 rounded">LUIZ → LUIS</code> faz "Luiz" e "Luis" colidirem na mesma turma.
            </p>
            {config.normalizacoesFoneticas.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Nenhuma regra configurada.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.normalizacoesFoneticas.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <input
                      className="border border-slate-300 rounded-md px-2 py-1.5 w-full font-mono text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="DE"
                      value={n.de}
                      onChange={e => {
                        const arr = [...config.normalizacoesFoneticas];
                        arr[i] = { ...n, de: e.target.value.toUpperCase() };
                        upConfig({ normalizacoesFoneticas: arr });
                      }} />
                    <span className="text-slate-400">→</span>
                    <input
                      className="border border-slate-300 rounded-md px-2 py-1.5 w-full font-mono text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="PARA"
                      value={n.para}
                      onChange={e => {
                        const arr = [...config.normalizacoesFoneticas];
                        arr[i] = { ...n, para: e.target.value.toUpperCase() };
                        upConfig({ normalizacoesFoneticas: arr });
                      }} />
                    <button
                      aria-label="Remover"
                      title="Remover"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-red-600 shrink-0"
                      onClick={() => upConfig({
                        normalizacoesFoneticas: config.normalizacoesFoneticas.filter((_, j) => j !== i)
                      })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stop-words */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">Stop-words</h3>
            <p className="text-xs text-slate-500 mb-2">
              Palavras isoladas que não podem virar nome de guerra. Separe por vírgula.
            </p>
            <input
              className="border border-slate-300 rounded-md px-3 py-2 w-full font-mono text-sm uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={config.stopWordsNomeGuerra.join(", ")}
              onChange={e => upConfig({
                stopWordsNomeGuerra: e.target.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
              })} />
            <div className="flex flex-wrap gap-1 mt-2">
              {config.stopWordsNomeGuerra.map(s => (
                <span key={s} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">{s}</span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* DANGER ZONE */}
      <Card danger>
        <CardHeader
          title="Zona de perigo"
          subtitle="Operações destrutivas e irreversíveis"
          danger />
        <CardBody>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Excluir banco de dados</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Remove todas as pessoas, turmas, alojamentos e histórico. Um backup automático é criado antes.
              </p>
            </div>
            <button
              className="shrink-0 border border-red-300 text-red-700 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              onClick={() => { setConfirmTxt(""); setResetModal(true); }}>
              <AlertTriangle size={16} /> Excluir
            </button>
          </div>
        </CardBody>
      </Card>

      {/* MODAL */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !resetando && setResetModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-bone/40">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-red-700">
                <AlertTriangle size={22} /> Excluir banco de dados?
              </h2>
              <p className="text-sm text-slate-700 mt-2">
                Esta ação <strong>remove permanentemente</strong> todos os dados
                (pessoas, turmas, alojamentos, configuração). Um backup automático será criado.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50">
              <label className="block">
                <span className="text-sm text-slate-700">
                  Digite <code className="bg-ivory border border-bone/60 px-1.5 py-0.5 rounded font-mono text-xs">EXCLUIR</code> para confirmar:
                </span>
                <input autoFocus
                  className="mt-2 border border-slate-300 rounded-md px-3 py-2 w-full text-sm font-mono focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  value={confirmTxt}
                  onChange={e => setConfirmTxt(e.target.value)}
                  placeholder="EXCLUIR" />
              </label>
            </div>
            <div className="px-6 py-4 flex justify-end gap-2 bg-white">
              <button className="px-4 py-2 rounded-md text-sm border border-slate-300 hover:bg-slate-50"
                onClick={() => setResetModal(false)} disabled={resetando}>
                Cancelar
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium"
                disabled={confirmTxt !== "EXCLUIR" || resetando}
                onClick={async () => {
                  setResetando(true);
                  try {
                    await api.config.resetar();
                    setResetModal(false);
                    location.reload();
                  } catch (err: any) {
                    alert("Erro: " + err.message);
                    setResetando(false);
                  }
                }}>
                {resetando ? "Excluindo…" : "Excluir definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Card({ children, danger, icon }: {
  children: React.ReactNode; danger?: boolean; icon?: React.ReactNode;
}) {
  return (
    <section className={`mb-6 rounded-xl border ${danger ? "border-red-300/50 bg-red-50/40" : "border-ivory-edge bg-ivory"} shadow-paper`}>
      {icon && <div className="hidden">{icon}</div>}
      {children}
    </section>
  );
}

function CardHeader({ title, subtitle, danger }: {
  title: string; subtitle?: string; danger?: boolean;
}) {
  return (
    <div className={`px-6 py-4 border-b ${danger ? "border-red-200" : "border-bone/40"}`}>
      <h2 className={`font-semibold ${danger ? "text-red-700" : "text-slate-900"}`}>{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4">{children}</div>;
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </label>
  );
}
