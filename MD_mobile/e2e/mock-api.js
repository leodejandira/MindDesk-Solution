// Mock do back-end Node do MindDesk (mesmas rotas e formatos), para smoke test do app.
const http = require("http");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (p) => `${b64({ alg: "HS256" })}.${b64({ ...p, exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`;
const log = [];

let cursos = [
  { id: 1, titulo: "LGPD Básico", link: "https://ex.com/lgpd", descricao: "Proteção de dados", prazo_dias: 30, created_at: "2026-11-01T12:00:00Z", status: "pendente", usuario_id: "u2", usuarios: { nome: "Ana Lima", cargo: "Analista" } },
  { id: 2, titulo: "LGPD Básico", link: "https://ex.com/lgpd", descricao: "Proteção de dados", prazo_dias: 30, created_at: "2026-11-01T12:00:00Z", status: "concluido", usuario_id: "u3", usuarios: { nome: "Bruno Reis", cargo: "Dev" } },
];
let pdfs = [{ id: 10, filename: "Politica_Ferias.pdf", url: "https://ex.com/f.pdf", created_at: "2026-10-20T10:00:00Z" }];
let usuarios = [
  { id: "u1", nome: "Carla Gerente", email: "admin@md.com", cargo: "Gerente RH", role: "admin" },
  { id: "u2", nome: "Ana Lima", email: "ana@md.com", cargo: "Analista", role: "viewer" },
  { id: "u3", nome: "Bruno Reis", email: "bruno@md.com", cargo: "Dev", role: "viewer" },
];
let atestados = [
  { id: 7, usuario_id: "u2", data_emissao: "2026-11-05", dias_afastamento: 2, motivo_cid: "J11", status: "pendente", url_arquivo: "https://ex.com/a.jpg", usuarios: { nome: "Ana Lima", cargo: "Analista" } },
  { id: 8, usuario_id: "u3", data_emissao: "2026-10-12", dias_afastamento: 1, motivo_cid: "R51", status: "aprovado" },
];

const routes = {
  "POST /auth/login": (b) => {
    const u = usuarios.find((x) => x.email === b.email);
    if (!u || b.password !== "123456") return [401, { error: "Invalid login credentials" }];
    return [200, { token: jwt({ id: u.id, email: u.email, role: u.role, tenant_id: 1, nome: u.nome }) }];
  },
  "PUT /auth/senha": () => [200, { message: "Senha atualizada!" }],
  "GET /avisos": () => [200, [{ tipo: "férias", prioridade: "critica", nome: "Bruno Reis", cargo: "Dev", mensagem: "Férias de Bruno vencem em 10 dias.", dias_restantes: 10 }]],
  "GET /avisos/meus": () => [200, [{ tipo: "férias", prioridade: "media", mensagem: "Você já pode agendar suas férias.", data_vencimento: "2027-03-01" }]],
  "GET /atestados/pendentes": () => [200, atestados.filter((a) => a.status === "pendente")],
  "GET /atestados": () => [200, atestados.map(({ usuarios, ...a }) => a)],
  "POST /atestados/upload": () => [201, { message: "ok", url: "https://storage/atestados/123_foto.jpg" }],
  "POST /chat/perguntar": (b) => [200, { answer: `**Resposta do RH**\nVocê perguntou: *${b.query}*` }],
  "GET /pontos/ticket": () => [200, { ticket: jwt({ tipo: "ponto" }) }],
  "GET /cursos": () => [200, cursos.filter((c) => c.usuario_id === "u2")],
  "GET /cursos/todos": () => [200, cursos],
  "POST /cursos": (b) => {
    const ids = b.usuarios_ids.length ? b.usuarios_ids : [null];
    for (const uid of ids) {
      const u = usuarios.find((x) => x.id === uid);
      cursos.push({ id: Date.now() + Math.random(), titulo: b.titulo, link: b.link, descricao: b.descricao, prazo_dias: b.prazo_dias, created_at: new Date().toISOString(), status: "pendente", usuario_id: uid, usuarios: u ? { nome: u.nome, cargo: u.cargo } : null });
    }
    return [201, { message: "ok" }];
  },
  "GET /pdfs": () => [200, pdfs],
  "POST /pdfs/upload": () => {
    pdfs.push({ id: Date.now(), filename: "novo.pdf", url: "https://ex.com/novo.pdf", created_at: new Date().toISOString() });
    return [201, { url: "https://ex.com/novo.pdf" }];
  },
  "GET /usuarios": () => [200, usuarios],
  "POST /usuarios/register": (b) => {
    usuarios.push({ id: "u" + Date.now(), nome: b.nome, email: b.email, cargo: b.cargo, role: b.role });
    return [201, { message: "ok" }];
  },
  "PUT /usuarios": (b, q) => {
    const u = usuarios.find((x) => x.email === q.get("email"));
    Object.assign(u, { nome: b.nome, cargo: b.cargo }, b.novoEmail ? { email: b.novoEmail } : {});
    return [200, u];
  },
  "DELETE /usuarios": (b, q) => {
    usuarios = usuarios.filter((x) => x.email !== q.get("email"));
    return [200, { message: "ok" }];
  },
  "GET /relatorios/faltas": () => [200, [{ nome: "Ana Lima", cargo: "Analista", total_faltas: 3 }, { nome: "Bruno Reis", cargo: "Dev", total_faltas: 6 }]],
  "GET /relatorios/atrasos": () => [200, [{ usuario_id: "u2", nome: "Ana Lima", cargo: "Analista", total_atraso_acumulado_mes: 45, atrasos: [{ data: "2026-11-03", minutos_atraso: 15 }, { data: "2026-11-04", minutos_atraso: 30 }] }]],
  "GET /relatorios/banco-horas": () => [200, [{ usuario_id: "u2", nome: "Ana Lima", cargo: "Analista", saldo_minutos: 125 }, { usuario_id: "u3", nome: "Bruno Reis", cargo: "Dev", saldo_minutos: -61 }]],
  "GET /relatorios/ferias": () => [200, [{ nome: "Bruno Reis", cargo: "Dev", prioridade: "critica", data_ultima_ferias: "2025-01-10", data_vencimento_ferias: "2026-11-19", ferias_pendentes: 2, aviso: "Férias vencem em 10 dias." }]],
  "GET /relatorios/relatorios-pa": () => [200, [{ id: "u2", nome: "Ana Lima", cargo: "Analista", mes_referencia: "2026-10", score_turnover: 22, score_burnout: 71, score_engajamento: 80, score_elegibilidade_promocao: 55, score_humor: 35, sentimento_predominante: "Ansiedade", analise_pa: "Sinais de sobrecarga nas últimas semanas.", cores: { turnover: "verde", burnout: "vermelho", engajamento: "verde", promocao: "amarelo" } }]],
};

