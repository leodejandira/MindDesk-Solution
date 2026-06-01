import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  PageShell,
  Card,
  Logo,
  getPayload,
  TOKEN_KEY,
  API,
  authHeaders,
} from "@/components/minddesk";

import {
  MessageCircle,
  QrCode,
  BarChart3,
  Users,
  GraduationCap,
  FileText,
  Settings,
  BrainCircuit,
  ArrowRight,
} from "lucide-react";

import homeIllus from "@/assets/illus-home.png";

export const Route = createFileRoute("/manager")({
  component: ManagerPage,
});

type MenuItem = {
  icon: React.ReactNode;
  title: string | ((isAdmin: boolean) => string);
  desc: string | ((isAdmin: boolean) => string);
  to:
    | "/chat"
    | "/funcionarios"
    | "/documentos"
    | "/cursos"
    | "/qrcode"
    | "/relatorios"
    | "/humanograma"
    | "/configuracoes";
  admin?: boolean;
  hideForAdmin?: boolean;
};

type Aviso = {
  tipo: string;
  prioridade: "critica" | "alta" | "media" | "baixa";
  status?: string;
  nome?: string;
  cargo?: string;
  mensagem: string;
  dias_restantes?: number;
  meses_referencia?: number;
  data_vencimento?: string;
};

type Payload = {
  email?: string;
  nome?: string;
  role?: string;
  user_metadata?: {
    nome?: string;
  };
};

// =========================================
// MENU
// =========================================
const MENU: MenuItem[] = [
  {
    icon: <MessageCircle size={22} strokeWidth={1.8} />,
    title: "Chat RH",
    desc: "Converse com o assistente virtual",
    to: "/chat",
  },
  {
    icon: <QrCode size={22} strokeWidth={1.8} />,
    title: "Gerar QR Code",
    desc: "Acesso rápido para colaboradores",
    to: "/qrcode",
  },
  {
    icon: <BarChart3 size={22} strokeWidth={1.8} />,
    title: "Relatórios",
    desc: "Faltas, atrasos e desempenho",
    to: "/relatorios",
    admin: true,
  },
  {
    icon: <BrainCircuit size={22} strokeWidth={1.8} />,
    title: "Humanograma",
    desc: "Indicadores e análise de pessoas",
    to: "/humanograma",
    admin: true,
  },
  {
    icon: <Users size={22} strokeWidth={1.8} />,
    title: "Funcionários",
    desc: "Gerenciar colaboradores",
    to: "/funcionarios",
    admin: true,
  },
  {
    icon: <GraduationCap size={22} strokeWidth={1.8} />,
    title: "Meus Cursos",
    desc: "Treinamentos e capacitações",
    to: "/cursos",
    hideForAdmin: true,
  },
  {
    icon: <FileText size={22} strokeWidth={1.8} />,
    title: "Documentos & Cursos",
    desc: "PDFs, links e treinamentos",
    to: "/documentos",
    admin: true,
  },
  {
    icon: <Settings size={22} strokeWidth={1.8} />,
    title: "Configurações",
    desc: "Preferências da conta",
    to: "/configuracoes",
  },
];

// =========================================
// ESTILOS DOS AVISOS
// =========================================
// =========================================
// ESTILOS DOS AVISOS
// =========================================
function getAvisoStyles(prioridade: string, tipo?: string) {
  // Afastamentos pendentes sempre em laranja (alta)
  const p = prioridade;

  switch (p) {
    case "critica":
      return {
        card: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40",
        badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/40",
        text: "text-red-700 dark:text-red-300",
        dot: "bg-red-500",
      };
    case "alta":
      return {
        card: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40",
        badge: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40",
        text: "text-orange-700 dark:text-orange-300",
        dot: "bg-orange-500",
      };
    case "media":
      return {
        card: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40",
        badge: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900/40",
        text: "text-green-700 dark:text-green-300",
        dot: "bg-green-500",
      };
    case "baixa":
      return {
        card: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40",
        text: "text-blue-700 dark:text-blue-300",
        dot: "bg-blue-500",
      };
    default:
      return {
        card: "bg-zinc-100 dark:bg-white/[0.04] border-black/5 dark:border-white/10",
        badge: "bg-zinc-200 text-zinc-600 dark:bg-white/10 dark:text-white/50 border border-zinc-200 dark:border-white/10",
        text: "text-zinc-700 dark:text-white/70",
        dot: "bg-zinc-400",
      };
  }
}

