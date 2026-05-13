import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Pessoa } from "@shared/schemas";

const cargoColor: Record<string, string> = {
  APF: "bg-blue-100 text-blue-900",
  DPF: "bg-emerald-100 text-emerald-900",
  EPF: "bg-violet-100 text-violet-900",
  PCF: "bg-amber-100 text-amber-900",
  PPF: "bg-rose-100 text-rose-900"
};

export function PessoaCard({ p }: { p: Pessoa }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`px-2 py-1 rounded text-xs cursor-grab ${cargoColor[p.cargo] ?? "bg-slate-100"}`}>
      <span className="truncate">{p.nome}</span>
      <span className="ml-1">
        {p.situacao === "SUB JUDICE" && <span title="SUB JUDICE">⚖</span>}
        {p.sexo === "F" && <span title="Sexo F">♀</span>}
        {p.lockManual.turma && <span title="fixado">🔒</span>}
      </span>
    </div>
  );
}
