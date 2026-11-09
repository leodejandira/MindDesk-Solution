import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Badge, Bars, Button, Card, Empty, Icon, Loading, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { mapPessoaPA, type Cor, type Pessoa } from "@/lib/logic";
import { TONES, useTheme, type ToneName } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

const COR: Record<Cor, ToneName> = { verde: "green", amarelo: "yellow", vermelho: "red", cinza: "gray" };
const HUMOR = {
  feliz: { icon: "happy-outline", tone: "green" },
  neutro: { icon: "remove-circle-outline", tone: "yellow" },
  triste: { icon: "sad-outline", tone: "red" },
} as const;

const METRICAS = [
  ["turnover", "Risco de Turnover"],
  ["burnout", "Risco de Burnout"],
  ["promocao", "Elegibilidade Promoção"],
  ["engajamento", "Engajamento"],
] as const;

export default function Humanograma() {
  const [aberto, setAberto] = useState<Pessoa | null>(null);
  const pessoas = useLoad(async () => ((await api<any[]>("/relatorios/relatorios-pa")) || []).map(mapPessoaPA));

  return (
    <Screen title="Humanograma" refreshing={pessoas.loading} onRefresh={pessoas.reload}>
      <T muted>Monitore a saúde organizacional da sua equipe. Toque em um colaborador para ver a análise detalhada e o resumo gerado pela IA.</T>
      {pessoas.loading && !pessoas.data ? (
        <Loading />
      ) : pessoas.error ? (
        <Card><Empty text={pessoas.error} /></Card>
      ) : !pessoas.data?.length ? (
        <Card><Empty text="Nenhum dado de análise encontrado para a sua equipe." /></Card>
      ) : (
        pessoas.data.map((p) => (
          <Pressable key={p.id} onPress={() => setAberto(p)}>
            <Card>
              <Row>
                <Avatar name={p.nome} />
                <View style={{ flex: 1 }}>
                  <T bold lines={1}>{p.nome}</T>
                  <T muted size={12} lines={1}>{p.cargo} · Ref: {p.mes_referencia}</T>
                </View>
                <Icon name={HUMOR[p.humor].icon} size={22} color={TONES[HUMOR[p.humor].tone].fg} />
              </Row>
              <Row style={{ flexWrap: "wrap", gap: 6 }}>
                <Badge label={`Turnover ${p.turnover}%`} tone={COR[p.cores.turnover]} />
                <Badge label={`Burnout ${p.burnout}%`} tone={COR[p.cores.burnout]} />
                <Badge label={`Engaj. ${p.engajamento}%`} tone={COR[p.cores.engajamento]} />
                <Badge label={`Promoção ${p.promocao}%`} tone={COR[p.cores.promocao]} />
              </Row>
            </Card>
          </Pressable>
        ))
      )}
      <Detalhe p={aberto} onClose={() => setAberto(null)} />
    </Screen>
  );
}

function Detalhe({ p, onClose }: { p: Pessoa | null; onClose: () => void }) {
  const { c } = useTheme();
  if (!p) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Row>
            <Avatar name={p.nome} size={52} />
            <View style={{ flex: 1 }}>
              <T bold size={18}>{p.nome}</T>
              <T muted>{p.cargo}</T>
            </View>
          </Row>
          <Card>
            <Bars
              items={METRICAS.map(([k, label]) => ({
                label,
                value: p[k],
                display: `${p[k]}%`,
                color: TONES[COR[p.cores[k]]].fg,
              }))}
            />
          </Card>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <T muted bold size={11}>HUMOR & SENTIMENTO</T>
              <T bold>{p.score_humor}%</T>
            </Row>
            <Badge label={p.sentimento} tone={HUMOR[p.humor].tone} />
          </Card>
          <Card>
            <T muted bold size={11}>AFASTAMENTO</T>
            <T muted>Sem afastamento ativo</T>
          </Card>
          <Card style={{ backgroundColor: TONES.violet.bg, borderColor: TONES.violet.bg }}>
            <Row style={{ gap: 6 }}>
              <Icon name="sparkles-outline" size={16} color={TONES.violet.fg} />
              <T bold size={12} color={TONES.violet.fg}>RESUMO DA IA</T>
            </Row>
            <T size={14} color="#334155">{p.resumoIA}</T>
          </Card>
          <Button title="Fechar" variant="outline" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
