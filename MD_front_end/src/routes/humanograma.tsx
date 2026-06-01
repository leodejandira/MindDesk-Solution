import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { API, authHeaders, getToken, PageShell, Card, BackButton, Logo } from "@/components/minddesk";
import {
  Smile,
  Meh,
  Frown,
  X,
  TrendingUp,
  ShieldAlert,
  HeartPulse,
  ChevronRight,
  Stethoscope,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/humanograma")({
  component: HumanogramaPage,
});

// =========================================
// Tipagens integradas com o Backend
// =========================================
type CoresPA = {
  burnout: "verde" | "amarelo" | "vermelho" | "cinza";
  turnover: "verde" | "amarelo" | "vermelho" | "cinza";
  engajamento: "verde" | "amarelo" | "vermelho" | "cinza";
  promocao: "verde" | "amarelo" | "vermelho" | "cinza";
};

type FuncionarioPA = {
  id: string;
  nome: string;
  cargo: string;
  mes_referencia: string;
  turnover: number;
  promocao: number;
  engajamento: number;
  burnout: number;
  score_humor: number;
  sentimento_visual: "feliz" | "neutro" | "triste"; // Define a cor e o ícone
  sentimento_predominante: string; // O texto real vindo da análise
  afastado: boolean;
  resumoIA: string;
  cores: CoresPA;
};

// Configuração apenas visual (sem o label de texto, pois usaremos o do banco)
const sentimentoConfig = {
  feliz: {
    icon: <Smile size={14} />,
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  neutro: {
    icon: <Meh size={14} />,
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  triste: {
    icon: <Frown size={14} />,
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
  },
} as const;

const GRADS = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-fuchsia-600",
];

// =========================================
// Componentes de UI Auxiliares
// =========================================
function Avatar({ nome, size = "md" }: { nome: string; size?: "sm" | "md" }) {
  const parts = nome ? nome.split(" ") : ["U", "R"];
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].substring(0, 2);
  const grad = GRADS[(nome?.length || 0) % GRADS.length];
  const dim = size === "sm" ? "w-9 h-9 text-xs" : "w-12 h-12 text-sm";
  
  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm flex-shrink-0`}>
      <span className="text-white font-bold tracking-wider uppercase">{initials}</span>
    </div>
  );
}

function ScorePill({ label, value, corStatus }: { label: string; value: number; corStatus: string }) {
  let colorClass = "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-white/60";

  if (corStatus === "verde") {
    colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
  } else if (corStatus === "amarelo") {
    colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  } else if (corStatus === "vermelho") {
    colorClass = "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${colorClass}`}>
      {label} {value || 0}%
    </span>
  );
}

