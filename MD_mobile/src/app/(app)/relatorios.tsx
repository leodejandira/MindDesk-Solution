import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DateField } from "@/components/DateField";
import { Badge, Bars, Button, Card, Empty, Icon, Input, Loading, Row, Screen, Segmented, Stat, T, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { daysAgo, formatDateBR, formatSaldo, isoDate, matches, mergeAfastamentos, saldoPorFuncionario, situacaoFerias, weekdaysBetween } from "@/lib/logic";
import { useTheme } from "@/lib/theme";

type Tipo = "faltas" | "atrasos" | "horas" | "ferias" | "afastamentos";
const REPORTS: { id: Tipo; title: string; desc: string; icon: IconName }[] = [
  { id: "faltas", title: "Faltas", desc: "Ausências registradas no período", icon: "ban-outline" },
  { id: "atrasos", title: "Atrasos", desc: "Chegadas após o horário", icon: "time-outline" },
  { id: "horas", title: "Banco de horas", desc: "Saldo de horas dos funcionários", icon: "hourglass-outline" },
  { id: "ferias", title: "Férias", desc: "Férias pendentes e programadas", icon: "calendar-outline" },
  { id: "afastamentos", title: "Afastamentos", desc: "Atestados e licenças vigentes", icon: "medkit-outline" },
];
const ENDPOINT: Record<Exclude<Tipo, "afastamentos">, string> = { faltas: "faltas", atrasos: "atrasos", horas: "banco-horas", ferias: "ferias" };
const COM_PERIODO: Tipo[] = ["faltas", "atrasos"];

export default function Relatorios() {
  const { c } = useTheme();
  const [open, setOpen] = useState<Tipo | null>(null);
  return (
    <Screen title="Relatórios">
      <T muted>Visualize indicadores, métricas e informações importantes da equipe em tempo real.</T>
      {REPORTS.map((r) => (
        <Pressable key={r.id} onPress={() => setOpen(r.id)}>
          <Card>
            <Row>
              <Icon name={r.icon} size={24} color={c.primary} />
              <View style={{ flex: 1 }}>
                <T bold>{r.title}</T>
                <T muted size={13}>{r.desc}</T>
              </View>
              <Icon name="chevron-forward" size={18} color={c.muted} />
            </Row>
          </Card>
        </Pressable>
      ))}
      {open && <Relatorio tipo={open} onClose={() => setOpen(null)} />}
    </Screen>
  );
}

function Relatorio({ tipo, onClose }: { tipo: Tipo; onClose: () => void }) {
  const { user } = useAuth();
  const { c } = useTheme();
  const report = REPORTS.find((r) => r.id === tipo)!;
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(isoDate(new Date()));
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const t = user?.tenant_id;

  useEffect(() => {
    let vivo = true;
    (async () => {
      setLoading(true);
      setErro("");
      try {
        let rows: any[];
        if (tipo === "afastamentos") {
          const [todos, pendentes, usuarios] = await Promise.all([
            api<any[]>(`/atestados?tenant_id=${t}`).catch(() => []),
            api<any[]>("/atestados/pendentes").catch(() => []),
            api<any[]>(`/usuarios?tenant_id=${t}`).catch(() => []),
          ]);
          rows = mergeAfastamentos(todos, usuarios, pendentes);
        } else {
          let url = `/relatorios/${ENDPOINT[tipo]}?tenant_id=${t}`;
          if (COM_PERIODO.includes(tipo)) url += `&data_inicio=${from}&data_fim=${to}`;
          rows = await api<any[]>(url);
        }
        if (vivo) setDados(Array.isArray(rows) ? rows : []);
      } catch (e: any) {
        if (vivo) {
          setErro(e.message);
          setDados([]);
        }
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [tipo, from, to, t]);

  const atualizarStatus = async (id: number, status: string) => {
    try {
      await api(`/atestados/${id}/status`, { method: "PATCH", body: { status } });
      setDados((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    } catch (e: any) {
      setErro(e.message || "Erro ao atualizar status");
    }
  };

  const conteudo = () => {
    if (loading) return <Loading />;
    if (erro) return <Empty text={erro} />;
    if (!dados.length) return <Empty />;
    switch (tipo) {
      case "faltas": return <Faltas data={dados} from={from} to={to} />;
      case "atrasos": return <Atrasos data={dados} />;
      case "horas": return <Horas data={dados} />;
      case "ferias": return <Ferias data={dados} />;
      case "afastamentos": return <Afastamentos data={dados} onStatus={atualizarStatus} />;
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <Row style={{ padding: 16, borderBottomWidth: 1, borderColor: c.border }}>
          <View style={{ flex: 1 }}>
            <T bold size={18}>Relatório de {report.title}</T>
            <T muted size={13}>{report.desc}</T>
          </View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar"><Icon name="close" size={26} color={c.text} /></Pressable>
        </Row>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          {COM_PERIODO.includes(tipo) && (
            <Row style={{ alignItems: "flex-end" }}>
              <View style={{ flex: 1 }}><DateField label="Início" value={from} max={to} onChange={setFrom} /></View>
              <View style={{ flex: 1 }}><DateField label="Fim" value={to} min={from} max={isoDate(new Date())} onChange={setTo} /></View>
            </Row>
          )}
          {conteudo()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------- Faltas ----------
const corFalta = (n: number) => (n >= 5 ? "#EF4444" : n >= 3 ? "#F97316" : "#EAB308");

function Faltas({ data, from, to }: { data: any[]; from: string; to: string }) {
  const rows = data.map((i) => ({ nome: i.nome || "—", cargo: i.cargo, faltas: Number(i.total_faltas) || 0 })).sort((a, b) => b.faltas - a.faltas);
  return (
    <>
      <Row>
        <Stat label="Funcionários" value={rows.length} />
        <Stat label="Total de faltas" value={rows.reduce((s, i) => s + i.faltas, 0)} tone="red" />
        <Stat label="Dias úteis" value={weekdaysBetween(from, to).length} />
      </Row>
      <Badge label="Falta = dia útil com menos de 4 registros de ponto. Finais de semana ignorados." tone="blue" />
      <Card>
        <Bars items={rows.map((r) => ({ label: `${r.nome}${r.cargo ? ` · ${r.cargo}` : ""}`, value: r.faltas, color: corFalta(r.faltas), display: `${r.faltas} dia(s)` }))} />
      </Card>
    </>
  );
}

// ---------- Atrasos ----------
function Atrasos({ data }: { data: any[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const lista = data
    .map((i) => ({
      uid: i.usuario_id,
      nome: i.nome || "—",
      total: i.total_atraso_acumulado_mes || 0,
      registros: (i.atrasos || []).map((a: any) => ({ data: formatDateBR(a.data), minutos: a.minutos_atraso || 0 })),
    }))
    .sort((a, b) => b.total - a.total);
  const atual = lista.find((f) => f.uid === sel);

  return (
    <>
      <Row>
        <Stat label="Funcionários" value={lista.length} />
        <Stat label="Ocorrências" value={lista.reduce((s, f) => s + f.registros.length, 0)} tone="orange" />
        <Stat label="Total min." value={lista.reduce((s, f) => s + f.total, 0)} />
      </Row>
      {atual ? (
        <>
          <Button small variant="outline" icon="arrow-back" title="Voltar para lista" onPress={() => setSel(null)} />
          <Card>
            <T bold>{atual.nome} - Evolução de atrasos</T>
            {atual.registros.length ? (
              <Bars items={atual.registros.map((r: any) => ({ label: r.data, value: r.minutos, color: "#F97316", display: `${r.minutos} min` }))} />
            ) : (
              <Empty />
            )}
          </Card>
        </>
      ) : (
        lista.map((f) => (
          <Pressable key={f.uid} onPress={() => setSel(f.uid)}>
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <View>
                  <T bold>{f.nome}</T>
                  <T muted size={12}>{f.registros.length} ocorrências</T>
                </View>
                <T bold color="#F97316">{f.total} min</T>
              </Row>
            </Card>
          </Pressable>
        ))
      )}
    </>
  );
}

// ---------- Banco de horas ----------
function Horas({ data }: { data: any[] }) {
  const funcs = saldoPorFuncionario(data);
  return (
    <>
      <Row>
        <Stat label="Crédito" value={`${funcs.filter((f) => f.saldo >= 0).length} func.`} tone="green" />
        <Stat label="Débito" value={`${funcs.filter((f) => f.saldo < 0).length} func.`} tone="red" />
      </Row>
      <Card>
        <T muted bold size={11}>SALDO EM HORAS</T>
        <Bars items={funcs.map((f) => ({ label: `${f.nome} · ${f.cargo}`, value: f.saldo, color: f.saldo >= 0 ? "#16A34A" : "#DC2626", display: formatSaldo(f.saldo) }))} />
      </Card>
    </>
  );
}

// ---------- Férias ----------
function Ferias({ data }: { data: any[] }) {
  const cont = (label: string) => data.filter((i) => situacaoFerias(i).label === label).length;
  return (
    <>
      <Row>
        <Stat label="Funcionários" value={data.length} />
        <Stat label="Vencidas" value={cont("Crítica")} tone="red" />
      </Row>
      <Row>
        <Stat label="Atrasado" value={cont("Atrasado")} tone="orange" />
        <Stat label="Disponível" value={cont("Disponível")} tone="green" />
      </Row>
      {data.map((i, idx) => {
        const s = situacaoFerias(i);
        return (
          <Card key={idx}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <T bold>{i.nome || "-"}</T>
                <T muted size={12}>{i.cargo || "-"}</T>
              </View>
              <Badge label={s.label.toUpperCase()} tone={s.tom} />
            </Row>
            <Row>
              <View style={{ flex: 1 }}><T muted size={12}>Últimas férias</T><T>{formatDateBR(i.data_ultima_ferias)}</T></View>
              <View style={{ flex: 1 }}><T muted size={12}>Vencimento</T><T>{formatDateBR(i.data_vencimento_ferias)}</T></View>
            </Row>
            <T muted size={12}>Períodos pendentes: <T bold>{i.ferias_pendentes || 0}</T></T>
            {!!i.aviso && <Badge label={i.aviso} tone={s.tom} />}
          </Card>
        );
      })}
    </>
  );
}

// ---------- Afastamentos ----------
type Aba = "pendente" | "aprovado" | "recusado";
const TOM_STATUS = { pendente: "yellow", aprovado: "green", recusado: "red" } as const;

function Afastamentos({ data, onStatus }: { data: any[]; onStatus: (id: number, s: Aba) => void }) {
  const [aba, setAba] = useState<Aba>("pendente");
  const [busca, setBusca] = useState("");
  const n = (s: Aba) => data.filter((i) => i.status === s).length;
  const lista = data.filter((i) => i.status === aba && matches(busca, i.usuarios?.nome));

  return (
    <>
      <Segmented
        value={aba}
        onChange={setAba}
        options={[
          { key: "pendente", label: `Pendentes (${n("pendente")})` },
          { key: "aprovado", label: `Aceitos (${n("aprovado")})` },
          { key: "recusado", label: `Recusados (${n("recusado")})` },
        ]}
      />
      <Input placeholder="Buscar por nome do funcionário..." value={busca} onChangeText={setBusca} />
      {!lista.length ? (
        <Empty text={busca ? `Nenhum resultado para "${busca}"` : "Nenhum atestado nesta categoria."} />
      ) : (
        lista.map((i) => (
          <Card key={i.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <T bold>{i.usuarios?.nome || "—"}</T>
                <T muted size={12}>{i.usuarios?.cargo || "Funcionário"}</T>
              </View>
              <Badge label={(i.status || "pendente").toUpperCase()} tone={TOM_STATUS[i.status as Aba] ?? "yellow"} />
            </Row>
            <Row>
              <View style={{ flex: 1 }}><T muted size={12}>Motivo / CID</T><T>{i.motivo_cid || i.motivo || "Atestado"}</T></View>
              <View style={{ flex: 1 }}><T muted size={12}>Emissão</T><T>{formatDateBR(i.data_emissao)}</T></View>
              <View><T muted size={12}>Dias</T><T>{i.dias_afastamento ?? "-"}</T></View>
            </Row>
            {!!i.url_arquivo && <Button small variant="ghost" title="Ver atestado" icon="open-outline" onPress={() => Linking.openURL(i.url_arquivo)} />}
            {i.status === "pendente" && (
              <Row>
                <Button small style={{ flex: 1 }} variant="success" title="Aprovar" onPress={() => onStatus(i.id, "aprovado")} />
                <Button small style={{ flex: 1 }} variant="danger" title="Recusar" onPress={() => onStatus(i.id, "recusado")} />
              </Row>
            )}
          </Card>
        ))
      )}
    </>
  );
}
