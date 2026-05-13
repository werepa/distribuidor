import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, GraduationCap, Home, Tag, Settings, Save
} from "lucide-react";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pessoas", label: "Pessoas", icon: Users },
  { to: "/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/alojamentos", label: "Alojamentos", icon: Home },
  { to: "/nomes", label: "Nomes de guerra", icon: Tag },
  { to: "/config", label: "Configuração", icon: Settings },
  { to: "/backups", label: "Backups", icon: Save }
];

export function Sidebar() {
  return (
    <aside className="w-52 bg-slate-900 text-slate-200 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-6">
        <img src="/logo.png" alt="logo" className="h-10 w-10 object-contain" />
        <span className="font-semibold text-white">Distribuidor CFP</span>
      </div>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800"
            }`
          }
        >
          <Icon size={16} /> {label}
        </NavLink>
      ))}
    </aside>
  );
}
