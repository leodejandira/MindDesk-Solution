import { API, authHeaders } from "@/components/minddesk";

// Mesmas regras do app (MD_mobile/src/lib/logic.ts), para o ponto com selfie.
export const TIPO_PONTO_LABEL: Record<string, string> = {
  entrada: "Entrada",
  almoco: "Saída para almoço",
  retorno_almoco: "Retorno do almoço",
  saida: "Saída",
};

export const STATUS_PONTO: Record<string, { label: string; cls: string }> = {
  aprovado: { label: "Aprovado", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  pendente_revisao: { label: "Em revisão", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  rejeitado: { label: "Rejeitado", cls: "bg-red-500/15 text-red-600 dark:text-red-300" },
};

/** 45 → "45 m"; 2560 → "2,6 km"; null → "-". */
export function formatDistancia(m?: number | null): string {
  if (m == null) return "-";
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** ISO → "10/11/2026 21:37" no horário do navegador. */
export function formatDataHora(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const mapsUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export type Posicao = { latitude: number; longitude: number; precisao: number | null };

/** Posição atual com alta precisão (sem cache). Exige HTTPS ou localhost. */
export function posicaoAtual(): Promise<Posicao> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Este navegador não informa a localização."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, precisao: p.coords.accuracy ?? null }),
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Permita o acesso à localização para registrar o ponto."
              : "Não foi possível obter sua localização. Tente novamente."
          )
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  });
}

/** fetch autenticado que devolve o JSON ou lança o erro do back-end. */
export async function apiPonto<T>(path: string, init: { method?: string; body?: FormData | object } = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: init.method || "GET",
      headers: { ...authHeaders(), ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}) },
      body: init.body ? (isForm ? (init.body as FormData) : JSON.stringify(init.body)) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.erro || data?.error || data?.message || `Erro ${res.status}`);
  return data as T;
}
