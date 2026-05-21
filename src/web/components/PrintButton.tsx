import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <button
      className="btn-ghost no-print"
      onClick={() => window.print()}
      aria-label={label}
      title={label}>
      <Printer size={15} strokeWidth={1.75} />
      {label}
    </button>
  );
}
