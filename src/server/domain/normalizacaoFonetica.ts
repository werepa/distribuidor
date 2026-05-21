export interface Substituicao { de: string; para: string; }

export function tokenize(nome: string): string[] {
  return nome.trim().split(/\s+/).filter(Boolean);
}

function removerAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizar(palavra: string, subs: Substituicao[]): string {
  let s = removerAcentos(palavra).toUpperCase();
  // ordenar substituições por tamanho desc para evitar conflito
  const ordenadas = [...subs].sort((a, b) => b.de.length - a.de.length);
  for (const { de, para } of ordenadas) {
    if (de.length === palavra.length || de.length > 2) {
      // substituição "palavra inteira"
      if (s === de.toUpperCase()) { s = para.toUpperCase(); continue; }
    }
    s = s.split(de.toUpperCase()).join(para.toUpperCase());
  }
  return s;
}
