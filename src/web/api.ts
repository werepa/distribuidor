import type { Pessoa, Turma, Alojamento, Config, Meta } from "@shared/schemas";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json() as Promise<T>;
}

export const api = {
  health: () => req<{ ok: boolean; edicao: string }>("/health"),

  pessoas: {
    list: () => req<Pessoa[]>("/pessoas"),
    create: (p: Omit<Pessoa, "id" | "criadoEm" | "lockManual">) =>
      req<Pessoa>("/pessoas", { method: "POST", body: JSON.stringify(p) }),
    update: (id: string, patch: Partial<Pessoa>) =>
      req<Pessoa>(`/pessoas/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    remove: (id: string) =>
      req<{ ok: true }>(`/pessoas/${id}`, { method: "DELETE" })
  },

  turmas: {
    list: () => req<Turma[]>("/turmas"),
    distribuir: () => req<{ ok: true; turmas: number }>("/turmas/distribuir", { method: "POST" }),
    mover: (id: string, turmaId: string | null, lock = true) =>
      req(`/turmas/pessoa/${id}`, { method: "PATCH", body: JSON.stringify({ turmaId, lock }) })
  },
  alojamentos: {
    list: () => req<Alojamento[]>("/alojamentos"),
    distribuir: () => req<{ ok: true }>("/alojamentos/distribuir", { method: "POST" }),
    mover: (id: string, alojamentoId: string | null, lock = true) =>
      req(`/alojamentos/pessoa/${id}`, { method: "PATCH", body: JSON.stringify({ alojamentoId, lock }) })
  },
  nomesGuerra: {
    gerar: () => req<{ ok: true }>("/nomes-guerra/gerar", { method: "POST" }),
    set: (id: string, nomeGuerra: string | null, lock = true) =>
      req(`/nomes-guerra/pessoa/${id}`, { method: "PATCH", body: JSON.stringify({ nomeGuerra, lock }) })
  },
  config: {
    get: () => req<Config>("/config"),
    meta: () => req<Meta>("/config/meta"),
    save: (c: Config) => req("/config", { method: "PUT", body: JSON.stringify(c) }),
    setEdicao: (edicao: string) => req("/config/edicao", { method: "PUT", body: JSON.stringify({ edicao }) })
  },

  importar: {
    xlsm: async (file: File): Promise<{ inseridos: number; ignorados: number; alojamentos: number; erros: string[] }> => {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${BASE}/importar/xlsm`, { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    }
  }
};
