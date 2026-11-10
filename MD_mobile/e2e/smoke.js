// Smoke test E2E: build web do app + mock da API, em viewport de celular.
// Uso: veja MD_mobile/README.md (seção "Testes").
require("./mock-api");
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "dist-web");
const SHOTS = path.join(__dirname, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".png": "image/png", ".ttf": "font/ttf", ".json": "application/json" };
http
  .createServer((req, res) => {
    let f = path.join(DIR, decodeURIComponent(req.url.split("?")[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIR, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
    fs.createReadStream(f).pipe(res);
  })
  .listen(5050);

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(["OK  ", name]);
  } catch (e) {
    results.push(["FAIL", name + " → " + e.message.split("\n")[0]]);
  }
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const see = (t, opts) => page.getByText(t, opts).filter({ visible: true }).first().waitFor({ timeout: 8000 });
  const tap = (t, opts) => page.getByText(t, { exact: true, ...opts }).filter({ visible: true }).first().click({ timeout: 8000 });
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + ".png"), fullPage: false });
  const back = () => page.goBack();

  const login = async (email) => {
    await page.goto("http://localhost:5050/");
    await page.getByPlaceholder("seu@email.com").fill(email);
    await page.getByPlaceholder("••••••••").fill("123456");
    await tap("Entrar");
  };

  // ---------------- FUNCIONÁRIO ----------------
  await check("login inválido mostra erro", async () => {
    await page.goto("http://localhost:5050/");
    await see("Bem-vindo de volta");
    await page.getByPlaceholder("seu@email.com").fill("ana@md.com");
    await page.getByPlaceholder("••••••••").fill("errada");
    await tap("Entrar");
    await see("Invalid login credentials");
    await shot("01-login-erro");
  });
  await check("funcionário: home com menu e avisos", async () => {
    await login("ana@md.com");
    await see("MEUS AVISOS");
    await see("Você já pode agendar suas férias.");
    if (await page.getByText("Relatórios", { exact: true }).count()) throw new Error("menu admin visível");
    await shot("02-home-funcionario");
  });
  await check("funcionário: rota de gerente bloqueada", async () => {
    await page.goto("http://localhost:5050/relatorios");
    await see("MEUS AVISOS");
  });
  await check("chat: pergunta e resposta formatada", async () => {
    await tap("Chat RH");
    await page.getByPlaceholder("Escreva algo ou anexe um atestado...").fill("Quantos dias de férias tenho?");
    await page.getByLabel("Enviar").click();
    await see("Resposta do RH");
    await shot("03-chat");
    await back();
  });
  await check("QR code de ponto renderiza", async () => {
    await tap("Bater Ponto");
    await page.locator("svg rect, svg path").first().waitFor({ timeout: 8000 });
    await see("Código seguro (renovado automaticamente)");
    await shot("04-qrcode");
    await back();
  });
  await check("meus cursos: concluir", async () => {
    await tap("Meus Cursos");
    await see("LGPD Básico");
    await see("Limite: 01/12/2026");
    await tap("Marcar como concluído");
    await see("Parabéns! Curso marcado como concluído.");
    await see("CONCLUÍDO");
    await shot("05-cursos");
    await back();
  });
  await check("configurações: senha + tema", async () => {
    await tap("Configurações");
    await page.getByPlaceholder("Senha atual").fill("123456");
    await page.getByPlaceholder("Nova senha").fill("abcdef");
    await page.getByPlaceholder("Confirmar senha").fill("abcdef");
    await tap("Salvar nova senha");
    await see("Senha alterada com sucesso!");
    await page.getByRole("switch").nth(2).click();
    await shot("06-config-escuro");
    await page.getByRole("switch").nth(2).click();
    await tap("Sair da conta");
    await see("Bem-vindo de volta");
  });

  // ---------------- GERENTE ----------------
  await check("gerente: mural com atestado pendente", async () => {
    await login("admin@md.com");
    await see("MURAL DE AVISOS");
    await see("Ana Lima enviou um atestado pendente");
    await see("GERENTE");
    await shot("07-home-gerente");
  });
  await check("relatórios: faltas, atrasos, horas, férias", async () => {
    await tap("Relatórios");
    await tap("Faltas");
    await see("Total de faltas");
    await see("6 dia(s)");
    await shot("08-rel-faltas");
    await page.getByLabel("Fechar").click();
    await tap("Atrasos");
    await tap("Ana Lima");
    await see("Ana Lima - Evolução de atrasos");
    await page.getByLabel("Fechar").click();
    await tap("Banco de horas");
    await see("-1h01m");
    await see("+2h05m");
    await shot("09-rel-horas");
    await page.getByLabel("Fechar").click();
    await tap("Férias");
    await see("CRÍTICA");
    await page.getByLabel("Fechar").click();
  });
  await check("relatórios: aprovar afastamento", async () => {
    await tap("Afastamentos");
    await see("Pendentes (1)");
    await tap("Aprovar");
    await see("Pendentes (0)");
    await see("Aceitos (2)");
    await shot("10-rel-afastamentos");
    await page.getByLabel("Fechar").click();
    await back();
  });
  await check("funcionários: criar, editar, excluir", async () => {
    await tap("Funcionários");
    await see("Bruno Reis");
    await tap("Novo funcionário");
    await page.getByPlaceholder("Nome completo").fill("Diego Souza");
    await page.getByPlaceholder("E-mail", { exact: true }).fill("diego@md.com");
    await page.getByPlaceholder("Cargo", { exact: true }).fill("Suporte");
    await page.getByPlaceholder("Senha", { exact: true }).fill("123");
    await page.getByPlaceholder("Confirmar senha").fill("123");
    await tap("Salvar");
    await see("A senha deve possuir no mínimo 6 caracteres.");
    await page.getByPlaceholder("Senha", { exact: true }).fill("123456");
    await page.getByPlaceholder("Confirmar senha").fill("123456");
    await tap("Salvar");
    await see("Funcionário criado com sucesso.");
    await see("Diego Souza");
    await page.getByPlaceholder("Buscar por nome, e-mail ou cargo...").fill("suporte");
    await see("1 resultado(s) encontrado(s)");
    await tap("Editar");
    await page.getByPlaceholder("Cargo", { exact: true }).fill("Suporte N2");
    await tap("Salvar");
    await see("Funcionário atualizado com sucesso.");
    await see("Suporte N2");
    await shot("11-funcionarios");
    await tap("Excluir");
    await see("Nenhum funcionário encontrado.");
    await back();
  });
  await check("documentos: excluir PDF; cursos: criar e conceder acesso", async () => {
    await tap("Documentos & Cursos");
    await see("Politica_Ferias.pdf");
    await tap("Excluir");
    await see("Documento removido com sucesso.");
    await tap("Cursos");
    await see("Bruno Reis");
    await page.getByPlaceholder("Nome do curso").fill("NR-10");
    await page.getByPlaceholder("Ex: 30").fill("15");
    await page.getByPlaceholder("URL do curso").fill("https://ex.com/nr10");
    await tap("Salvar curso");
    await see("Curso adicionado.");
    await see("Prazo: 15 dias corridos");
    await page.getByText("Gerenciar acessos", { exact: true }).filter({ visible: true }).last().click();
    await page.getByText("Ana Lima").filter({ visible: true }).last().click();
    await tap("Conceder acesso (1)");
    await see("Curso compartilhado.");
    await shot("12-documentos-cursos");
    await back();
  });
  await check("humanograma: lista e detalhe", async () => {
    await tap("Humanograma");
    await see("Burnout 71%");
    await tap("Ana Lima");
    await see("RESUMO DA IA");
    await see("Sinais de sobrecarga");
    await shot("13-humanograma");
    await tap("Fechar");
  });

  const log = await (await fetch("http://localhost:4000/__log")).json();
  const unauth = log.filter((l) => !l.authed && l.key !== "POST /auth/login");
  results.push([unauth.length ? "FAIL" : "OK  ", `todas as chamadas autenticadas com Bearer (${log.length} requisições)`]);
  results.push([errors.length ? "FAIL" : "OK  ", `sem erros de JS na página ${errors.join(" | ")}`]);
  console.log(results.map((r) => r.join(" ")).join("\n"));
  await browser.close();
  process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
})();
