import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { storage } from "./storage";

const light = {
  bg: "#F4F7FB",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  primary: "#0057B7",
  primarySoft: "#E6EFFA",
  danger: "#DC2626",
  hero: "#132554",
};
const dark: typeof light = {
  bg: "#0B0F17",
  card: "#151A23",
  text: "#F1F5F9",
  muted: "#94A3B8",
  border: "#253042",
  primary: "#4C8DF6",
  primarySoft: "#16243B",
  danger: "#F87171",
  hero: "#132554",
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
} as const;
export type ToneName = keyof typeof TONES;

const KEY = "minddesk_theme";
type Ctx = { c: Colors; dark: boolean; toggle: () => void };
const ThemeCtx = createContext<Ctx>({ c: light, dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    storage.get(KEY).then((v) => (v === "light" || v === "dark") && setMode(v));
  }, []);

  const isDark = (mode ?? system) === "dark";
  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setMode(next);
    storage.set(KEY, next);
  };

  return <ThemeCtx.Provider value={{ c: isDark ? dark : light, dark: isDark, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
