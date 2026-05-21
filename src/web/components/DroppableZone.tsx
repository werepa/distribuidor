import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

/**
 * Wrapper droppable que registra o container inteiro como alvo,
 * permitindo soltar pessoas em colunas vazias (turma/alojamento sem ocupantes).
 */
export function DroppableZone({
  id, children, className, isEmpty
}: {
  id: string;
  children: ReactNode;
  className?: string;
  /** Aplica destaque visual quando vazio + over */
  isEmpty?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const cls = [
    className ?? "",
    isOver && isEmpty ? "bg-wax-soft border border-dashed border-wax/60 rounded" : "",
    isEmpty ? "min-h-[60px]" : ""
  ].join(" ");
  return (
    <div ref={setNodeRef} className={cls}>
      {children}
    </div>
  );
}