function getPrioridadeLabel(prioridade: string) {
  switch (prioridade) {
    case "critica": return "Critica";
    case "alta":    return "Urgente";
    case "media":   return "Disponível";
    case "baixa":   return "Em breve";
    default:        return "Informativo";
  }
}

function getTipoLabel(tipo: string) {
  switch (tipo) {
    case "férias":      return "Férias";
    case "afastamento": return "Afastamento";
    default:            return tipo;
  }
}

// =========================================
// CARD GERENTE
// =========================================
function AvisoCardGerente({ aviso }: { aviso: Aviso }) {
  const styles = getAvisoStyles(aviso.prioridade, aviso.tipo);

  return (
    <li className={`p-4 rounded-2xl border ${styles.card}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles.badge}`}>
          {getTipoLabel(aviso.tipo)} • {getPrioridadeLabel(aviso.prioridade)}
        </span>
        {(aviso.dias_restantes ?? 0) > 0 && (
          <span className="text-[11px] text-zinc-500 dark:text-white/50">
            {aviso.dias_restantes} dia(s)
          </span>
        )}
      </div>
      <p className={`text-sm font-medium mt-3 leading-relaxed ${styles.text}`}>
        {aviso.mensagem}
      </p>
      {(aviso.nome || aviso.cargo) && (
        <p className="text-xs text-zinc-500 dark:text-white/40 mt-2">
          {aviso.nome}{aviso.cargo ? ` • ${aviso.cargo}` : ""}
        </p>
      )}
    </li>
  );
}

// =========================================
// CARD FUNCIONÁRIO
// =========================================
function AvisoCardFuncionario({ aviso }: { aviso: Aviso }) {
  const styles = getAvisoStyles(aviso.prioridade, aviso.tipo);

  return (
    <li className={`p-4 rounded-2xl border ${styles.card}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${styles.badge}`}>
          {getTipoLabel(aviso.tipo)} • {getPrioridadeLabel(aviso.prioridade)}
        </span>
        {(aviso.dias_restantes ?? 0) > 0 && (
          <span className="text-[11px] text-zinc-500 dark:text-white/50">
            {aviso.dias_restantes} dia(s)
          </span>
        )}
      </div>
      <p className={`text-sm font-medium leading-relaxed ${styles.text}`}>
        {aviso.mensagem}
      </p>
      {aviso.data_vencimento && aviso.tipo === "férias" && (
        <p className="text-xs text-zinc-500 dark:text-white/40 mt-2">
          Vencimento: {aviso.data_vencimento.split("-").reverse().join("/")}
        </p>
      )}
    </li>
  );
}

