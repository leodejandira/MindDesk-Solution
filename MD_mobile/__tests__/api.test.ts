import { ApiError, api, setApiToken, setOnUnauthorized } from "@/lib/api";
import { decodeJwt } from "@/lib/jwt";

const jwt = (payload: object) =>
  `x.${btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.y`;

describe("decodeJwt", () => {
  test("lê o payload (com acentos)", () => {
    expect(decodeJwt(jwt({ nome: "João", role: "admin" }))).toEqual({ nome: "João", role: "admin" });
  });
  test("rejeita expirado e inválido", () => {
    expect(decodeJwt(jwt({ exp: 1000 }), 2_000_000)).toBeNull();
    expect(decodeJwt("lixo")).toBeNull();
    expect(decodeJwt(null)).toBeNull();
  });
});

describe("api", () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as any;
    setApiToken(null);
    setOnUnauthorized(null);
  });

  const respond = (status: number, body: unknown) =>
    fetchMock.mockResolvedValueOnce({ ok: status < 400, status, json: async () => body });

  test("envia JSON com Bearer token", async () => {
    setApiToken("tok");
    respond(200, { answer: "oi" });
    await expect(api("/chat/perguntar", { method: "POST", body: { query: "x" } })).resolves.toEqual({ answer: "oi" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/chat\/perguntar$/);
    expect(init.headers).toEqual({ Authorization: "Bearer tok", "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ query: "x" }));
  });

  test("FormData vai sem Content-Type (boundary automático)", async () => {
    respond(201, { url: "u" });
    const form = new FormData();
    await api("/pdfs/upload", { method: "POST", body: form });
    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
    expect(fetchMock.mock.calls[0][1].body).toBe(form);
  });

  test("propaga a mensagem de erro do back-end (error | erro)", async () => {
    respond(400, { erro: "A pergunta é obrigatória." });
    await expect(api("/x")).rejects.toMatchObject({ message: "A pergunta é obrigatória.", status: 400 });
  });

  test("401 dispara logout", async () => {
    const out = jest.fn();
    setOnUnauthorized(out);
    respond(401, { error: "Token não fornecido." });
    await expect(api("/x")).rejects.toBeInstanceOf(ApiError);
    expect(out).toHaveBeenCalled();
  });

  test("falha de rede vira mensagem amigável", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(api("/x")).rejects.toMatchObject({ status: 0, message: "Não foi possível conectar ao servidor." });
  });
});
