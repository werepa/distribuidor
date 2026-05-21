import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../api";
import type { Pessoa, Alojamento, Meta } from "@shared/schemas";
import { PessoaCard } from "../components/PessoaCard";
import { ViolationBadge } from "../components/ViolationBadge";
import { PrintButton } from "../components/PrintButton";
import { DroppableZone } from "../components/DroppableZone";
import { PrintHeader } from "../components/PrintHeader";
import { PessoasMiniTable, PrintSection } from "../components/PrintReport";

type FiltroAloj = {
  bloco: string;
  sexo: string;
  busca: string;
  apenasFolga: boolean;
  apenasExcedidos: boolean;
};
const FILTRO_INICIAL: FiltroAloj = { bloco: "", sexo: "", busca: "", apenasFolga: false, apenasExcedidos: false };

export default function AlojamentosPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [alojs, setAlojs] = useState<Alojamento[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filtro, setFiltro] = useState<FiltroAloj>(FILTRO_INICIAL);

  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setAlojs(await api.alojamentos.list());
  };
  useEffect(() => {
    recarregar();
    api.config.meta().then(setMeta);
  }, []);

  const porAlojamento = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    alojs.forEach(a => m.set(a.id, []));
    pessoas.forEach(p => { if (p.alojamentoId && m.has(p.alojamentoId)) m.get(p.alojamentoId)!.push(p); });
    m.forEach(arr => arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    return m;
  }, [pessoas, alojs]);

  const semAlojamento = pessoas.filter(p => !p.alojamentoId);

  const blocosDisponiveis = useMemo(
    () => [...new Set(alojs.map(a => a.bloco))].sort(),
    [alojs]
  );

  const alojsFiltrados = useMemo(() => alojs.filter(a => {
    if (filtro.bloco && a.bloco !== filtro.bloco) return false;
    const sexoAloj = (a.cargoSexo.split("/")[1] ?? a.cargoSexo).trim().toUpperCase();
    if (filtro.sexo && sexoAloj !== filtro.sexo) return false;
    const ps = porAlojamento.get(a.id) ?? [];
    if (filtro.apenasFolga && ps.length >= a.max) return false;
    if (filtro.apenasExcedidos && ps.length <= a.max) return false;
    if (filtro.busca) {
      const b = filtro.busca.toLowerCase();
      const matchAloj = a.id.toLowerCase().includes(b);
      const matchPessoa = ps.some(p => p.nome.toLowerCase().includes(b));
      if (!matchAloj && !matchPessoa) return false;
    }
    return true;
  }), [alojs, filtro, porAlojamento]);

  const blocos = useMemo(() => {
    const m = new Map<string, Alojamento[]>();
    alojsFiltrados.forEach(a => {
      if (!m.has(a.bloco)) m.set(a.bloco, []);
      m.get(a.bloco)!.push(a);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [alojsFiltrados]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const pessoaId = String(e.active.id);
    const overId = String(e.over.id);
    const targetAloj = alojs.find(a => a.id === overId)
      ?? alojs.find(a => a.id === pessoas.find(p => p.id === overId)?.alojamentoId);
    if (!targetAloj) return;
    const p = pessoas.find(x => x.id === pessoaId);
    if (!p || p.alojamentoId === targetAloj.id) return;
    const sexoAloj = (targetAloj.cargoSexo.split("/")[1] ?? "").trim().toUpperCase();
    if (sexoAloj && sexoAloj !== p.sexo) {
      alert(`Alojamento ${targetAloj.id} é destinado a sexo ${sexoAloj}.`);
      return;
    }
    await api.alojamentos.mover(pessoaId, targetAloj.id, true);
    await recarregar();
  };

  return (
    <div className="p-6">
      {/* HEADER (tela) */}
      <div className="flex justify-between mb-4 no-print">
        <h1 className="text-[34px] font-normal leading-none">Alojamentos <span className="text-ink-mute text-base">({alojsFiltrados.length}/{alojs.length})</span></h1>
        <div className="flex gap-2">
          <button className="bg-seal text-paper hover:bg-seal-deep px-3 py-1 rounded text-sm"
            onClick={async () => { await api.alojamentos.distribuir(); recarregar(); }}>
            ▶ Distribuir
          </button>
          <PrintButton />
        </div>
      </div>

      {/* HEADER (impressão) */}
      <PrintHeader
        titulo="Distribuição em alojamentos"
        edicao={meta?.edicao ?? "—"}
        totalLabel="Ocupados"
        total={pessoas.filter(p => p.alojamentoId).length}
        filtroLabel={resumoFiltroAloj(filtro)} />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-sm no-print">
        <input className="col-span-2 border rounded px-2 py-1" placeholder="buscar alojamento/pessoa…"
          value={filtro.busca} onChange={e => setFiltro({ ...filtro, busca: e.target.value })} />
        <select className="border rounded px-2 py-1" value={filtro.bloco}
          onChange={e => setFiltro({ ...filtro, bloco: e.target.value })}>
          <option value="">bloco</option>
          {blocosDisponiveis.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={filtro.sexo}
          onChange={e => setFiltro({ ...filtro, sexo: e.target.value })}>
          <option value="">sexo</option><option value="M">M</option><option value="F">F</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filtro.apenasFolga}
            onChange={e => setFiltro({ ...filtro, apenasFolga: e.target.checked })} /> com folga
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={filtro.apenasExcedidos}
            onChange={e => setFiltro({ ...filtro, apenasExcedidos: e.target.checked })} /> excedidos
        </label>
      </div>

      {semAlojamento.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm no-print">
          {semAlojamento.length} pessoa(s) sem alojamento.
        </div>
      )}

      {/* GRID (apenas tela) */}
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="space-y-6 screen-only">
          {blocos.map(([bloco, lista]) => (
            <section key={bloco}>
              <h2 className="font-semibold text-sm text-ink-soft mb-2">Bloco {bloco}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {lista.map(a => {
                  const ps = porAlojamento.get(a.id) ?? [];
                  const violations: string[] = [];
                  if (ps.length > a.max) violations.push(`Lotação excedida (${ps.length}/${a.max})`);
                  const sexoAloj = (a.cargoSexo.split("/")[1] ?? "").trim().toUpperCase();
                  if (sexoAloj && ps.some(p => p.sexo !== sexoAloj)) violations.push("Sexo incompatível");
                  const folga = a.max - ps.length;
                  return (
                    <div key={a.id} className="bg-ivory border-ivory-edge shadow-paper rounded-lg p-2">
                      <div className="font-semibold text-sm flex justify-between mb-2">
                        <span>{a.id} <span className="text-ink-mute font-normal">{a.cargoSexo}</span> <ViolationBadge msgs={violations} /></span>
                        <span className="text-ink-mute text-xs">{ps.length}/{a.max} (folga {folga})</span>
                      </div>
                      <SortableContext items={ps.map(p => p.id)} strategy={verticalListSortingStrategy} id={a.id}>
                        <DroppableZone id={a.id} isEmpty={ps.length === 0}
                          className="flex flex-col gap-1 min-h-[40px]">
                          {ps.map(p => <PessoaCard key={p.id} p={p} />)}
                        </DroppableZone>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </DndContext>

      {/* RELATÓRIO (apenas impressão) — agrupado por bloco */}
      <div className="hidden print-only">
        {blocos.map(([bloco, lista], bi) => (
          <div key={bloco} className={bi > 0 ? "print-break" : ""}>
            <div className="font-display text-[28pt] leading-none mb-1">Bloco {bloco}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink-mute border-b border-bone pb-1 mb-4">
              {lista.length} alojamento{lista.length === 1 ? "" : "s"}
            </div>

            {lista.map((a, i) => {
              const ps = porAlojamento.get(a.id) ?? [];
              const folga = a.max - ps.length;
              const sexoAloj = (a.cargoSexo.split("/")[1] ?? a.cargoSexo).trim().toUpperCase();
              return (
                <PrintSection
                  key={a.id}
                  numero={i + 1}
                  label={a.id}
                  sublabel={`${sexoAloj} · ${a.cargoSexo}`}
                  meta={`${ps.length}/${a.max} · folga ${folga}`}>
                  <PessoasMiniTable pessoas={ps} mostrarTurma />
                </PrintSection>
              );
            })}
          </div>
        ))}

        {semAlojamento.length > 0 && (
          <div className="print-break">
            <div className="font-display text-[28pt] leading-none mb-1">Pessoas sem alojamento</div>
            <div className="font-mono text-[10px] uppercase tracking-widest2 text-ink-mute border-b border-bone pb-1 mb-4">
              {semAlojamento.length} {semAlojamento.length === 1 ? "pessoa" : "pessoas"}
            </div>
            <PessoasMiniTable
              pessoas={[...semAlojamento].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))}
              mostrarTurma />
          </div>
        )}
      </div>
    </div>
  );
}

function resumoFiltroAloj(f: FiltroAloj): string | undefined {
  const partes: string[] = [];
  if (f.busca) partes.push(`busca "${f.busca}"`);
  if (f.bloco) partes.push(`bloco ${f.bloco}`);
  if (f.sexo) partes.push(`sexo ${f.sexo}`);
  if (f.apenasFolga) partes.push("com folga");
  if (f.apenasExcedidos) partes.push("excedidos");
  return partes.length ? partes.join(" · ") : undefined;
}
