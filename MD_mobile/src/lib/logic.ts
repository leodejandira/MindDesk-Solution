// Regras portadas das telas web, isoladas para teste.

// ---------- Datas e formatos ----------
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function daysAgo(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return isoDate(d);
}

/** "2026-11-09" ou ISO completo → "09/11/2026". */
export function formatDateBR(s?: string | null): string {
  if (!s) return "-";
  return s.slice(0, 10).split("-").reverse().join("/");
}

export function weekdaysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const fim = new Date(end + "T12:00:00");
  while (cur <= fim) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) out.push(isoDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function formatSaldo(min: number): string {
  const abs = Math.abs(min);
  return `${min >= 0 ? "+" : "-"}${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}m`;
}

// ---------- Chat: **negrito** e *itálico* ----------
export type Segment = { text: string; bold?: boolean; italic?: boolean };

export function parseInline(line: string): Segment[] {
  return line
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .filter(Boolean)
    .map((p) =>
      p.startsWith("**") && p.endsWith("**") && p.length > 4
        ? { text: p.slice(2, -2), bold: true }
        : p.startsWith("*") && p.endsWith("*") && p.length > 2
          ? { text: p.slice(1, -1), italic: true }
          : { text: p }
    );
}

// ---------- Mural de avisos ----------
export type Prioridade = "critica" | "alta" | "media" | "baixa";
export type Aviso = {
  tipo: string;
  prioridade: Prioridade;
  status?: string;
  nome?: string;
  cargo?: string;
  mensagem: string;
  dias_restantes?: number;
  data_vencimento?: string;
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  critica: "Crítica",
  alta: "Urgente",
  media: "Disponível",
  baixa: "Em breve",
};

/** Atestados pendentes viram avisos de "afastamento" no mural do gerente. */
export function avisosFromAtestados(atestados: any[]): Aviso[] {
  return (Array.isArray(atestados) ? atestados : []).map((a) => {
    const nome = a.usuarios?.nome || a.nome || "Funcionário";
    const motivo = a.motivo_cid || a.motivo || "Atestado médico";
    return {
      tipo: "afastamento",
      prioridade: "alta",
      nome,
      cargo: a.usuarios?.cargo || a.cargo || "",
      status: "pendente",
      mensagem: `${nome} enviou um atestado pendente de aprovação. Motivo: ${motivo}. Afastamento de ${a.dias_afastamento ?? 0} dia(s).`,
    };
  });
}

// ---------- Cursos ----------
export type Atribuido = { id: string; nome: string; cargo: string; concluido: boolean; concluido_em?: string | null };
export type Curso = {
  id: number;
  titulo: string;
  link: string;
  descricao?: string | null;
  prazo_dias?: number | null;
  created_at?: string;
  concluido: boolean;
  usuarios_atribuidos: Atribuido[];
};

/** A tabela tem uma linha por (curso, usuário); agrupa pelo link como a web. */
export function groupCursos(rows: any[]): Curso[] {
  const map = new Map<string, Curso>();
  for (const c of Array.isArray(rows) ? rows : []) {
    const key = c.link || `sem-link-${c.id}`;
    if (!map.has(key)) {
      map.set(key, {
        id: c.id,
        titulo: c.titulo,
        link: c.link,
        descricao: c.descricao,
        prazo_dias: c.prazo_dias != null ? Number(c.prazo_dias) : null,
        created_at: c.created_at,
        concluido: c.status === "concluido",
        usuarios_atribuidos: [],
      });
    }
    if (c.usuarios && c.usuario_id) {
      map.get(key)!.usuarios_atribuidos.push({
        id: c.usuario_id,
        nome: c.usuarios.nome,
        cargo: c.usuarios.cargo || "Não informado",
        concluido: c.status === "concluido",
        concluido_em: c.concluido_em ?? null,
      });
    }
  }
  return [...map.values()];
}

/** Mesma conta do back-end (concluirCurso): created_at + prazo_dias. */
export function prazoLimite(created_at?: string, prazo_dias?: number | null): string | null {
  if (!created_at || !prazo_dias) return null;
  const d = new Date(created_at);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Number(prazo_dias));
  return isoDate(d);
}

// ---------- Relatórios ----------
const norm = (s?: string) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type Tom = "red" | "orange" | "green" | "blue" | "gray";

export function situacaoFerias(item: any): { label: string; tom: Tom } {
  const s = norm(item?.prioridade || item?.situacao);
  if (["critica", "muito atrasada"].includes(s)) return { label: "Crítica", tom: "red" };
  if (["alta", "atrasada"].includes(s)) return { label: "Atrasado", tom: "orange" };
  if (["media", "disponivel"].includes(s)) return { label: "Disponível", tom: "green" };
  if (["baixa", "disponivel em breve"].includes(s)) return { label: "Em breve", tom: "blue" };
  return { label: "Em dia", tom: "gray" };
}

