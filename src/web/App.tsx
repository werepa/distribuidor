import { Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Pessoas from "./pages/Pessoas";
import Turmas from "./pages/Turmas";
import Alojamentos from "./pages/Alojamentos";
import NomesGuerra from "./pages/NomesGuerra";
import Configuracao from "./pages/Configuracao";
import Backups from "./pages/Backups";

export default function App() {
  return (
    <div className="flex h-full relative">
      <Sidebar />
      <main className="flex-1 overflow-auto page print:overflow-visible">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/turmas" element={<Turmas />} />
          <Route path="/alojamentos" element={<Alojamentos />} />
          <Route path="/nomes" element={<NomesGuerra />} />
          <Route path="/config" element={<Configuracao />} />
          <Route path="/backups" element={<Backups />} />
        </Routes>
      </main>
    </div>
  );
}