// =========================================
// PAGE
// =========================================
function ManagerPage() {
  const navigate = useNavigate();

  const [nome, setNome] = useState("usuário");
  const [isAdmin, setIsAdmin] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    const p = getPayload() as Payload;

    if (!p) {
      navigate({ to: "/login" });
      return;
    }

    const admin = p.role === "admin";

    setNome(
      p.nome ||
        p.user_metadata?.nome ||
        p.email?.split("@")[0] ||
        "usuário"
    );

    setIsAdmin(admin);
    fetchAvisos(admin);
  }, [navigate]);

  const fetchAvisos = async (admin: boolean) => {
    try {
      // 1. Busca os avisos normais (férias, etc.)
      const url = admin ? `${API}/avisos` : `${API}/avisos/meus`;
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json();
      const avisosBase: Aviso[] = res.ok && Array.isArray(data) ? data : [];

      // 2. Se for admin, busca também os atestados pendentes para exibir no mural
      if (admin) {
        const atestadosRes = await fetch(`${API}/atestados/pendentes`, {
          headers: authHeaders(),
        });

        if (atestadosRes.ok) {
          const atestados = await atestadosRes.json();

          // Converte cada atestado pendente em um aviso no formato do mural
          const avisosAtestados: Aviso[] = (Array.isArray(atestados) ? atestados : []).map(
            (a: any) => {
              const nome = a.usuarios?.nome || a.nome || "Funcionário";
              const cargo = a.usuarios?.cargo || a.cargo || "";
              const dias = a.dias_afastamento ?? 0;
              const motivo = a.motivo_cid || a.motivo || "Atestado médico";

              return {
                tipo: "afastamento",
                prioridade: "alta",
                nome,
                cargo,
                mensagem: `${nome} enviou um atestado pendente de aprovação. Motivo: ${motivo}. Afastamento de ${dias} dia(s).`,
                status: "pendente",
              };
            }
          );

          setAvisos([...avisosAtestados, ...avisosBase]);
          return;
        }
      }

      setAvisos(avisosBase);
    } catch (err) {
      console.error("Erro ao buscar avisos", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate({ to: "/login" });
  };

  const items = useMemo(() => {
    return MENU.filter((item) => {
      if (item.admin && !isAdmin) return false;
      if (item.hideForAdmin && isAdmin) return false;
      return true;
    });
  }, [isAdmin]);

  return (
    <PageShell>
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-6 sm:py-10 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%)]">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-8 max-w-6xl mx-auto">
          <Logo />

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-sm text-zinc-600 dark:text-white/70">
              Olá,{" "}
              <span className="text-zinc-900 dark:text-white font-semibold capitalize">
                {nome}
              </span>
              {isAdmin && (
                <span className="ml-2 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-primary/10 border border-primary/20 text-primary">
                  Gerente
                </span>
              )}
            </span>

            <button
              onClick={handleLogout}
              className="h-11 px-5 rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 text-sm font-medium text-zinc-800 dark:text-white shadow-sm hover:shadow-md transition-all"
            >
              Sair
            </button>
          </div>
        </header>

        {/* GRID */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10 max-w-6xl mx-auto">
          {/* ESQUERDA */}
          <div>
            {/* HERO */}
            <Card className="relative overflow-hidden border border-black/5 dark:border-white/10 bg-gradient-to-br from-[#111827] via-[#172554] to-[#0f172a] text-white p-6 sm:p-8 mb-6 rounded-[32px] shadow-2xl">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />

              <div className="relative flex items-center justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
                    Bem-vindo de volta,
                    <span className="block capitalize mt-1">{nome}</span>
                  </h1>

                  <p className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-lg">
                    {isAdmin
                      ? "Gerencie sua equipe, acompanhe relatórios e acesse recursos do RH de forma rápida."
                      : "Acompanhe seus treinamentos, avisos e recursos disponíveis no sistema."}
                  </p>
                </div>

                <img
                  src={homeIllus}
                  alt=""
                  width={220}
                  height={180}
                  className="hidden md:block w-70 lg:w-75 h-auto object-contain"
                />
              </div>
            </Card>

            {/* TITLE */}
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-white/50">
                Menu principal
              </h2>
            </div>

            {/* MENU */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {items.map((m) => {
                const resolvedTitle = typeof m.title === "function" ? m.title(isAdmin) : m.title;
                const resolvedDesc = typeof m.desc === "function" ? m.desc(isAdmin) : m.desc;

                return (
                  <Link key={resolvedTitle} to={m.to}>
                    <div className="group relative overflow-hidden flex items-center gap-4 p-5 min-h-[110px] rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] dark:backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 cursor-pointer">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        {m.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] sm:text-base font-semibold text-zinc-900 dark:text-white leading-tight">
                          {resolvedTitle}
                        </div>
                        <div className="text-xs sm:text-sm text-zinc-500 dark:text-white/50 mt-1 leading-relaxed">
                          {resolvedDesc}
                        </div>
                      </div>

                      <div className="text-zinc-400 dark:text-white/40 group-hover:translate-x-1 transition-transform duration-300">
                        <ArrowRight size={18} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* DIREITA */}
          <aside>
            <Card className="p-5 sm:p-6 rounded-[32px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.04] shadow-xl">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-white/50 mb-1">
                {isAdmin ? "Mural de avisos" : "Meus avisos"}
              </h3>

              <p className="text-sm text-zinc-500 dark:text-white/45 mb-5 leading-relaxed">
                {isAdmin
                  ? "Alertas relacionados à equipe e informações importantes."
                  : "Situação atual das suas férias e afastamentos."}
              </p>

              <ul className="space-y-3">
                {avisos.length === 0 && (
                  <li className="text-sm text-zinc-500 dark:text-white/45 py-10 text-center">
                    {isAdmin
                      ? "Nenhum aviso disponível no momento."
                      : "Você não possui avisos pendentes."}
                  </li>
                )}

                {avisos.map((a, index) =>
                  isAdmin ? (
                    <AvisoCardGerente key={index} aviso={a} />
                  ) : (
                    <AvisoCardFuncionario key={index} aviso={a} />
                  )
                )}
              </ul>
            </Card>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

export default ManagerPage;