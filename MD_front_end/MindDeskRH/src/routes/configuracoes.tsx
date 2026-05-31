import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  getPayload,
  getToken,
  TOKEN_KEY,
  API,
  authHeaders,
  PageShell,
  BackButton,
  Logo,
  Alert,
  useTheme,
} from "@/components/minddesk";

import {
  User2,
  ShieldCheck,
  Bell,
  MoonStar,
  LockKeyhole,
  LogOut,
  Mail,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  component: ConfiguracoesPage,
});

type Payload = {
  email?: string;
  nome?: string;
  role?: string;
  user_metadata?: { nome?: string };
};

function ConfiguracoesPage() {
  const navigate = useNavigate();
  
  // 1. Evita o erro de hidratação do SSR (Sinaliza quando o cliente estiver pronto)
  const [mounted, setMounted] = useState(false);

  const { theme, toggle } = useTheme();

  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [role, setRole] = useState("");

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);

  const [senha, setSenha] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });

  const [alert, setAlert] = useState<{ msg: string; type: "error" | "success" }>({
    msg: "",
    type: "error",
  });

  // Garante o ciclo completo no navegador e recupera dados guardados
  useEffect(() => {
    setMounted(true);

    if (!getToken()) {
      navigate({ to: "/login" });
      return;
    }

    const p = getPayload() as Payload;
    setEmail(p?.email || "");
    setNome(p?.nome || p?.user_metadata?.nome || p?.email?.split("@")[0] || "");
    setRole(p?.role || "user");
  }, [navigate]);

  const handleAlterarSenha = async () => {
    setAlert({ msg: "", type: "error" });

    if (!senha.senhaAtual || !senha.novaSenha || !senha.confirmarSenha) {
      return setAlert({ msg: "Preencha todos os campos.", type: "error" });
    }
    if (senha.novaSenha !== senha.confirmarSenha) {
      return setAlert({ msg: "As senhas não coincidem.", type: "error" });
    }
    if (senha.novaSenha.length < 6) {
      return setAlert({ msg: "Mínimo 6 caracteres.", type: "error" });
    }

    try {
      const res = await fetch(`${API}/auth/senha`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ senhaAtual: senha.senhaAtual, novaSenha: senha.novaSenha }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return setAlert({ msg: data.error || data.mensagem || "Erro ao alterar senha.", type: "error" });
      }

      setAlert({ msg: "Senha alterada com sucesso!", type: "success" });
      setSenha({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
    } catch {
      setAlert({ msg: "Erro de conexão com o servidor.", type: "error" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate({ to: "/login" });
  };

  return (
    <PageShell>
      <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%)] text-zinc-900 dark:text-white">
        <div className="max-w-4xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <Logo />
            <BackButton />
          </header>

          {/* HERO */}
          <div className="relative overflow-hidden rounded-[36px] border border-black/5 dark:border-white/10 bg-gradient-to-br from-[#0f172a] via-[#132554] to-[#0b1220] p-6 sm:p-8 mb-8 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
                  Configurações
                </h1>
                <p className="mt-4 text-sm sm:text-base text-white/70 max-w-xl leading-relaxed">
                  Gerencie sua conta, segurança, notificações e preferências do sistema.
                </p>
              </div>
              <div className="w-24 h-24 rounded-[28px] bg-white/10 border border-white/10 backdrop-blur-xl flex items-center justify-center">
                <User2 size={42} className="text-white" />
              </div>
            </div>
          </div>

          {/* PERFIL */}
          <div className="rounded-[32px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {nome?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white truncate">
                  {nome || "Usuário"}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-white/50 truncate">
                  <Mail size={14} />
                  {email}
                </div>
              </div>
              <span className={`px-4 py-2 rounded-2xl text-xs font-bold ${role === "admin" ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" : "bg-blue-500/15 text-blue-600 dark:text-blue-400"}`}>
                {role === "admin" ? "Gerente" : "Funcionário"}
              </span>
            </div>
          </div>

          {/* Só renderiza os controles após montar no cliente, garantindo sincronia perfeita de dados e cliques */}
          {mounted && (
            <div className="space-y-6">
              {/* SENHA */}
              <SectionCard icon={<LockKeyhole size={20} />} title="Segurança" subtitle="Altere sua senha de acesso">
                {alert.msg && (
                  <div className="mb-4">
                    <Alert type={alert.type} msg={alert.msg} />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input className="md-input" type="password" placeholder="Senha atual" value={senha.senhaAtual} onChange={(e) => setSenha({ ...senha, senhaAtual: e.target.value })} />
                  <input className="md-input" type="password" placeholder="Nova senha" value={senha.novaSenha} onChange={(e) => setSenha({ ...senha, novaSenha: e.target.value })} />
                  <input className="md-input" type="password" placeholder="Confirmar senha" value={senha.confirmarSenha} onChange={(e) => setSenha({ ...senha, confirmarSenha: e.target.value })} />
                </div>
                <button onClick={handleAlterarSenha} className="mt-4 h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all">
                  Salvar nova senha
                </button>
              </SectionCard>

              {/* NOTIFICAÇÕES */}
              <SectionCard icon={<Bell size={20} />} title="Notificações" subtitle="Controle os alertas do sistema">
                <Toggle label="Notificações por e-mail" checked={notifEmail} onChange={setNotifEmail} />
                <Toggle label="Notificações push" checked={notifPush} onChange={setNotifPush} />
              </SectionCard>

              {/* APARÊNCIA */}
              <SectionCard icon={<MoonStar size={20} />} title="Aparência" subtitle="Personalize o visual do sistema">
                <Toggle label="Tema escuro" checked={theme === "dark"} onChange={toggle} />
              </SectionCard>

              {/* SESSÃO */}
              <SectionCard icon={<ShieldCheck size={20} />} title="Sessão" subtitle="Gerencie sua conta atual">
                <button onClick={handleLogout} className="w-full h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-500/15 transition-all">
                  <div className="flex items-center justify-center gap-2">
                    <LogOut size={16} />
                    Sair da conta
                  </div>
                </button>
              </SectionCard>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .md-input {
          width: 100%;
          height: 52px;
          padding: 0 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(0,0,0,.08);
          background: rgba(255,255,255,.75);
          backdrop-filter: blur(12px);
          color: #111827;
          font-size: .92rem;
          transition: .2s;
        }
        .dark .md-input {
          background: rgba(255,255,255,.03);
          border-color: rgba(255,255,255,.08);
          color: white;
        }
        .md-input::placeholder { color: rgba(113,113,122,.9); }
        .dark .md-input::placeholder { color: rgba(255,255,255,.35); }
        .md-input:focus {
          outline: none;
          border-color: rgb(59 130 246 / .45);
          box-shadow: 0 0 0 4px rgb(59 130 246 / .12);
        }
      `}</style>
    </PageShell>
  );
}

function SectionCard({ title, subtitle, icon, children }: any) {
  return (
    <div className="rounded-[32px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{title}</h2>
          <p className="text-sm text-zinc-500 dark:text-white/50 mt-1">{subtitle}</p>
        </div>
        <ChevronRight size={18} className="text-zinc-400" />
      </div>
      {children}
    </div>
  );
}

// 2. Simplificado de volta: Ele volta a ser controlado pura e estritamente pelo estado pai
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-black/5 dark:border-white/10 last:border-0">
      <span className="text-sm font-medium text-zinc-800 dark:text-white">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-14 h-8 rounded-full transition-all duration-300 bg-zinc-300 dark:bg-zinc-700"
        style={{ backgroundColor: checked ? 'var(--primary, #3b82f6)' : '' }}
      >
        <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white transition-transform duration-300 ${checked ? "translate-x-6" : ""}`} />
      </button>
    </div>
  );
}

export default ConfiguracoesPage;