const dyn = [
  [/^PATCH \/atestados\/(\d+)\/status$/, (b, m) => { atestados.find((a) => a.id == m[1]).status = b.status; return [200, { message: "ok" }]; }],
  [/^POST \/cursos\/([\d.]+)\/concluir$/, (b, m) => { cursos.find((c) => c.id == m[1]).status = "concluido"; return [200, { message: "ok" }]; }],
  [/^DELETE \/cursos\/([\d.]+)\/usuarios\/(\w+)$/, (b, m) => { cursos = cursos.filter((c) => c.usuario_id !== m[2]); return [200, {}]; }],
  [/^DELETE \/cursos\/([\d.]+)$/, (b, m) => { const t = cursos.find((c) => c.id == m[1]); cursos = cursos.filter((c) => c.link !== t.link); return [200, {}]; }],
  [/^DELETE \/pdfs\/(\d+)$/, (b, m) => { pdfs = pdfs.filter((p) => p.id != m[1]); return [200, {}]; }],
];

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    if (req.method === "OPTIONS") return res.end();
    const url = new URL(req.url, "http://x");
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (url.pathname === "/__log") return res.end(JSON.stringify(log));
      const key = `${req.method} ${url.pathname}`;
      const isJson = (req.headers["content-type"] || "").includes("json");
      const body = isJson && raw ? JSON.parse(raw) : {};
      const authed = (req.headers.authorization || "").startsWith("Bearer ");
      log.push({ key, query: url.search, body: isJson ? body : (req.headers["content-type"] || "").split(";")[0], authed });
      let out;
      if (key !== "POST /auth/login" && !authed) out = [401, { error: "Token não fornecido." }];
      else if (routes[key]) out = routes[key](body, url.searchParams);
      else for (const [re, fn] of dyn) { const m = key.match(re); if (m) { out = fn(body, m); break; } }
      out ??= [404, { error: "rota inexistente" }];
      res.writeHead(out[0], { "Content-Type": "application/json" });
      res.end(JSON.stringify(out[1]));
    });
  })
  .listen(4000, () => console.log("mock api :4000"));