/** Soma o saldo por funcionário (o RPC pode devolver várias linhas por pessoa). */
export function saldoPorFuncionario(rows: any[]) {
  const map = new Map<string, { nome: string; cargo: string; saldo: number }>();
  for (const r of rows) {
    const cur = map.get(r.usuario_id) || { nome: r.nome || "—", cargo: r.cargo || "Funcionário", saldo: 0 };
    cur.saldo += r.saldo_minutos || 0;
    map.set(r.usuario_id, cur);
  }
  return [...map.values()].sort((a, b) => a.saldo - b.saldo);
}

/** Completa nome/cargo dos atestados usando a lista de usuários. */
export function mergeAfastamentos(todos: any[], usuarios: any[], pendentes: any[] = []) {
  const nomes: Record<string, { nome?: string; cargo?: string }> = {};
  for (const u of usuarios || []) if (u.id) nomes[u.id] = { nome: u.nome, cargo: u.cargo };
  for (const p of [...(pendentes || []), ...(todos || [])])
    if (p.usuario_id && p.usuarios?.nome && !nomes[p.usuario_id]) nomes[p.usuario_id] = p.usuarios;
  return (todos || []).map((a) => ({
    ...a,
    usuarios: {
      nome: a.usuarios?.nome || nomes[a.usuario_id]?.nome || null,
      cargo: a.usuarios?.cargo || nomes[a.usuario_id]?.cargo || null,
    },
  }));
}

// ---------- Humanograma ----------
export type Cor = "verde" | "amarelo" | "vermelho" | "cinza";
export type Pessoa = {
  id: string;
  nome: string;
  cargo: string;
  mes_referencia: string;
  turnover: number;
  burnout: number;
  engajamento: number;
  promocao: number;
  score_humor: number;
  humor: "feliz" | "neutro" | "triste";
  sentimento: string;
  resumoIA: string;
  cores: Record<"turnover" | "burnout" | "engajamento" | "promocao", Cor>;
};

export function mapPessoaPA(item: any): Pessoa {
  const humor = item.score_humor || 0;
  const cinza: Cor = "cinza";
  return {
    id: item.id,
    nome: item.nome || "Colaborador",
    cargo: item.cargo || "Não informado",
    mes_referencia: item.mes_referencia || "Atual",
    turnover: item.score_turnover || 0,
    burnout: item.score_burnout || 0,
    engajamento: item.score_engajamento || 0,
    promocao: item.score_elegibilidade_promocao || 0,
    score_humor: humor,
    humor: humor >= 70 ? "feliz" : humor < 40 ? "triste" : "neutro",
    sentimento: item.sentimento_predominante || "Não avaliado",
    resumoIA: item.analise_pa || "Análise de IA ainda não processada para este ciclo.",
    cores: {
      turnover: item.cores?.turnover || cinza,
      burnout: item.cores?.burnout || cinza,
      engajamento: item.cores?.engajamento || cinza,
      promocao: item.cores?.promocao || cinza,
    },
  };
}

// ---------- Funcionários ----------
export type FuncForm = { nome: string; email: string; cargo: string; password: string; confirmar: string };

/** Mesmas validações da web. Retorna a mensagem de erro ou null. */
export function validarFuncionario(f: FuncForm, novo: boolean): string | null {
  const nome = f.nome.trim();
  const email = f.email.trim();
  const cargo = f.cargo.trim();
  if (!nome || !email || !cargo) return "Nome, e-mail e cargo são obrigatórios.";
  if (nome.length < 3) return "O nome deve possuir ao menos 3 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Digite um e-mail válido.";
  if (cargo.length < 2) return "Cargo inválido.";
  if (novo) {
    if (!f.password) return "Senha é obrigatória.";
    if (f.password.length < 6) return "A senha deve possuir no mínimo 6 caracteres.";
    if (f.password !== f.confirmar) return "As senhas não coincidem.";
  }
  return null;
}

export function matches(q: string, ...fields: (string | undefined | null)[]): boolean {
  const s = q.trim().toLowerCase();
  return !s || fields.some((f) => (f || "").toLowerCase().includes(s));
}

// ---------- Ponto com selfie ----------
export const TIPO_PONTO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  almoco: "Saída para almoço",
  retorno_almoco: "Retorno do almoço",
  saida: "Saída",
};

export const STATUS_PONTO: Record<string, { label: string; tone: "green" | "yellow" | "red" }> = {
  aprovado: { label: "Aprovado", tone: "green" },
  pendente_revisao: { label: "Em revisão", tone: "yellow" },
  rejeitado: { label: "Rejeitado", tone: "red" },
};

/** 45 → "45 m"; 2560 → "2,6 km"; null → "-". */
export function formatDistancia(m?: number | null): string {
  if (m == null) return "-";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** ISO → "10/11/2026 21:37" no horário do aparelho. */
export function formatDataHora(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
