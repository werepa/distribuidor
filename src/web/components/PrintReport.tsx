import type { Pessoa } from "@shared/schemas";

/**
 * Tabela tipográfica de pessoas para uso dentro de seções do relatório.
 * Mesmo tratamento (serif/mono) usado em /pessoas para consistência visual.
 */
export function PessoasMiniTable({ pessoas, mostrarTurma, mostrarAloj }: {
  pessoas: Pessoa[];
  mostrarTurma?: boolean;
  mostrarAloj?: boolean;
}) {
  if (pessoas.length === 0) {
    return <p className="italic text-ink-mute">— sem ocupantes —</p>;
  }
  return (
    <table className="w-full text-sm border-collapse pessoas-table">
      <thead>
        <tr>
          <th className="text-left p-1 w-8">#</th>
          <th className="text-left p-1">Nome / CPF</th>
          <th className="text-left p-1 w-12">Cargo</th>
          <th className="text-left p-1 w-10">Sexo</th>
          <th className="text-left p-1 w-24">Situação</th>
          {mostrarTurma   && <th className="text-left p-1 w-16">Turma</th>}
          {mostrarAloj    && <th className="text-left p-1 w-16">Alojamento</th>}
          <th className="text-left p-1">Nome de guerra</th>
        </tr>
      </thead>
      <tbody>
        {pessoas.map((p, i) => (
          <tr key={p.id}>
            <td className="p-1 font-mono text-xs text-ink-mute">{String(i + 1).padStart(2, "0")}</td>
            <td className="p-1 leading-tight">
              <div>{p.nome}</div>
              <div className="font-mono text-[10px] text-ink-mute mt-0.5">{formatarCPF(p.cpf)}</div>
            </td>
            <td className="p-1">{p.cargo}</td>
            <td className="p-1">{p.sexo}</td>
            <td className="p-1">{p.situacao}</td>
            {mostrarTurma   && <td className="p-1 font-mono">{p.turmaId ?? "—"}</td>}
            {mostrarAloj    && <td className="p-1 font-mono">{p.alojamentoId ?? "—"}</td>}
            <td className="p-1 italic">{p.nomeGuerra ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function formatarCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Cabeçalho de seção: rótulo grande + meta-dados à direita.
 * Cada seção quebra para nova página na impressão (page-break-before).
 */
export function PrintSection({
  numero, label, sublabel, meta, children, breakBefore = false
}: {
  numero?: string | number;
  label: string;
  sublabel?: string;
  meta?: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={`mb-6 ${breakBefore ? "print-break" : ""}`}>
      <div className="flex items-baseline justify-between border-b border-bone pb-1 mb-3">
        <div className="flex items-baseline gap-3">
          {numero !== undefined && (
            <span className="font-mono text-[10px] uppercase tracking-widest2 text-ink-mute">
              {String(numero).padStart(2, "0")}
            </span>
          )}
          <h2 className="font-display text-[20pt] leading-none">{label}</h2>
          {sublabel && (
            <span className="font-mono text-xs text-ink-mute uppercase tracking-widest2">
              {sublabel}
            </span>
          )}
        </div>
        {meta && (
          <span className="font-mono text-xs text-ink-mute uppercase tracking-widest2">
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
