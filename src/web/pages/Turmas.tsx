import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../api";
import type { Pessoa, Turma, Meta } from "@shared/schemas";
import { PessoaCard } from "../components/PessoaCard";
import { ViolationBadge } from "../components/ViolationBadge";
import { PrintButton } from "../components/PrintButton";
import { DroppableZone } from "../components/DroppableZone";
import { PrintHeader } from "../components/PrintHeader";
import { PessoasMiniTable, PrintSection } from "../components/PrintReport";

function violacoesDaTurma(membros: Pessoa[], todas: Pessoa[][]): string[] {
  const out: string[] = [];
  const oddCount = todas.filter(t => t.length % 2 === 1).length;
  if (oddCount > 1 && membros.length % 2 === 1) {
    out.push("Mais de uma turma com tamanho ímpar");
  }
  return out;
}

function violacoesGlobais(turmasMap: Map<string, Pessoa[]>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const porCargo = new Map<string, Array<{ id: string; ps: Pessoa[] }>>();
  for (const [id, ps] of turmasMap) {
    const cargo = ps[0]?.cargo;
    if (!cargo) continue;
    if (!porCargo.has(cargo)) porCargo.set(cargo, []);
    porCargo.get(cargo)!.push({ id, ps });
  }
  for (const [, lista] of porCargo) {
    if (lista.length < 2) continue;
    const sjs = lista.map(l => l.ps.filter(p => p.situacao === "SUB JUDICE").length);
    const fs = lista.map(l => l.ps.filter(p => p.sexo === "F").length);
    const desbalSJ = Math.max(...sjs) - Math.min(...sjs) > 1;
    const desbalF = Math.max(...fs) - Math.min(...fs) > 1;
    lista.forEach(l => {
      const arr = out.get(l.id) ?? [];
      if (desbalSJ) arr.push("SUB JUDICE desbalanceado no cargo");
      if (desbalF) arr.push("Sexo F desbalanceado no cargo");
      if (arr.length) out.set(l.id, arr);
    });
  }
  return out;
}

export default function TurmasPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setTurmas(await api.turmas.list());
  };
  useEffect(() => {
    recarregar();
    api.config.meta().then(setMeta);
  }, []);

  const semTurma = useMemo(() => pessoas.filter(p => !p.turmaId), [pessoas]);
  const porTurma = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    turmas.forEach(t => m.set(t.id, []));
    pessoas.forEach(p => { if (p.turmaId && m.has(p.turmaId)) m.get(p.turmaId)!.push(p); });
    m.forEach(arr => arr.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
    return m;
  }, [pessoas, turmas]);
  const violacoesPorTurma = useMemo(() => violacoesGlobais(porTurma), [porTurma]);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const pessoaId = String(e.active.id);
    const overId = String(e.over.id);
    const targetTurma = turmas.find(t => t.id === overId)
      ?? turmas.find(t => t.id === pessoas.find(p => p.id === overId)?.turmaId);
    if (!targetTurma) return;
    const p = pessoas.find(x => x.id === pessoaId);
    if (!p || p.turmaId === targetTurma.id) return;
    if (p.cargo !== targetTurma.cargo) {
      alert(`Não é possível mover ${p.cargo} para turma ${targetTurma.cargo}.`);
      return;
    }
    await api.turmas.mover(pessoaId, targetTurma.id, true);
    await recarregar();
  };

  return (
    <div className="p-6">
      {/* HEADER (tela) */}
      <div className="flex justify-between mb-4 no-print">
        <h1 className="text-[34px] font-normal leading-none">Turmas</h1>
        <div className="flex gap-2">
          <button className="bg-seal text-paper hover:bg-seal-deep px-3 py-1 rounded text-sm"
            onClick={async () => { await api.turmas.distribuir(); recarregar(); }}>
            ▶ Distribuir
          </button>
          <PrintButton />
        </div>
      </div>

      {/* HEADER (impressão) */}
      <PrintHeader
        titulo="Distribuição em turmas"
        edicao={meta?.edicao ?? "—"}
        totalLabel="Pessoas"
        total={pessoas.filter(p => p.turmaId).length} />

      {semTurma.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm no-print">
          {semTurma.length} pessoa(s) sem turma — clique em <strong>Distribuir</strong>.
        </div>
      )}

      {/* KANBAN (apenas tela) */}
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4 kanban-row screen-only">
          {turmas.map(t => {
            const ps = porTurma.get(t.id) ?? [];
            const violations = [
              ...violacoesDaTurma(ps, [...porTurma.values()].filter(x => x[0]?.cargo === t.cargo)),
              ...(violacoesPorTurma.get(t.id) ?? [])
            ];
            return (
              <div key={t.id} className="min-w-[180px] bg-ivory border-ivory-edge shadow-paper rounded-lg p-2">
                <div className="font-semibold text-sm mb-2 flex justify-between">
                  <span>{t.label} <ViolationBadge msgs={violations} /></span>
                  <span className="text-ink-mute text-xs">{ps.length}</span>
                </div>
                <SortableContext items={ps.map(p => p.id)} strategy={verticalListSortingStrategy} id={t.id}>
                  <DroppableZone id={t.id} isEmpty={ps.length === 0}
                    className="flex flex-col gap-1 min-h-[40px]">
                    {ps.map(p => <PessoaCard key={p.id} p={p} />)}
                  </DroppableZone>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>

      <div className="mt-6 text-xs text-ink-mute screen-only">
        ⚖ SUB JUDICE · ♀ Sexo F · 🔒 fixado manualmente
      </div>

      {/* RELATÓRIO (apenas impressão) — uma seção por turma */}
      <div className="hidden print-only">
        {turmas.map((t, i) => {
          const ps = porTurma.get(t.id) ?? [];
          const sjs = ps.filter(p => p.situacao === "SUB JUDICE").length;
          const fs  = ps.filter(p => p.sexo === "F").length;
          return (
            <PrintSection
              key={t.id}
              numero={i + 1}
              label={t.label}
              sublabel={t.cargo}
              meta={`${ps.length} pessoa${ps.length === 1 ? "" : "s"} · ${sjs} SJ · ${fs} F`}
              breakBefore={i > 0 && i % 2 === 0}>
              <PessoasMiniTable pessoas={ps} />
            </PrintSection>
          );
        })}

        {semTurma.length > 0 && (
          <PrintSection numero="·" label="Sem turma" meta={`${semTurma.length}`}>
            <PessoasMiniTable pessoas={semTurma.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))} />
          </PrintSection>
        )}
      </div>
    </div>
  );
}
