import { API_URL } from "./config";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setApiToken = (t: string | null) => (token = t);
export const setOnUnauthorized = (fn: (() => void) | null) => (onUnauthorized = fn);

type Options = { method?: string; body?: unknown };

/** Cliente único do back-end: injeta o JWT, serializa JSON/FormData e padroniza erros. */
export async function api<T = any>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body; // boundary definido pelo runtime
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    const msg = data?.error || data?.erro || data?.detalhe || data?.mensagem || `Erro ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

/** Arquivo local (uri) no formato que o FormData do React Native entende. */
export type LocalFile = { uri: string; name: string; mimeType?: string | null; file?: File };

export function appendFile(form: FormData, field: string, f: LocalFile) {
  // No web o picker entrega um File real; no nativo, o objeto {uri,name,type}.
  if (f.file) form.append(field, f.file);
  else form.append(field, { uri: f.uri, name: f.name, type: f.mimeType || "application/octet-stream" } as any);
}
