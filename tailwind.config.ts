import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/web/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // === Paleta derivada do brasão da Academia Nacional de Polícia ===

        // Verde-floresta institucional (borda do brasão) — sidebar, headers
        seal: {
          DEFAULT: "#1d3a32",
          deep:    "#10211c",
          soft:    "#2e544a",
          tint:    "#7a948b",
        },

        // Faixa creme do brasão — fundo principal
        paper: {
          DEFAULT: "#ebe0c0",   // creme mais saturado (era #f4ecd6)
          dim:     "#dfd2ac",   // mais profundo p/ headers de tabela
          deep:    "#c9b87f",   // separadores e hovers fortes
        },

        // Pergaminho claro — superfície de cards (CONTRASTA com paper)
        ivory: {
          DEFAULT: "#fbf6e3",
          dim:     "#f4ecd0",
          edge:    "#e8dcb4",   // borda quando precisar de mais contraste
        },

        // Dourado heráldico (estrelas, losango central) — acento de ação
        wax: {
          DEFAULT: "#c89134",   // gold sealing wax
          deep:    "#8f6418",
          soft:    "#f6e6bd",
          tint:    "#dcaa55",
        },

        // Azul-marinho do círculo interno — acento secundário (SUB JUDICE etc.)
        navy: {
          DEFAULT: "#162a52",
          deep:    "#0a1632",
          soft:    "#dde2ed",
        },

        // Tinta sobre creme
        ink: {
          DEFAULT: "#1c1814",
          soft:    "#3d3830",
          mute:    "#73685a",
        },

        // Bordas / divisores (tom parchment escuro)
        bone:  "#c9bc92",
        bone2: "#a89976",

        // SUB JUDICE — usa navy
        moss:  "#1d3a32",       // mantido como alias do seal (referências antigas)
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        sans:    ['"Geist"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono:    ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        widest2: "0.18em",
      },
      boxShadow: {
        // Sombra "papel sobre papel" — visível mas suave
        paper:  "0 1px 0 rgba(28,24,20,0.06), 0 2px 4px rgba(28,24,20,0.08), 0 8px 16px -6px rgba(28,24,20,0.10)",
        lift:   "0 14px 32px -10px rgba(28,24,20,0.22), 0 2px 4px rgba(28,24,20,0.08)",
        seal:   "0 24px 60px -20px rgba(16,33,28,0.40)",
        inset:  "inset 0 1px 0 rgba(255,250,232,0.6)",
      },
    },
  },
  plugins: []
} satisfies Config;
