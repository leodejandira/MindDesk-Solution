import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  getToken,
  PageShell,
  BackButton,
  Logo,
  API,
  TENANT_ID,
  authHeaders,
} from "@/components/minddesk";

import {
  BarChart3,
  Clock3,
  CalendarDays,
  BriefcaseMedical,
  TimerReset,
  Ban,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  User,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

import relatorioIllus from "@/assets/illus-relatorios.png";

export const Route = createFileRoute("/relatorios")({
  component: RelatoriosPage,
});

const REPORTS = [
  {
    id: "faltas",
    title: "Faltas",
    icon: <Ban size={20} />,
    desc: "Ausências registradas no período",
  },
  {
    id: "atrasos",
    title: "Atrasos",
    icon: <Clock3 size={20} />,
    desc: "Chegadas após o horário",
  },
  {
    id: "horas",
    title: "Banco de horas",
    icon: <TimerReset size={20} />,
    desc: "Saldo de horas dos funcionários",
  },
  {
    id: "ferias",
    title: "Férias",
    icon: <CalendarDays size={20} />,
    desc: "Férias pendentes e programadas",
  },
  {
    id: "afastamentos",
    title: "Afastamentos",
    icon: <BriefcaseMedical size={20} />,
    desc: "Atestados e licenças vigentes",
  },
];

const isDark =
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function getWeekdaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const fim = new Date(end + "T12:00:00");
  while (cur <= fim) {
    const iso = cur.toISOString().split("T")[0];
    if (!isWeekend(iso)) days.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatDateBR(dateStr?: string) {
  if (!dateStr) return "-";
  return dateStr.split("-").reverse().join("/");
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center">
        <BarChart3 size={26} className="text-zinc-400" />
      </div>
      <p className="text-sm text-zinc-500 dark:text-white/50">
        Nenhum dado encontrado.
      </p>
    </div>
  );
}

// ─── FALTAS ──────────────────────────────────────────────────────────────────
function ChartFaltas({ data, from, to }: { data: any[]; from: string; to: string }) {
  const diasUteis = getWeekdaysBetween(from, to);

  const chartData = useMemo(() => {
    return data.map((item: any) => ({
      name: (item.nome || "").split(" ")[0],
      nomeCompleto: item.nome,
      cargo: item.cargo,
      faltas: Number(item.total_faltas) || 0,
      diasFalta: item.dias_falta || [],
    }));
  }, [data]);

  if (!chartData.length) return <EmptyState />;

  const total = chartData.reduce((s, i) => s + i.faltas, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Funcionários</div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">{chartData.length}</div>
        </div>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Total de faltas</div>
          <div className="text-2xl font-bold mt-1 text-red-600">{total}</div>
        </div>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Dias úteis</div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">{diasUteis.length}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 p-3 text-xs text-blue-700 dark:text-blue-300">
        Falta = dia útil com menos de 4 registros de ponto. Finais de semana ignorados.
      </div>

      <div className="rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 sm:p-5 shadow-sm">
        <div className="w-full h-[280px] -ml-2 pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.12} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#71717a" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#71717a" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#1f2937" : "#ffffff",
                  borderColor: isDark ? "#374151" : "#e5e7eb",
                  borderRadius: "14px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                }}
                formatter={(value: any, _: any, props: any) => [
                  `${value} falta${value !== 1 ? "s" : ""}`,
                  props.payload.nomeCompleto,
                ]}
                labelFormatter={() => ""}
              />
              <Bar dataKey="faltas" radius={[10, 10, 0, 0]} name="Faltas">
                {chartData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.faltas >= 5
                        ? "#ef4444"
                        : entry.faltas >= 3
                        ? "#f97316"
                        : "#fbbf24"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        {chartData
          .sort((a, b) => b.faltas - a.faltas)
          .map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                  item.faltas > 0
                    ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.06] dark:text-white/50"
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                  {item.nomeCompleto}
                </p>
                <p className="text-xs text-zinc-500 dark:text-white/40">{item.cargo}</p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-lg font-bold ${
                    item.faltas >= 5
                      ? "text-red-600"
                      : item.faltas >= 3
                      ? "text-orange-500"
                      : "text-yellow-500"
                  }`}
                >
                  {item.faltas}
                </span>
                <span className="text-xs text-zinc-400 dark:text-white/30 ml-1">
                  dia{item.faltas !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function ChartAtrasos({ data }: { data: any[] }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // O useMemo agora processa a estrutura consolidada que vem do backend
  const { funcionarios, porFuncionario } = useMemo(() => {
    const lista = data.map((item) => ({
      uid: item.usuario_id,
      nome: item.nome || "—",
      cargo: item.cargo || "Funcionário",
      totalAtraso: item.total_atraso_acumulado_mes || 0,
      registros: (item.atrasos || []).map((a: any) => ({
        data: formatDateBR(a.data), // Formatando a data para o gráfico
        minutos: a.minutos_atraso || 0
      })),
      qtd: (item.atrasos || []).length
    }));

    const grupo = lista.reduce((acc, f) => {
      acc[f.uid] = f;
      return acc;
    }, {} as Record<string, any>);

    return { funcionarios: lista, porFuncionario: grupo };
  }, [data]);

  const selected = selectedUser ? porFuncionario[selectedUser] : null;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Funcionários</div>
          <div className="text-2xl font-bold mt-1">{funcionarios.length}</div>
        </div>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Ocorrências</div>
          <div className="text-2xl font-bold mt-1 text-orange-500">
            {funcionarios.reduce((s, f) => s + f.qtd, 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Total min.</div>
          <div className="text-2xl font-bold mt-1 text-zinc-900 dark:text-white">
            {funcionarios.reduce((s, f) => s + f.totalAtraso, 0)}
          </div>
        </div>
      </div>

      {selected ? (
        <div className="space-y-4">
          <button 
            onClick={() => setSelectedUser(null)} 
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={14} /> Voltar para lista
          </button>
          
          <div className="rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-sm">
            <h3 className="font-semibold mb-6">{selected.nome} - Evolução de Atrasos</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selected.registros}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="data" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", backgroundColor: isDark ? "#1f2937" : "#fff" }} />
                  <Line 
                    type="monotone" 
                    dataKey="minutos" 
                    stroke="#f97316" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#f97316" }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {funcionarios.sort((a, b) => b.totalAtraso - a.totalAtraso).map((f) => (
            <button 
              key={f.uid} 
              onClick={() => setSelectedUser(f.uid)} 
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-black/5 hover:border-primary/30 transition-all hover:bg-zinc-50 dark:hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center font-bold text-orange-600 dark:text-orange-400">
                  {f.nome.charAt(0)}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{f.nome}</p>
                  <p className="text-xs text-zinc-500">{f.qtd} ocorrências</p>
                </div>
              </div>
              <p className="font-bold text-orange-500">{f.totalAtraso} min</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
// ─── BANCO DE HORAS ───────────────────────────────────────────────────────────
function ChartHoras({ data }: { data: any[] }) {
  const porFuncionario: Record<string, { nome: string; cargo: string; saldoMinutos: number }> = {};
  data.forEach((item: any) => {
    const uid = item.usuario_id;
    if (!porFuncionario[uid]) {
      porFuncionario[uid] = {
        nome: item.nome || "—",
        cargo: item.cargo || "Funcionário",
        saldoMinutos: 0,
      };
    }
    porFuncionario[uid].saldoMinutos += item.saldo_minutos || 0;
  });

  const funcionarios = Object.values(porFuncionario).sort(
    (a, b) => a.saldoMinutos - b.saldoMinutos
  );

  const positivos = funcionarios.filter((f) => f.saldoMinutos >= 0);
  const negativos = funcionarios.filter((f) => f.saldoMinutos < 0);

  function formatSaldo(minutos: number) {
    const abs = Math.abs(minutos);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const prefix = minutos >= 0 ? "+" : "-";
    return `${prefix}${h}h${String(m).padStart(2, "0")}m`;
  }

  const chartData = funcionarios.map((f) => ({
    nome: f.nome.split(" ")[0],
    nomeCompleto: f.nome,
    cargo: f.cargo,
    saldo: Number((f.saldoMinutos / 60).toFixed(2)),
    saldoMinutos: f.saldoMinutos,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/20 p-4 flex items-center gap-3">
          <TrendingUp size={20} className="text-green-600 dark:text-green-400 shrink-0" />
          <div>
            <div className="text-xs text-green-700 dark:text-green-400 font-medium">Crédito</div>
            <div className="text-xl font-bold text-green-700 dark:text-green-400 mt-0.5">{positivos.length} func.</div>
          </div>
        </div>
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-3">
          <TrendingDown size={20} className="text-red-600 dark:text-red-400 shrink-0" />
          <div>
            <div className="text-xs text-red-700 dark:text-red-400 font-medium">Débito</div>
            <div className="text-xl font-bold text-red-700 dark:text-red-400 mt-0.5">{negativos.length} func.</div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 sm:p-5 shadow-sm">
        <p className="text-xs text-zinc-400 dark:text-white/30 uppercase tracking-wider font-medium mb-4">
          Saldo em horas
        </p>
        <div className="w-full h-[260px] -ml-2 pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.12} />
              <XAxis
                dataKey="nome"
                tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#71717a" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: isDark ? "#a1a1aa" : "#71717a" }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "horas",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  style: { fontSize: 11, fill: isDark ? "#71717a" : "#a1a1aa" },
                }}
              />
              <ReferenceLine y={0} stroke={isDark ? "#374151" : "#e5e7eb"} strokeWidth={1.5} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#1f2937" : "#ffffff",
                  borderColor: isDark ? "#374151" : "#e5e7eb",
                  borderRadius: "14px",
                }}
                formatter={(val: any, _: any, props: any) => [
                  formatSaldo(props.payload.saldoMinutos),
                  props.payload.nomeCompleto,
                ]}
                labelFormatter={() => ""}
              />
              <Bar dataKey="saldo" radius={[8, 8, 0, 0]} name="Saldo">
                {chartData.map((entry, index) => (
                  <Cell key={index} fill={entry.saldo >= 0 ? "#22c55e" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-2">
        {funcionarios
          .sort((a, b) => a.saldoMinutos - b.saldoMinutos)
          .map((f, i) => {
            const positivo = f.saldoMinutos >= 0;
            return (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    positivo
                      ? "bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {positivo ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-white text-sm truncate">{f.nome}</p>
                  <p className="text-xs text-zinc-500 dark:text-white/40">{f.cargo}</p>
                </div>
                <div
                  className={`text-lg font-bold shrink-0 ${
                    positivo ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatSaldo(f.saldoMinutos)}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── FÉRIAS ───────────────────────────────────────────────────────────────────
/**
 * Componente TabelaFerias
 * Exibe um dashboard de status de férias dos funcionários.
 * @param {Object} props - Propriedades do componente.
 * @param {Array} props.data - Lista de objetos com dados de férias.
 */
function TabelaFerias({ data }: any) {
  console.info(`[TabelaFerias] Renderizando ${data?.length || 0} registros.`);

  function normalizarTexto(texto: string) {
    return texto?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
  }

  function chave(item: any): string {
    return item.prioridade || item.situacao || "";
  }

  function labelSituacao(raw: string): string {
    const s = normalizarTexto(raw);
    if (["critica", "muito atrasada"].includes(s))       return "Critica";
    if (["alta", "atrasada"].includes(s))                return "Atrasado";
    if (["media", "disponivel"].includes(s))             return "Disponível";
    if (["baixa", "disponivel em breve"].includes(s))    return "Em breve";
    return "Em dia";
  }

  function corSituacao(raw: string): string {
    const s = normalizarTexto(raw);
    if (["critica", "muito atrasada"].includes(s))
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
    if (["alta", "atrasada"].includes(s))
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400";
    if (["media", "disponivel"].includes(s))
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
    if (["baixa", "disponivel em breve"].includes(s))
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  }

  function corAviso(raw: string): string {
    const s = normalizarTexto(raw);
    if (["critica", "muito atrasada"].includes(s))
      return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300";
    if (["alta", "atrasada"].includes(s))
      return "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-300";
    if (["media", "disponivel"].includes(s))
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-300";
    if (["baixa", "disponivel em breve"].includes(s))
      return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300";
    return "bg-zinc-100 dark:bg-white/[0.04] border-black/5 dark:border-white/10 text-zinc-700 dark:text-white/70";
  }

  const criticas    = data.filter((i: any) => ["critica", "muito atrasada"].includes(normalizarTexto(chave(i)))).length;
  const atencao     = data.filter((i: any) => ["alta", "atrasada"].includes(normalizarTexto(chave(i)))).length;
  const disponiveis = data.filter((i: any) => ["media", "disponivel"].includes(normalizarTexto(chave(i)))).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4">
          <div className="text-xs text-zinc-500 dark:text-white/50">Funcionários</div>
          <div className="text-2xl font-bold mt-1">{data.length}</div>
        </div>
        <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/10 p-4">
          <div className="text-xs text-red-600 dark:text-red-400 font-medium">Férias Vencidas</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{criticas}</div>
        </div>
        <div className="rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/10 p-4">
          <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Atrasado</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{atencao}</div>
        </div>
        <div className="rounded-2xl border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/10 p-4">
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">Disponível</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{disponiveis}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item: any, index: number) => (
          <div
            key={index}
            className="rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-white">{item.nome || "-"}</h4>
                <p className="text-xs text-zinc-500 dark:text-white/50 mt-1">{item.cargo || "-"}</p>
              </div>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shrink-0 ${corSituacao(chave(item))}`}>
                {labelSituacao(chave(item))}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-zinc-500 dark:text-white/50">Últimas férias</div>
                <div className="font-medium mt-1 text-zinc-900 dark:text-white">
                  {formatDateBR(item.data_ultima_ferias)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 dark:text-white/50">Vencimento</div>
                <div className="font-medium mt-1 text-zinc-900 dark:text-white">
                  {formatDateBR(item.data_vencimento_ferias)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-zinc-500 dark:text-white/50">Períodos pendentes</div>
                <div className="mt-1 inline-flex px-3 py-1 rounded-lg bg-zinc-100 dark:bg-white/[0.06] font-semibold text-zinc-900 dark:text-white">
                  {item.ferias_pendentes || 0}
                </div>
              </div>
            </div>

            {item.aviso && (
              <div className={`mt-5 rounded-2xl border p-4 text-sm font-medium ${corAviso(chave(item))}`}>
                {item.aviso}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AFASTAMENTOS ─────────────────────────────────────────────────────────────
type AbaAfastamento = "pendente" | "aprovado" | "recusado";

function TabelaAfastamentos({ data, onUpdateStatus }: { data: any[]; onUpdateStatus: (id: string, status: string) => void }) {
  const [aba, setAba] = useState<AbaAfastamento>("pendente");
  const [busca, setBusca] = useState("");

  function nomeFuncionario(item: any): string {
    return item.usuarios?.nome || item.nome || item.usuario?.nome || "—";
  }
  function cargoFuncionario(item: any): string {
    return item.usuarios?.cargo || item.cargo || item.usuario?.cargo || "Funcionário";
  }

  const abas: { id: AbaAfastamento; label: string; icon: React.ReactNode; cor: string }[] = [
    { id: "pendente", label: "Pendentes", icon: <Clock size={14} />, cor: "text-yellow-600 dark:text-yellow-400" },
    { id: "aprovado", label: "Aceitos", icon: <CheckCircle2 size={14} />, cor: "text-green-600 dark:text-green-400" },
    { id: "recusado", label: "Recusados", icon: <XCircle size={14} />, cor: "text-red-600 dark:text-red-400" },
  ];

  const counts = {
    pendente: data.filter((i) => i.status === "pendente").length,
    aprovado: data.filter((i) => i.status === "aprovado").length,
    recusado: data.filter((i) => i.status === "recusado").length,
  };

  const filtrados = data.filter((item) => {
    const nome = nomeFuncionario(item).toLowerCase();
    return nome.includes(busca.toLowerCase()) && item.status === aba;
  });

  function badgeAba(status: string) {
    switch (status) {
      case "aprovado": return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400";
      case "recusado": return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
      default: return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400";
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-2xl border p-4 text-left transition-all ${
              aba === a.id
                ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
                : "border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:bg-zinc-50 dark:hover:bg-white/[0.05]"
            }`}
          >
            <div className={`flex items-center gap-1.5 text-xs font-medium mb-1 ${a.cor}`}>
              {a.icon}
              {a.label}
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">{counts[a.id]}</div>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-white/30" />
        <input
          type="text"
          placeholder="Buscar por nome do funcionário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full h-12 pl-10 pr-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm outline-none focus:border-primary/40 transition-colors placeholder:text-zinc-400 dark:placeholder:text-white/30"
        />
        {busca && (
          <button onClick={() => setBusca("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-black/5 dark:border-white/10">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              aba === a.id
                ? "border-primary text-primary"
                : "border-transparent text-zinc-500 dark:text-white/50 hover:text-zinc-700 dark:hover:text-white/70"
            }`}
          >
            {a.icon}
            {a.label}
            {counts[a.id] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${aba === a.id ? "bg-primary/15 text-primary" : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-white/50"}`}>
                {counts[a.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-3xl bg-zinc-100 dark:bg-white/[0.05] flex items-center justify-center">
            <BriefcaseMedical size={22} className="text-zinc-400" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-white/50">
            {busca ? `Nenhum resultado para "${busca}"` : "Nenhum atestado nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((item: any) => (
            <div key={item.id} className="rounded-[24px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {nomeFuncionario(item).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-white truncate">
                      {nomeFuncionario(item)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-white/50">
                      {cargoFuncionario(item)}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shrink-0 ${badgeAba(item.status)}`}>
                  {item.status || "pendente"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-zinc-500 dark:text-white/50">Motivo / CID</div>
                  <div className="font-medium mt-1 text-zinc-900 dark:text-white">{item.motivo_cid || item.motivo || "Atestado"}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 dark:text-white/50">Data de emissão</div>
                  <div className="font-medium mt-1 text-zinc-900 dark:text-white">{formatDateBR(item.data_emissao)}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 dark:text-white/50">Dias afastado</div>
                  <div className="font-medium mt-1 text-zinc-900 dark:text-white">{item.dias_afastamento ?? "-"}</div>
                </div>
              </div>

              {item.url_arquivo && (
                <a href={item.url_arquivo} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline">
                  Ver atestado →
                </a>
              )}

              {item.status === "pendente" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onUpdateStatus(item.id, "aprovado")}
                    className="flex-1 h-10 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-500/20 transition-colors"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => onUpdateStatus(item.id, "recusado")}
                    className="flex-1 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors"
                  >
                    Recusar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
function RelatoriosPage() {
  const navigate = useNavigate();

  const [open, setOpen] = useState<string | null>(null);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<any[]>([]);

  useEffect(() => {
    if (!getToken()) navigate({ to: "/login" });
  }, [navigate]);

  async function carregarRelatorio(tipo: string) {
    try {
      setLoading(true);

      if (tipo === "afastamentos") {
        const [todosRes, pendentesRes, usuariosRes] = await Promise.all([
          fetch(`${API}/atestados?tenant_id=${TENANT_ID}`, { headers: authHeaders() }),
          fetch(`${API}/atestados/pendentes`, { headers: authHeaders() }),
          fetch(`${API}/usuarios?tenant_id=${TENANT_ID}`, { headers: authHeaders() }),
        ]);

        const todos: any[] = todosRes.ok ? await todosRes.json() : [];
        const pendentes: any[] = pendentesRes.ok ? await pendentesRes.json() : [];
        const usuarios: any[] = usuariosRes.ok ? await usuariosRes.json() : [];

        const nomeMapa: Record<string, any> = {};

        (Array.isArray(usuarios) ? usuarios : []).forEach((u: any) => {
          if (u.id) nomeMapa[u.id] = { nome: u.nome, cargo: u.cargo, email: u.email };
        });

        (Array.isArray(pendentes) ? pendentes : []).forEach((p: any) => {
          if (p.usuario_id && p.usuarios?.nome && !nomeMapa[p.usuario_id]) {
            nomeMapa[p.usuario_id] = p.usuarios;
          }
        });

        (Array.isArray(todos) ? todos : []).forEach((p: any) => {
          if (p.usuario_id && p.usuarios?.nome && !nomeMapa[p.usuario_id]) {
            nomeMapa[p.usuario_id] = p.usuarios;
          }
        });

        const resultado = (Array.isArray(todos) ? todos : []).map((item: any) => ({
          ...item,
          usuarios: {
            nome: item.usuarios?.nome || nomeMapa[item.usuario_id]?.nome || null,
            cargo: item.usuarios?.cargo || nomeMapa[item.usuario_id]?.cargo || null,
            email: item.usuarios?.email || nomeMapa[item.usuario_id]?.email || null,
          },
        }));

        setDados(resultado);
        return;
      }

      let endpoint = "";
      switch (tipo) {
        case "faltas":  endpoint = "faltas";      break;
        case "atrasos": endpoint = "atrasos";     break;
        case "horas":   endpoint = "banco-horas"; break;
        case "ferias":  endpoint = "ferias";      break;
        default: return;
      }

      // ✅ CORREÇÃO: banco de horas não usa filtro de datas
      let url = `${API}/relatorios/${endpoint}?tenant_id=${TENANT_ID}`;
      if (tipo !== "ferias" && tipo !== "horas") url += `&data_inicio=${from}&data_fim=${to}`;

      const response = await fetch(url, { headers: authHeaders() });
      const json = await response.json();

      if (!response.ok) throw new Error(json.error || "Erro ao carregar relatório");

      setDados(Array.isArray(json) ? json : []);
    } catch (err: any) {
      console.error(err);
      alert(err.message);
      setDados([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      const response = await fetch(`${API}/atestados/${id}/status`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Erro ao atualizar status");
      }

      setDados((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  }

  useEffect(() => {
    if (open) carregarRelatorio(open);
  }, [open, from, to]);

  const report = useMemo(() => REPORTS.find((r) => r.id === open), [open]);

  function renderContent() {
    if (loading) return <Loading />;
    if (!dados?.length) return <EmptyState />;

    switch (open) {
      case "faltas":
        return <ChartFaltas data={dados} from={from} to={to} />;
      case "atrasos":
        return <ChartAtrasos data={dados} />;
      case "horas":
        return <ChartHoras data={dados} />;
      case "ferias":
        return <TabelaFerias data={dados} />;
      case "afastamentos":
        return <TabelaAfastamentos data={dados} onUpdateStatus={handleUpdateStatus} />;
      default:
        return null;
    }
  }

  return (
    <PageShell>
      <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%)]">
        <div className="max-w-6xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <Logo />
            <BackButton />
          </header>

          <div className="relative overflow-hidden rounded-[36px] border border-black/5 dark:border-white/10 bg-gradient-to-br from-[#0f172a] via-[#132554] to-[#0b1220] p-6 sm:p-8 lg:p-10 mb-8 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  Relatórios
                </h1>
                <p className="mt-4 text-sm sm:text-lg text-white/70 leading-relaxed max-w-xl">
                  Visualize indicadores, métricas e informações importantes da equipe em tempo real.
                </p>
              </div>
              <div className="hidden md:flex items-center justify-center flex-1">
                <img
                  src={relatorioIllus}
                  alt="Relatórios"
                  className="w-56 lg:w-72 xl:w-80 h-auto object-contain drop-shadow-[0_20px_50px_rgba(59,130,246,0.35)]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REPORTS.map((r) => (
              <button
                key={r.id}
                onClick={() => setOpen(r.id)}
                className="group relative overflow-hidden rounded-[30px] p-5 border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] text-left shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary shrink-0">
                    {r.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-zinc-900 dark:text-white">{r.title}</div>
                    <div className="text-sm text-zinc-500 dark:text-white/50 mt-1 leading-relaxed">{r.desc}</div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {open && report && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-5"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full md:max-w-4xl max-h-[95vh] overflow-y-auto rounded-t-[34px] md:rounded-[34px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#0f1115] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-20 px-5 sm:px-6 py-5 border-b border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#0f1115]/90 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary">
                    {report.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      Relatório de {report.title}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-white/50">{report.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(null)}
                  className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white/70 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ✅ CORREÇÃO: remove filtro de datas do banco de horas */}
              {open !== "ferias" && open !== "afastamentos" && open !== "horas" && (
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-white/50">Início</label>
                    <input
                      type="date"
                      value={from}
                      max={to}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full mt-1 h-12 px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-white/50">Fim</label>
                    <input
                      type="date"
                      value={to}
                      min={from}
                      max={today()}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full mt-1 h-12 px-4 rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">{renderContent()}</div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

export default RelatoriosPage;