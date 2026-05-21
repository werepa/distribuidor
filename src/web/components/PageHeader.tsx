import { ReactNode } from "react";

export function PageHeader({
  eyebrow, title, italic, count, total, children
}: {
  eyebrow?: string;
  title: string;
  /** Optional italic suffix appended to the title for editorial flourish */
  italic?: string;
  /** Filtered count (left) over total (right) — appears in the rule */
  count?: number;
  total?: number;
  /** Right-aligned action buttons */
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 pt-2">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          <h1 className="font-display text-[44px] leading-[0.95] tracking-tight text-ink">
            {title}
            {italic && <span className="italic text-wax"> {italic}</span>}
          </h1>
        </div>
        {children && <div className="flex items-center gap-2 pb-1.5">{children}</div>}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-bone" />
        {count !== undefined && total !== undefined && (
          <span className="nav-num text-ink-mute">
            {String(count).padStart(3, "0")} / {String(total).padStart(3, "0")}
          </span>
        )}
      </div>
    </header>
  );
}
