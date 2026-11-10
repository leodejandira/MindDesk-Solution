import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { Badge, Button, Card, Empty, Icon, Loading, Row, Screen, T, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/jwt";
import { PRIORIDADE_LABEL, avisosFromAtestados, formatDateBR, type Aviso } from "@/lib/logic";
import { TONES, useTheme, type ToneName } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

type Item = { icon: IconName; title: string; desc: string; to: Href; admin?: boolean; hideForAdmin?: boolean };

const MENU: Item[] = [
  { icon: "chatbubble-ellipses-outline", title: "Chat RH", desc: "Converse com o assistente virtual", to: "/chat" },
  { icon: "qr-code-outline", title: "Bater Ponto", desc: "QR Code para o leitor", to: "/qrcode" },
  { icon: "bar-chart-outline", title: "Relatórios", desc: "Faltas, atrasos e desempenho", to: "/relatorios", admin: true },
  { icon: "pulse-outline", title: "Humanograma", desc: "Indicadores e análise de pessoas", to: "/humanograma", admin: true },
  { icon: "people-outline", title: "Funcionários", desc: "Gerenciar colaboradores", to: "/funcionarios", admin: true },
  { icon: "school-outline", title: "Meus Cursos", desc: "Treinamentos e capacitações", to: "/cursos", hideForAdmin: true },
  { icon: "document-text-outline", title: "Documentos & Cursos", desc: "PDFs, links e treinamentos", to: "/documentos", admin: true },
  { icon: "settings-outline", title: "Configurações", desc: "Preferências da conta", to: "/configuracoes" },
];

const TONE: Record<string, ToneName> = { critica: "red", alta: "orange", media: "green", baixa: "blue" };

async function loadAvisos(admin: boolean): Promise<Aviso[]> {
  const base = await api<Aviso[]>(admin ? "/avisos" : "/avisos/meus").catch(() => []);
  const lista = Array.isArray(base) ? base : [];
  if (!admin) return lista;
  const pendentes = await api<any[]>("/atestados/pendentes").catch(() => []);
  return [...avisosFromAtestados(pendentes), ...lista];
}

export default function Manager() {
  const { user, isAdmin, signOut } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const avisos = useLoad(() => loadAvisos(isAdmin), [isAdmin]);
  const items = MENU.filter((m) => (m.admin ? isAdmin : m.hideForAdmin ? !isAdmin : true));

  return (
    <Screen refreshing={avisos.loading} onRefresh={avisos.reload}>
      <Row style={{ justifyContent: "space-between" }}>
        <T size={22} bold>Mind<T size={22} bold color={c.primary}>Desk</T></T>
        <Button title="Sair" variant="outline" small onPress={signOut} />
      </Row>

      <Card style={{ backgroundColor: c.hero, borderColor: c.hero }}>
        <T color="#CBD5E1">Bem-vindo de volta,</T>
        <T size={26} bold color="#FFF" style={{ textTransform: "capitalize" }}>{displayName(user)}</T>
        {isAdmin && <Badge label="GERENTE" tone="yellow" />}
        <T color="#CBD5E1" size={14}>
          {isAdmin
            ? "Gerencie sua equipe, acompanhe relatórios e acesse recursos do RH de forma rápida."
            : "Acompanhe seus treinamentos, avisos e recursos disponíveis no sistema."}
        </T>
      </Card>

      <T muted bold size={12}>MENU PRINCIPAL</T>
      {items.map((m) => (
        <Pressable key={m.title} onPress={() => router.push(m.to)}>
          <Card>
            <Row>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={m.icon} size={22} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <T bold>{m.title}</T>
                <T muted size={13}>{m.desc}</T>
              </View>
              <Icon name="chevron-forward" size={18} color={c.muted} />
            </Row>
          </Card>
        </Pressable>
      ))}

      <T muted bold size={12} style={{ marginTop: 8 }}>{isAdmin ? "MURAL DE AVISOS" : "MEUS AVISOS"}</T>
      {avisos.loading && !avisos.data ? (
        <Loading />
      ) : !avisos.data?.length ? (
        <Card><Empty text={isAdmin ? "Nenhum aviso disponível no momento." : "Você não possui avisos pendentes."} /></Card>
      ) : (
        avisos.data.map((a, i) => <AvisoCard key={i} a={a} isAdmin={isAdmin} />)
      )}
    </Screen>
  );
}

function AvisoCard({ a, isAdmin }: { a: Aviso; isAdmin: boolean }) {
  const tone = TONE[a.prioridade] ?? "gray";
  const tipo = a.tipo === "férias" ? "Férias" : a.tipo === "afastamento" ? "Afastamento" : a.tipo;
  return (
    <Card style={{ backgroundColor: TONES[tone].bg, borderColor: TONES[tone].bg }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Badge label={`${tipo} • ${PRIORIDADE_LABEL[a.prioridade] ?? "Informativo"}`.toUpperCase()} tone={tone} />
        {(a.dias_restantes ?? 0) > 0 && <T size={12} color={TONES[tone].fg}>{a.dias_restantes} dia(s)</T>}
      </Row>
      <T size={14} color={TONES[tone].fg}>{a.mensagem}</T>
      {isAdmin && (a.nome || a.cargo) && <T size={12} color={TONES[tone].fg}>{[a.nome, a.cargo].filter(Boolean).join(" • ")}</T>}
      {!isAdmin && a.tipo === "férias" && a.data_vencimento && (
        <T size={12} color={TONES[tone].fg}>Vencimento: {formatDateBR(a.data_vencimento)}</T>
      )}
    </Card>
  );
}
