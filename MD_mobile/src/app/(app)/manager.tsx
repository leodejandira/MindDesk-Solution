import { useRouter, type Href } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { Badge, Button, Card, Empty, Hero, Icon, Loading, Row, Screen, T, type IconName } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/jwt";
import { PRIORIDADE_LABEL, avisosFromAtestados, formatDateBR, type Aviso } from "@/lib/logic";
import { useTheme, type ToneName } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

type Item = { icon: IconName; title: string; desc: string; to: Href; admin?: boolean; hideForAdmin?: boolean };

const MENU: Item[] = [
  { icon: "chatbubble-ellipses-outline", title: "Chat RH", desc: "Converse com o assistente virtual", to: "/chat" },
  { icon: "camera-outline", title: "Registrar Ponto", desc: "Selfie com localização", to: "/ponto" },
  // "Bater Ponto" (QR Code) oculto: o ponto agora é só por selfie. A rota /qrcode continua existindo.
  { icon: "shield-checkmark-outline", title: "Revisão de Ponto", desc: "Selfies e locais de trabalho", to: "/revisao-ponto", admin: true },
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
      <Row style={{ justifyContent: "space-between", paddingVertical: 4 }}>
        <Row style={{ gap: 8 }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
            <Icon name="sparkles" size={17} color={c.primaryText} />
          </View>
          <T size={21} bold style={{ letterSpacing: -0.5 }}>Mind<T size={21} bold color={c.primary}>Desk</T></T>
        </Row>
        <Button title="Sair" icon="log-out-outline" variant="outline" small onPress={signOut} />
      </Row>

      <Hero>
        <Row style={{ alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Row style={{ gap: 6 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" }} />
              <T size={12} color="#CBD5E1">Bem-vindo de volta</T>
            </Row>
            <T size={26} bold color="#FFF" style={{ textTransform: "capitalize", letterSpacing: -0.6 }}>{displayName(user)}</T>
            {isAdmin && <Badge label="GERENTE" tone="yellow" />}
          </View>
          <Image source={require("../../../assets/illus/home.png")} style={{ width: 96, height: 96, marginTop: -6, marginRight: -6 }} resizeMode="contain" />
        </Row>
        <T color="#CBD5E1" size={14} style={{ lineHeight: 21 }}>
          {isAdmin
            ? "Gerencie sua equipe, acompanhe relatórios e acesse recursos do RH de forma rápida."
            : "Acompanhe seus treinamentos, avisos e recursos disponíveis no sistema."}
        </T>
      </Hero>

      <T muted semibold size={12} style={{ letterSpacing: 1, marginTop: 6 }}>MENU PRINCIPAL</T>
      {items.map((m) => (
        <Pressable key={m.title} onPress={() => router.push(m.to)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
          <Card style={{ paddingVertical: 16 }}>
            <Row style={{ gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Icon name={m.icon} size={23} color={c.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T semibold size={15}>{m.title}</T>
                <T muted size={12}>{m.desc}</T>
              </View>
              <Icon name="chevron-forward" size={18} color={c.muted} />
            </Row>
          </Card>
        </Pressable>
      ))}

      <T muted semibold size={12} style={{ letterSpacing: 1, marginTop: 10 }}>{isAdmin ? "MURAL DE AVISOS" : "MEUS AVISOS"}</T>
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
  const { tones } = useTheme();
  const tipo = a.tipo === "férias" ? "Férias" : a.tipo === "afastamento" ? "Afastamento" : a.tipo;
  return (
    <Card style={{ backgroundColor: tones[tone].bg, borderColor: tones[tone].bg }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Badge label={`${tipo} • ${PRIORIDADE_LABEL[a.prioridade] ?? "Informativo"}`.toUpperCase()} tone={tone} />
        {(a.dias_restantes ?? 0) > 0 && <T size={12} color={tones[tone].fg}>{a.dias_restantes} dia(s)</T>}
      </Row>
      <T size={14} color={tones[tone].fg}>{a.mensagem}</T>
      {isAdmin && (a.nome || a.cargo) && <T size={12} color={tones[tone].fg}>{[a.nome, a.cargo].filter(Boolean).join(" • ")}</T>}
      {!isAdmin && a.tipo === "férias" && a.data_vencimento && (
        <T size={12} color={tones[tone].fg}>Vencimento: {formatDateBR(a.data_vencimento)}</T>
      )}
    </Card>
  );
}
