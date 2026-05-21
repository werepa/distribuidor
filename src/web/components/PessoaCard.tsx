import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Pessoa } from "@shared/schemas";

/**
 * Cargo color tokens — derivados da paleta institucional do brasão:
 * verde (seal), dourado (wax), azul-marinho (navy), creme (paper),
 * mais dois tons análogos respeitando a harmonia.
 */
const cargoColor: Record<string, string> = {
  APF: "bg-seal/[0.10] text-seal-deep border-l-2 border-seal",
  DPF: "bg-navy/[0.08] text-navy-deep border-l-2 border-navy",
  EPF: "bg-wax-soft text-wax-deep border-l-2 border-wax",
  PCF: "bg-paper-deep/40 text-ink-soft border-l-2 border-bone2",
  PPF: "bg-[#f5e6d6] text-[#8a4a1f] border-l-2 border-[#c47a3c]",
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
      className={`px-2 py-1 rounded-sm text-xs cursor-grab font-medium tracking-tight
                  ${cargoColor[p.cargo] ?? "bg-paper-dim text-ink-soft"}`}>
      <span className="truncate">{p.nome}</span>
      <span className="ml-1">
        {p.situacao === "SUB JUDICE" && <span title="SUB JUDICE" className="text-navy">⚖</span>}
        {p.sexo === "F" && <span title="Sexo F" className="text-wax-deep">♀</span>}
        {p.lockManual.turma && <span title="fixado">🔒</span>}
      </span>
    </div>
  );
}
