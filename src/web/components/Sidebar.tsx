import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, Home, Tag, Settings, Save
} from "lucide-react";

const items = [
  { to: "/",            label: "Dashboard",       icon: LayoutDashboard },
  { to: "/pessoas",     label: "Pessoas",         icon: Users },
  { to: "/turmas",      label: "Turmas",          icon: GraduationCap },
  { to: "/alojamentos", label: "Alojamentos",     icon: Home },
  { to: "/nomes",       label: "Nomes de guerra", icon: Tag },
];

const secondary = [
  { to: "/config",  label: "Configuração", icon: Settings },
  { to: "/backups", label: "Backups",      icon: Save },
];

export function Sidebar() {
  return (
    <aside
      className="w-60 shrink-0 bg-seal text-paper flex flex-col justify-between
                 border-r border-seal-deep relative overflow-hidden">
      {/* Heraldic gold glow */}
      <div className="pointer-events-none absolute -top-24 -left-10 w-80 h-80 rounded-full
                      bg-wax/[0.18] blur-3xl" aria-hidden />
      {/* Subtle hatch pattern for institutional texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]
                      [background-image:repeating-linear-gradient(135deg,transparent_0,transparent_6px,#f4ecd6_6px,#f4ecd6_7px)]"
           aria-hidden />

      <div className="relative z-10 p-6">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-1">
          <img src="/logo.png" alt="" className="h-12 w-12 object-contain
                                                 ring-1 ring-wax/30 rounded-full bg-paper/[0.04] p-0.5" />
          <div className="leading-none">
            <div className="font-display italic text-[22px] text-paper">Distribuidor</div>
            <div className="nav-num text-paper/55 mt-1">EDIÇÃO · CFP</div>
          </div>
        </div>

        <div className="h-px bg-paper/10 my-6" />

        {/* Primary nav */}
        <div className="eyebrow !text-paper/40 mb-3 pl-1">Atividade</div>
        <nav className="flex flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon }, i) => (
            <NavItem key={to} to={to} label={label} icon={Icon} index={i + 1} />
          ))}
        </nav>

        <div className="h-px bg-paper/10 my-6" />

        {/* Secondary nav */}
        <div className="eyebrow !text-paper/40 mb-3 pl-1">Sistema</div>
        <nav className="flex flex-col gap-0.5">
          {secondary.map(({ to, label, icon: Icon }, i) => (
            <NavItem key={to} to={to} label={label} icon={Icon} index={items.length + i + 1} />
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="relative z-10 p-6 border-t border-paper/10">
        <div className="font-display italic text-sm text-paper/65 leading-snug">
          Polícia Federal
        </div>
        <div className="nav-num text-paper/30 mt-1">v0.1 · LOCAL</div>
      </div>
    </aside>
  );
}

function NavItem({
  to, label, icon: Icon, index
}: { to: string; label: string; icon: typeof Users; index: number }) {
  const num = String(index).padStart(2, "0");
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm",
          "transition-colors",
          isActive
            ? "bg-paper/[0.08] text-paper"
            : "text-paper/70 hover:text-paper hover:bg-paper/[0.04]"
        ].join(" ")
      }>
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-wax rounded-full" aria-hidden />
          )}
          <span className="nav-num text-paper/35 w-6 shrink-0">{num}</span>
          <Icon size={15} className="text-paper/70 shrink-0" strokeWidth={1.75} />
          <span className="flex-1">{label}</span>
        </>
      )}
    </NavLink>
  );
}
