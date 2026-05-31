import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

const THEME_KEY = "minddesk_theme";

// ============================================================================
// HOOK DE TEMA (CORRIGIDO PARA EVITAR O FLASH CLARO NO F5)
// ============================================================================
export function useTheme() {
  // O segredo está aqui: lemos e aplicamos o tema IMEDIATAMENTE no momento da criação do estado
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
      const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      
      // Aplica a classe diretamente no HTML antes mesmo do primeiro render do React
      if (initial === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      
      return initial;
    }
    return "light";
  });

  // Mantemos o useEffect apenas para sincronizar caso ocorram mudanças externas (opcional)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggle };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
      className="fixed top-4 right-4 z-50 w-10 h-10 grid place-items-center rounded-full bg-card border border-border shadow-md hover:scale-105 hover:border-primary/50 transition-all text-foreground"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

// ============================================================================
// AUTENTICAÇÃO & API
// ============================================================================
export const API = "http://localhost:3000";
export const TENANT_ID = 1;
export const TOKEN_KEY = "minddesk_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

type JwtPayload = { email?: string; role?: string; exp?: number };

export function getPayload(): JwtPayload | null {
  const t = getToken();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1])) as JwtPayload;
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return payload;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export function isAdmin() {
  return getPayload()?.role === "admin";
}

export function useRequireAuth(requiredRole?: "admin") {
  const navigate = useNavigate();
  useEffect(() => {
    const p = getPayload();
    if (!p) {
      navigate({ to: "/login" });
      return;
    }
    if (requiredRole && p.role !== requiredRole) {
      navigate({ to: "/chat" });
    }
  }, [navigate, requiredRole]);
}

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ============================================================================
// COMPONENTES DE INTERFACE
// ============================================================================
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <Link to="/manager" className="inline-flex items-center gap-2.5 group">
      <div
        className={`${big ? "w-11 h-11" : "w-9 h-9"} rounded-xl bg-primary grid place-items-center shadow-sm group-hover:scale-105 transition-transform`}
      >
        <svg viewBox="0 0 24 24" fill="white" width={big ? 22 : 18} height={big ? 22 : 18}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
        </svg>
      </div>
      <span className={`${big ? "text-2xl" : "text-xl"} font-semibold tracking-tight text-foreground`}>
        Mind<em className="not-italic text-primary">Desk</em>
      </span>
    </Link>
  );
}

export function ShapesBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="md-shape" style={{ top: "8%", left: "6%", width: 220, height: 220, background: "oklch(0.85 0.1 240 / 0.45)" }} />
      <div className="md-shape" style={{ top: "20%", right: "10%", width: 140, height: 140, background: "oklch(0.82 0.13 35 / 0.35)" }} />
      <div className="md-shape" style={{ bottom: "8%", left: "12%", width: 110, height: 110, background: "oklch(0.88 0.08 240 / 0.5)" }} />
      <div className="md-shape" style={{ bottom: "18%", right: "8%", width: 180, height: 180, background: "oklch(0.9 0.06 240 / 0.45)" }} />
      <svg className="absolute top-[6%] right-[24%]" width="80" height="20" viewBox="0 0 80 20" fill="none">
        <path d="M0 10 Q 10 0 20 10 T 40 10 T 60 10 T 80 10" stroke="oklch(0.6 0.15 255)" strokeWidth="2" fill="none" />
      </svg>
      <svg className="absolute bottom-[12%] left-[40%]" width="80" height="20" viewBox="0 0 80 20" fill="none">
        <path d="M0 10 Q 10 0 20 10 T 40 10 T 60 10 T 80 10" stroke="oklch(0.78 0.16 35)" strokeWidth="2" fill="none" />
      </svg>
      <div
        className="absolute top-[40%] right-[6%] w-16 h-16 rounded-full opacity-50"
        style={{
          backgroundImage: "radial-gradient(oklch(0.5 0.18 255) 1.5px, transparent 2px)",
          backgroundSize: "10px 10px",
        }}
      />
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  // Executa o hook de tema globalmente aqui para garantir a classe nas páginas que usam o Shell
  useTheme();

  return (
    <div className="md-bg relative">
      <ShapesBackdrop />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-card border border-border/60 rounded-2xl shadow-[0_10px_40px_-15px_rgba(0,87,183,0.25)] ${className}`}
    >
      {children}
    </div>
  );
}

export function BackButton({ to = "/manager", label = "← Voltar" }: { to?: string; label?: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-secondary hover:text-primary hover:border-primary/40 transition-colors"
    >
      {label}
    </Link>
  );
}

export function Alert({ type, msg }: { type: "error" | "success" | "info"; msg: string }) {
  if (!msg) return null;
  const styles =
    type === "error"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : type === "success"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-secondary text-primary border-primary/20";
  return <div className={`px-4 py-2.5 text-sm font-medium rounded-lg border ${styles}`}>{msg}</div>;
}