import { useEffect, useState } from "react";
import { Save, RotateCcw, Loader2, Check } from "lucide-react";
import { api } from "../api";

type Backup = { nome: string; tamanho: number; mtime: string };

export default function BackupsPage() {
  const [list, setList] = useState<Backup[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [novoNome, setNovoNome] = useState<string | null>(null);

  const recarregar = async () => {
    setCarregando(true);
    setList(await api.backups.list());
    setCarregando(false);
  };
  useEffect(() => { recarregar(); }, []);

  const criar = async () => {
    setCriando(true);
    try {
      const r = await api.backups.criar();
      const nome = r.path.split("/").pop() ?? null;
      setNovoNome(nome);
      await recarregar();
      setTimeout(() => setNovoNome(null), 3000);
    } catch (err: any) {
      alert("Erro ao criar backup: " + err.message);
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between mb-2">
        <h1 className="text-[34px] font-normal leading-none">Backups</h1>
        <button
          disabled={criando}
          className="bg-seal text-paper hover:bg-seal-deep disabled:bg-seal/50 px-3 py-2 rounded text-sm font-medium inline-flex items-center gap-2"
          onClick={criar}>
          {criando
            ? <><Loader2 size={15} className="animate-spin" /> Criando…</>
            : <><Save size={15} /> Criar snapshot agora</>}
        </button>
      </div>
      <p className="text-sm text-ink-mute mb-4">
        Snapshots automáticos rodam antes de operações destrutivas (re-distribuir, importar, restaurar). Máximo de 10 são mantidos — os mais antigos são descartados.
      </p>

      {novoNome && (
        <div className="mb-4 p-3 bg-wax-soft border border-wax/30 rounded flex items-center gap-2 text-sm">
          <Check size={16} className="text-wax-deep" />
          <span>Snapshot criado: <code className="font-mono text-xs">{novoNome}</code></span>
        </div>
      )}

      {carregando ? (
        <p className="text-ink-mute">Carregando…</p>
      ) : list.length === 0 ? (
        <p className="text-ink-mute italic">Nenhum snapshot ainda.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead className="bg-paper-dim border-b border-bone">
            <tr>
              <th className="text-left p-2">Arquivo</th>
              <th className="text-left p-2">Quando</th>
              <th className="text-left p-2">Tamanho</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(b => {
              const novo = b.nome === novoNome;
              return (
                <tr key={b.nome} className={`border-b border-bone/60 ${novo ? "bg-wax-soft/50" : "hover:bg-paper-dim"}`}>
                  <td className="p-2 font-mono text-xs">{b.nome}</td>
                  <td className="p-2">{new Date(b.mtime).toLocaleString("pt-BR")}</td>
                  <td className="p-2 font-mono text-xs">{(b.tamanho / 1024).toFixed(1)} KB</td>
                  <td className="p-2 text-right">
                    <button
                      className="text-wax-deep hover:bg-wax-soft px-2 py-1 rounded text-xs inline-flex items-center gap-1"
                      onClick={async () => {
                        if (!confirm(`Restaurar ${b.nome}? Estado atual será salvo como backup.`)) return;
                        const r = await api.backups.restaurar(b.nome);
                        alert(r.msg);
                      }}>
                      <RotateCcw size={12} /> restaurar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
