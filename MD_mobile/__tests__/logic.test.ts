import {
  avisosFromAtestados,
  formatDateBR,
  formatSaldo,
  groupCursos,
  mapPessoaPA,
  matches,
  mergeAfastamentos,
  parseInline,
  prazoLimite,
  saldoPorFuncionario,
  situacaoFerias,
  validarFuncionario,
  weekdaysBetween,
} from "@/lib/logic";

test("formatDateBR", () => {
  expect(formatDateBR("2026-11-09")).toBe("09/11/2026");
  expect(formatDateBR("2026-11-09T15:00:00Z")).toBe("09/11/2026");
  expect(formatDateBR(null)).toBe("-");
});

test("weekdaysBetween ignora fim de semana", () => {
  // 2026-11-06 sexta → 2026-11-09 segunda
  expect(weekdaysBetween("2026-11-06", "2026-11-09")).toEqual(["2026-11-06", "2026-11-09"]);
});

test("formatSaldo", () => {
  expect(formatSaldo(125)).toBe("+2h05m");
  expect(formatSaldo(-61)).toBe("-1h01m");
  expect(formatSaldo(0)).toBe("+0h00m");
});

test("parseInline: negrito e itálico do chat", () => {
  expect(parseInline("Olá **Ana**, veja *isto*.")).toEqual([
    { text: "Olá " },
    { text: "Ana", bold: true },
    { text: ", veja " },
    { text: "isto", italic: true },
    { text: "." },
  ]);
});

test("avisosFromAtestados monta a mensagem do mural", () => {
  const [a] = avisosFromAtestados([{ usuarios: { nome: "Lucas", cargo: "Dev" }, motivo_cid: "J11", dias_afastamento: 2 }]);
  expect(a).toMatchObject({ tipo: "afastamento", prioridade: "alta", nome: "Lucas", cargo: "Dev" });
  expect(a.mensagem).toContain("Afastamento de 2 dia(s)");
  expect(avisosFromAtestados(null as any)).toEqual([]);
});

test("groupCursos agrupa por link e lista atribuídos", () => {
  const rows = [
    { id: 1, titulo: "LGPD", link: "http://x", prazo_dias: 30, status: "pendente", usuario_id: "u1", usuarios: { nome: "Ana" } },
    { id: 2, titulo: "LGPD", link: "http://x", prazo_dias: 30, status: "concluido", usuario_id: "u2", usuarios: { nome: "Bia", cargo: "RH" } },
    { id: 3, titulo: "NR10", link: "http://y", status: "concluido" },
  ];
  const [lgpd, nr10] = groupCursos(rows);
  expect(lgpd.id).toBe(1);
  expect(lgpd.usuarios_atribuidos.map((u) => [u.nome, u.cargo, u.concluido])).toEqual([
    ["Ana", "Não informado", false],
    ["Bia", "RH", true],
  ]);
  expect(nr10.concluido).toBe(true);
  expect(nr10.usuarios_atribuidos).toEqual([]);
});

test("prazoLimite segue a regra do back-end (created_at + dias)", () => {
  expect(prazoLimite("2026-11-01T12:00:00Z", 30)).toBe("2026-12-01");
  expect(prazoLimite("2026-11-01T12:00:00Z", null)).toBeNull();
  expect(prazoLimite(undefined, 10)).toBeNull();
});

test("situacaoFerias normaliza acentos e sinônimos", () => {
  expect(situacaoFerias({ prioridade: "crítica" }).label).toBe("Crítica");
  expect(situacaoFerias({ situacao: "Disponível em breve" })).toEqual({ label: "Em breve", tom: "blue" });
  expect(situacaoFerias({}).label).toBe("Em dia");
});

test("saldoPorFuncionario soma e ordena", () => {
  const r = saldoPorFuncionario([
    { usuario_id: "a", nome: "A", saldo_minutos: 30 },
    { usuario_id: "a", nome: "A", saldo_minutos: 30 },
    { usuario_id: "b", nome: "B", saldo_minutos: -10 },
  ]);
  expect(r.map((f) => [f.nome, f.saldo])).toEqual([["B", -10], ["A", 60]]);
});

test("mergeAfastamentos completa nome pelo cadastro", () => {
  const [a] = mergeAfastamentos([{ id: 1, usuario_id: "u1" }], [{ id: "u1", nome: "Ana", cargo: "Dev" }]);
  expect(a.usuarios).toEqual({ nome: "Ana", cargo: "Dev" });
});

test("mapPessoaPA classifica humor e aplica defaults", () => {
  expect(mapPessoaPA({ id: "1", score_humor: 80 }).humor).toBe("feliz");
  expect(mapPessoaPA({ id: "1", score_humor: 39 }).humor).toBe("triste");
  const p = mapPessoaPA({ id: "1", score_humor: 50, score_burnout: 12, cores: { burnout: "vermelho" } });
  expect(p).toMatchObject({ humor: "neutro", burnout: 12, nome: "Colaborador" });
  expect(p.cores).toEqual({ turnover: "cinza", burnout: "vermelho", engajamento: "cinza", promocao: "cinza" });
});

test("validarFuncionario replica as regras da web", () => {
  const ok = { nome: "Ana Lima", email: "ana@x.com", cargo: "Dev", password: "123456", confirmar: "123456" };
  expect(validarFuncionario(ok, true)).toBeNull();
  expect(validarFuncionario({ ...ok, email: "ana" }, true)).toBe("Digite um e-mail válido.");
  expect(validarFuncionario({ ...ok, confirmar: "x" }, true)).toBe("As senhas não coincidem.");
  expect(validarFuncionario({ ...ok, password: "" }, false)).toBeNull(); // edição não pede senha
});

test("matches busca em vários campos, sem diferenciar caixa", () => {
  expect(matches("ANA", "ana lima", null)).toBe(true);
  expect(matches("dev", "x", "Desenvolvedor")).toBe(false);
  expect(matches("", "qualquer")).toBe(true);
});

describe("ponto com selfie", () => {
  const { formatDistancia, formatDataHora, mapsUrl, TIPO_PONTO_LABEL, STATUS_PONTO } = require("@/lib/logic");

  test("formatDistancia", () => {
    expect(formatDistancia(44.6)).toBe("45 m");
    expect(formatDistancia(2560)).toBe("2,6 km");
    expect(formatDistancia(null)).toBe("-");
  });

  test("formatDataHora usa o horário do aparelho", () => {
    const d = new Date(2026, 10, 10, 9, 5); // 10/11/2026 09:05 local
    expect(formatDataHora(d.toISOString())).toBe("10/11/2026 09:05");
    expect(formatDataHora("lixo")).toBe("-");
  });

  test("rótulos cobrem os 4 tipos e 3 status do back-end", () => {
    expect(Object.keys(TIPO_PONTO_LABEL)).toEqual(["entrada", "almoco", "retorno_almoco", "saida"]);
    expect(Object.keys(STATUS_PONTO)).toEqual(["aprovado", "pendente_revisao", "rejeitado"]);
  });

  test("mapsUrl", () => {
    expect(mapsUrl(-23.5, -46.6)).toBe("https://www.google.com/maps/search/?api=1&query=-23.5,-46.6");
  });
});
