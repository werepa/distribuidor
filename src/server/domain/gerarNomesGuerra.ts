import type { Pessoa, Config } from "../../shared/schemas.js";
import { normalizar, tokenize } from "./normalizacaoFonetica.js";

function candidatosPara(pessoa: Pessoa, cfg: Config): string[] {
  const tokens = tokenize(pessoa.nome).map(t => t.toUpperCase());
  const stopUpper = new Set(cfg.stopWordsNomeGuerra.map(s => s.toUpperCase()));
  const palavras = tokens.filter(t => !stopUpper.has(t));
  if (palavras.length === 0) return [];

  const cands: string[] = [];
  // primeiro nome não-stopword
  cands.push(palavras[0]!);
  // último nome não-stopword (se diferente do primeiro)
  if (palavras.length > 1) cands.push(palavras[palavras.length - 1]!);
  // primeiro + último — só quando há pelo menos 3 palavras não-stopword
  // (com apenas 2, seria o nome completo, não serve como nome de guerra)
  if (palavras.length >= 3) {
    cands.push(`${palavras[0]} ${palavras[palavras.length - 1]}`);
    // primeiro + cada intermediário
    for (let i = 1; i < palavras.length - 1; i++) {
      cands.push(`${palavras[0]} ${palavras[i]}`);
    }
  }
  // pares adjacentes de palavras não-stopword (só quando >= 3 palavras)
  if (palavras.length >= 3) {
    for (let i = 0; i < palavras.length - 1; i++) {
      cands.push(`${palavras[i]} ${palavras[i + 1]}`);
    }
  }
  // pares adjacentes envolvendo stop-words
  for (let i = 0; i < tokens.length - 1; i++) {
    if (stopUpper.has(tokens[i]!) && !stopUpper.has(tokens[i + 1]!)) {
      cands.push(`${tokens[i]} ${tokens[i + 1]}`);
    }
  }
  return [...new Set(cands)];
}

function chave(s: string, cfg: Config): string {
  return tokenize(s).map(t => normalizar(t, cfg.normalizacoesFoneticas)).join(" ");
}

export function gerarNomesGuerra(pessoas: Pessoa[], cfg: Config): Pessoa[] {
  const out = pessoas.map(p => ({ ...p, lockManual: { ...p.lockManual } }));

  // ocupação por turma (chave fonética -> ocupado)
  const ocupTurma = new Map<string, Set<string>>();
  // ocupação por cargo (chave fonética -> ocupado)
  const ocupCargo = new Map<string, Set<string>>();

  // registrar travados
  const trav = out.filter(p => p.lockManual.nomeGuerra && p.nomeGuerra);
  for (const p of trav) {
    if (p.turmaId) {
      if (!ocupTurma.has(p.turmaId)) ocupTurma.set(p.turmaId, new Set());
      ocupTurma.get(p.turmaId)!.add(chave(p.nomeGuerra!, cfg));
    }
    if (!ocupCargo.has(p.cargo)) ocupCargo.set(p.cargo, new Set());
    ocupCargo.get(p.cargo)!.add(chave(p.nomeGuerra!, cfg));
  }

  // processar os não-travados em ordem determinística
  const livres = out.filter(p => !p.lockManual.nomeGuerra);
  livres.sort((a, b) => {
    // mulheres primeiro (convenção: nome de guerra baseado em primeiro nome)
    if (a.sexo !== b.sexo) return a.sexo === "F" ? -1 : 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  for (const p of livres) {
    p.nomeGuerra = undefined;
    const cands = candidatosPara(p, cfg);
    let escolhido: string | undefined;
    let escolhidoConflitaCargo = true;

    for (const c of cands) {
      const k = chave(c, cfg);
      // conflito de turma é bloqueante
      const turmaSet = p.turmaId ? (ocupTurma.get(p.turmaId) ?? new Set()) : new Set<string>();
      if (turmaSet.has(k)) continue;

      const cargoSet = ocupCargo.get(p.cargo) ?? new Set();
      const conflitaCargo = cargoSet.has(k);

      if (!escolhido) {
        // primeiro candidato válido (sem conflito de turma)
        escolhido = c;
        escolhidoConflitaCargo = conflitaCargo;
        if (!conflitaCargo) break; // perfeito: sem conflito em nenhum nível
      } else if (escolhidoConflitaCargo && !conflitaCargo) {
        // candidato melhor: resolve conflito de cargo sem criar conflito de turma
        escolhido = c;
        escolhidoConflitaCargo = false;
        break;
      }
    }

    if (escolhido) {
      p.nomeGuerra = escolhido;
      const k = chave(escolhido, cfg);
      if (p.turmaId) {
        if (!ocupTurma.has(p.turmaId)) ocupTurma.set(p.turmaId, new Set());
        ocupTurma.get(p.turmaId)!.add(k);
      }
      if (!ocupCargo.has(p.cargo)) ocupCargo.set(p.cargo, new Set());
      ocupCargo.get(p.cargo)!.add(k);
    }
  }

  return out;
}
