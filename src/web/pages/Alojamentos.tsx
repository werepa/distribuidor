import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { api } from "../api";
import type { Pessoa, Alojamento } from "@shared/schemas";
import { PessoaCard } from "../components/PessoaCard";
import { ViolationBadge } from "../components/ViolationBadge";

export default function AlojamentosPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [alojs, setAlojs] = useState<Alojamento[]>([]);

  const recarregar = async () => {
    setPessoas(await api.pessoas.list());
    setAlojs(await api.alojamentos.list());
  };
  useEffect(() => { recarregar(); }, []);

  const porAlojamento = useMemo(() => {
    const m = new Map<string, Pessoa[]>();
    alojs.forEach(a => m.set(a.id, []));
    pessoas.forEach(p => { if (p.alojamentoId && m.has(p.alojamentoId)) m.get(p.alojamentoId)!.push(p); });
    return m;
  }, [pessoas, alojs]);

  const semAlojamento = pessoas.filter(p => !p.alojamentoId);

  const blocos = useMemo(() => {
    const m = new Map<string, Alojamento[]>();
    alojs.forEach(a => {
      if (!m.has(a.bloco)) m.set(a.bloco, []);
      m.get(a.bloco)!.push(a);
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [alojs]);

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
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Alojamentos</h1>
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          onClick={async () => { await api.alojamentos.distribuir(); recarregar(); }}>
          ▶ Distribuir
        </button>
      </div>

      {semAlojamento.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          {semAlojamento.length} pessoa(s) sem alojamento.
        </div>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="space-y-6">
          {blocos.map(([bloco, lista]) => (
            <section key={bloco}>
              <h2 className="font-semibold text-sm text-slate-700 mb-2">Bloco {bloco}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {lista.map(a => {
                  const ps = porAlojamento.get(a.id) ?? [];
                  const violations: string[] = [];
                  if (ps.length > a.max) violations.push(`Lotação excedida (${ps.length}/${a.max})`);
                  const sexoAloj = (a.cargoSexo.split("/")[1] ?? "").trim().toUpperCase();
                  if (sexoAloj && ps.some(p => p.sexo !== sexoAloj)) violations.push("Sexo incompatível");
                  const folga = a.max - ps.length;
                  return (
                    <div key={a.id} className="bg-white border rounded-lg p-2">
                      <div className="font-semibold text-sm flex justify-between mb-2">
                        <span>{a.id} <span className="text-slate-500 font-normal">{a.cargoSexo}</span> <ViolationBadge msgs={violations} /></span>
                        <span className="text-slate-500 text-xs">{ps.length}/{a.max} (folga {folga})</span>
                      </div>
                      <SortableContext items={ps.map(p => p.id)} strategy={verticalListSortingStrategy} id={a.id}>
                        <div className="flex flex-col gap-1 min-h-[40px]" data-aloj={a.id}>
                          {ps.map(p => <PessoaCard key={p.id} p={p} />)}
                        </div>
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
