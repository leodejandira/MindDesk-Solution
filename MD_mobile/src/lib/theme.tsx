import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { storage } from "./storage";

// Tokens convertidos do styles.css da web (oklch → hex), mesma identidade azul do MindDesk.
const light = {
  bg: "#F7FBFD",
  bgGlow: "#DCEBFA", // radial-gradient do topo (.md-bg)
  card: "#FFFFFF",
  cardBorder: "rgba(0,0,0,0.06)", // border-black/5
  text: "#0B1C2C",
  muted: "#576574",
  border: "#DCE6EE",
  input: "#FFFFFF",
  primary: "#005FC6",
  primaryText: "#FFFFFF",
  primarySoft: "rgba(0,95,198,0.10)", // bg-primary/10
  accent: "#FF8E6E",
  danger: "#E62C2C",
  hero: ["#111827", "#172554", "#0F172A"] as const, // bg-gradient-to-br do card de boas-vindas
};
const dark: typeof light = {
  bg: "#0A121F",
  bgGlow: "#0E2A52",
  card: "#121B29", // dark:bg-white/[0.04] sobre o fundo (sólido para modais)
  cardBorder: "rgba(255,255,255,0.10)", // dark:border-white/10
  text: "#EFF6FB",
  muted: "#97A7B7",
  border: "#283345",
  input: "#162030",
  primary: "#4C9FFF",
  primaryText: "#030915",
  primarySoft: "rgba(76,159,255,0.14)",
  accent: "#FF8E6E",
  danger: "#FF5251",
  hero: ["#111827", "#172554", "#0F172A"] as const,
};
export type Colors = typeof light;

/** Paleta semântica (fundo, texto) para badges e avisos. */
export const TONES = {
  red: { bg: "#FEE2E2", fg: "#B91C1C" },
  orange: { bg: "#FFEDD5", fg: "#C2410C" },
  green: { bg: "#DCFCE7", fg: "#15803D" },
  blue: { bg: "#DBEAFE", fg: "#1D4ED8" },
  yellow: { bg: "#FEF3C7", fg: "#B45309" },
  gray: { bg: "#F1F5F9", fg: "#475569" },
  violet: { bg: "#EDE9FE", fg: "#6D28D9" },
};
export type ToneName = keyof typeof TONES;
export type Tones = typeof TONES;

/** No escuro: fundo translúcido + texto claro (padrão bg-x-500/15 text-x-300 da web). */
const TONES_DARK: Tones = {
  red: { bg: "rgba(239,68,68,0.16)", fg: "#FCA5A5" },
  orange: { bg: "rgba(249,115,22,0.16)", fg: "#FDBA74" },
  green: { bg: "rgba(34,197,94,0.16)", fg: "#86EFAC" },
  blue: { bg: "rgba(59,130,246,0.18)", fg: "#93C5FD" },
  yellow: { bg: "rgba(234,179,8,0.16)", fg: "#FDE047" },
  gray: { bg: "rgba(148,163,184,0.16)", fg: "#CBD5E1" },
  violet: { bg: "rgba(139,92,246,0.18)", fg: "#C4B5FD" },
};

/** Sora, a mesma fonte do site (carregada no _layout raiz). */
export const FONT = { regular: "Sora_400Regular", medium: "Sora_500Medium", semibold: "Sora_600SemiBold", bold: "Sora_700Bold" };

const KEY = "minddesk_theme";
type Ctx = { c: Colors; tones: Tones; dark: boolean; toggle: () => void };
const ThemeCtx = createContext<Ctx>({ c: dark, tones: TONES_DARK, dark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Escuro por padrão, como a identidade do app; o usuário pode trocar em Configurações.
  const [mode, setMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    storage.get(KEY).then((v) => (v === "light" || v === "dark") && setMode(v));
  }, []);

  const isDark = mode === "dark";
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setMode(next);
    storage.set(KEY, next);
  };

  return (
    <ThemeCtx.Provider value={{ c: isDark ? dark : light, tones: isDark ? TONES_DARK : TONES, dark: isDark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
