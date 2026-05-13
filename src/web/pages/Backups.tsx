import { useEffect, useState } from "react";
import { api } from "../api";

export default function BackupsPage() {
  const [list, setList] = useState<Array<{ nome: string; tamanho: number; mtime: string }>>([]);
  const recarregar = () => api.backups.list().then(setList);
  useEffect(() => { recarregar(); }, []);

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-semibold">Backups</h1>
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          onClick={async () => { await api.backups.criar(); recarregar(); }}>
          ▶ Criar snapshot agora
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr><th className="text-left p-2">Arquivo</th><th className="text-left p-2">Quando</th><th className="text-left p-2">Tamanho</th><th></th></tr>
        </thead>
        <tbody>
          {list.map(b => (
            <tr key={b.nome} className="border-b">
              <td className="p-2 font-mono text-xs">{b.nome}</td>
              <td className="p-2">{new Date(b.mtime).toLocaleString("pt-BR")}</td>
              <td className="p-2">{(b.tamanho / 1024).toFixed(1)} KB</td>
              <td className="p-2">
                <button className="text-amber-700 text-xs"
                  onClick={async () => {
                    if (!confirm(`Restaurar ${b.nome}? Estado atual será salvo como backup.`)) return;
                    const r = await api.backups.restaurar(b.nome);
                    alert(r.msg);
                  }}>restaurar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