function Bar({ value, corStatus }: { value: number; corStatus: string }) {
  let colorClass = "bg-zinc-400";
  if (corStatus === "verde") colorClass = "bg-emerald-500";
  if (corStatus === "amarelo") colorClass = "bg-amber-500";
  if (corStatus === "vermelho") colorClass = "bg-rose-500";

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1 h-2 bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-700`}
          style={{ width: `${value || 0}%` }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right text-zinc-700 dark:text-white/80">
        {value || 0}%
      </span>
    </div>
  );
}

function MetricRow({ icon, label, value, corStatus }: { icon: React.ReactNode; label: string; value: number; corStatus: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-zinc-700 dark:text-white/80">{label}</span>
        </div>
        <span className="text-sm font-bold text-zinc-900 dark:text-white">{value || 0}%</span>
      </div>
      <Bar value={value} corStatus={corStatus} />
    </div>
  );
}

// =========================================
// Página Principal do Humanograma
// =========================================
function HumanogramaPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<FuncionarioPA | null>(null);
  const [pessoas, setPessoas] = useState<FuncionarioPA[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login" });
      return;
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/relatorios/relatorios-pa`, {
        headers: authHeaders(),
      });
      
      if (!res.ok) throw new Error("Falha ao buscar dados");
      const data = await res.json();

      const formatados: FuncionarioPA[] = data.map((item: any) => {
        // Regra para definir o visual baseado no Score (ex: > 70 feliz, < 40 triste)
        const notaHumor = item.score_humor || 0;
        let visual: "feliz" | "neutro" | "triste" = "neutro";
        if (notaHumor >= 70) visual = "feliz";
        else if (notaHumor < 40) visual = "triste";

        return {
          id: item.id,
          nome: item.nome || "Colaborador",
          cargo: item.cargo || "Não informado",
          mes_referencia: item.mes_referencia || "Atual",
          turnover: item.score_turnover,
          promocao: item.score_elegibilidade_promocao,
          engajamento: item.score_engajamento,
          burnout: item.score_burnout,
          score_humor: notaHumor,
          sentimento_visual: visual,
          sentimento_predominante: item.sentimento_predominante || "Não avaliado",
          afastado: false, // Pode ser ajustado depois se tiver validação de atestados
          resumoIA: item.analise_pa || "Análise de IA ainda não processada para este ciclo.",
          cores: item.cores,
        };
      });

      setPessoas(formatados);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-6 sm:py-10 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.06),transparent_40%)]">
        
        {/* Cabeçalho Base */}
        <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
          <Logo />
          <BackButton />
        </div>

        <div className="max-w-5xl mx-auto">
          <Card className="p-5 sm:p-8 rounded-[32px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-xl">
            
            {/* Título e Subtítulo */}
            <div className="mb-8 border-b border-black/5 dark:border-white/10 pb-6">
              <div className="flex items-center gap-2.5 mb-2">
                <HeartPulse size={22} className="text-violet-500" />
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  Humanograma
                </h1>
              </div>
              <p className="text-sm text-zinc-500 dark:text-white/60 leading-relaxed max-w-3xl">
                Monitore a saúde organizacional da sua equipe. Clique em um colaborador para ver análise detalhada e o resumo gerado pela IA.
              </p>
            </div>

            {/* Renderização do Grid */}
            {loading ? (
              <div className="text-center py-10 text-zinc-500 font-medium animate-pulse">Analisando dados da equipe...</div>
            ) : pessoas.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 font-medium">Nenhum dado de análise encontrado para a sua equipe.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pessoas.map((p) => {
                  const cfg = sentimentoConfig[p.sentimento_visual] || sentimentoConfig.neutro;
                  
                  return (
                    <button
                      key={p.id}
                      onClick={() => setOpen(p)}
                      className="text-left p-4 rounded-[24px] border border-black/5 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.01] hover:bg-white dark:hover:bg-white/[0.04] hover:border-violet-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar nome={p.nome} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate group-hover:text-violet-500 transition-colors">
                            {p.nome}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-white/45 font-medium mt-0.5 truncate">
                            {p.cargo} · Ref: {p.mes_referencia}
                          </div>
                        </div>

                        {/* Ícones do lado direito no Card */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div
                            className={`w-7 h-7 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center`}
                            title={p.sentimento_predominante} // Mostra o texto ao passar o mouse
                          >
                            {cfg.icon}
                          </div>
                          {p.afastado && (
                            <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500" title="Licença Médica">
                              <Stethoscope size={13} />
                            </div>
                          )}
                          <ChevronRight size={14} className="text-zinc-300 dark:text-white/20 group-hover:translate-x-0.5 group-hover:text-violet-400 transition-all ml-0.5 hidden sm:block" />
                        </div>
                      </div>

                      {/* Informações Resumidas do Card */}
                      <div className="flex flex-wrap gap-1.5">
                        <ScorePill label="Turnover" value={p.turnover} corStatus={p.cores.turnover} />
                        <ScorePill label="Burnout"   value={p.burnout}     corStatus={p.cores.burnout} />
                        <ScorePill label="Engaj." value={p.engajamento} corStatus={p.cores.engajamento} />
                        <ScorePill label="Promoção" value={p.promocao} corStatus={p.cores.promocao} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal de Detalhes do Colaborador */}
      {open && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md grid place-items-center z-50 p-4" onClick={() => setOpen(null)}>
          <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <Card className="w-full rounded-[32px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#151518] shadow-2xl overflow-hidden">
              
              {/* Header do Modal */}
              <div className="px-6 pt-6 pb-5 border-b border-black/5 dark:border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <Avatar nome={open.nome} size="md" />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{open.nome}</h2>
                    <p className="text-sm text-zinc-500 dark:text-white/45">
                      {open.cargo}
                    </p>
                  </div>
                  <button onClick={() => setOpen(null)} className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-3">
                  <MetricRow icon={<ShieldAlert size={15} className="text-zinc-400" />} label="Risco de Turnover" value={open.turnover} corStatus={open.cores.turnover} />
                  <MetricRow icon={<HeartPulse size={15} className="text-zinc-400" />} label="Risco de Burnout" value={open.burnout} corStatus={open.cores.burnout} />
                  <MetricRow icon={<TrendingUp size={15} className="text-zinc-400" />} label="Elegibilidade Promoção" value={open.promocao} corStatus={open.cores.promocao} />
                  <MetricRow icon={<Sparkles size={15} className="text-zinc-400" />} label="Engajamento" value={open.engajamento} corStatus={open.cores.engajamento} />
                </div>

                {/* Bloco de Humor e Afastamento (Agora unindo pontuação, ícone e texto real) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-zinc-400 dark:text-white/30 uppercase tracking-wider font-medium">Humor & Sentimento</p>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{open.score_humor}%</span>
                    </div>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${sentimentoConfig[open.sentimento_visual]?.bg} ${sentimentoConfig[open.sentimento_visual]?.text}`}>
                      {sentimentoConfig[open.sentimento_visual]?.icon}
                      {open.sentimento_predominante}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-black/5 dark:border-white/[0.06]">
                    <p className="text-[11px] text-zinc-400 dark:text-white/30 uppercase tracking-wider font-medium mb-2">Afastamento</p>
                    {open.afastado ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                        <Stethoscope size={12} /> Licença
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 dark:text-white/30 font-medium">Sem afastamento ativo</span>
                    )}
                  </div>
                </div>

                {/* Bloco Resumo IA */}
                <div className="rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 to-indigo-50/50 dark:from-violet-500/[0.07] dark:to-indigo-500/[0.04] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center">
                      <Sparkles size={13} className="text-violet-500" />
                    </div>
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Resumo da IA</span>
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-white/75 leading-relaxed">{open.resumoIA}</p>
                </div>
              </div>

            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default HumanogramaPage;