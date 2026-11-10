export type JwtPayload = {
  id?: string;
  email?: string;
  nome?: string;
  role?: string;
  tenant_id?: number;
  exp?: number;
};

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  // decodifica UTF-8 (nomes com acento)
  return decodeURIComponent(
    Array.from(bin, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
  );
}

/** Lê o payload do JWT. Retorna null se inválido ou expirado. */
export function decodeJwt(token: string | null | undefined, now = Date.now()): JwtPayload | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(b64urlDecode(token.split(".")[1])) as JwtPayload;
    if (payload.exp && payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function displayName(p: JwtPayload | null): string {
  return p?.nome || p?.email?.split("@")[0] || "usuário";
}
