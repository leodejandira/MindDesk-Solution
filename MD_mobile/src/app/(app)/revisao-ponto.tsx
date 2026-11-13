import { useState } from "react";
import { Image, Linking, Pressable, View } from "react-native";
import { Avatar, Badge, Button, Card, Empty, H, Icon, Input, Loading, Notice, Row, Screen, Segmented, T, confirm } from "@/components/ui";
import { api } from "@/lib/api";
import { posicaoAtual } from "@/lib/location";
import { STATUS_PONTO, TIPO_PONTO_LABEL, formatDataHora, formatDistancia, mapsUrl } from "@/lib/logic";
import { useTheme } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

type Status = "pendente_revisao" | "aprovado" | "rejeitado";
type PontoRevisao = {
  id: number;
  horario: string;
  tipo: string;
  observacao: string | null;
  latitude: number | null;
  longitude: number | null;
  distancia_metros: number | null;
  status_validacao: Status;
  foto: string | null;
  usuarios: { nome: string; cargo: string } | null;
  locais_trabalho: { nome: string } | null;
};
type Local = { id: number; nome: string; latitude: number; longitude: number; raio_metros: number };

export default function RevisaoPonto() {
  const [aba, setAba] = useState<"pontos" | "locais">("pontos");
  return (
    <Screen title="Revisão de Ponto">
      <Segmented
        options={[
          { key: "pontos", label: "Pontos com selfie" },
          { key: "locais", label: "Locais de trabalho" },
        ]}
        value={aba}
        onChange={setAba}
      />
      {aba === "pontos" ? <Pontos /> : <Locais />}
    </Screen>
  );
}

function Pontos() {
  const [status, setStatus] = useState<Status>("pendente_revisao");
  const [erro, setErro] = useState("");
  const lista = useLoad(() => api<PontoRevisao[]>(`/pontos/revisao?status=${status}`), [status]);

  const validar = async (p: PontoRevisao, novo: "aprovado" | "rejeitado") => {
    setErro("");
    try {
      await api(`/pontos/${p.id}/validacao`, { method: "PATCH", body: { status: novo } });
      lista.setData((prev) => (prev ?? []).filter((x) => x.id !== p.id));
    } catch (e: any) {
      setErro(e.message);
    }
  };

  return (
    <>
      <Segmented
        options={[
          { key: "pendente_revisao", label: "Em revisão" },
          { key: "aprovado", label: "Aprovados" },
          { key: "rejeitado", label: "Rejeitados" },
        ]}
        value={status}
        onChange={setStatus}
      />
      <Notice msg={erro || lista.error} />
      {lista.loading && !lista.data ? (
        <Loading />
      ) : !lista.data?.length ? (
        <Card><Empty text="Nenhum ponto nesta categoria." /></Card>
      ) : (
        lista.data.map((p) => <PontoCard key={p.id} p={p} onValidar={validar} />)
      )}
    </>
  );
}

function PontoCard({ p, onValidar }: { p: PontoRevisao; onValidar: (p: PontoRevisao, s: "aprovado" | "rejeitado") => void }) {
  const { c } = useTheme();
  const st = STATUS_PONTO[p.status_validacao];
  return (
    <Card>
      <Row style={{ alignItems: "flex-start" }}>
        {p.foto ? (
          <Pressable onPress={() => Linking.openURL(p.foto!)} accessibilityLabel="Ampliar selfie">
            <Image source={{ uri: p.foto }} style={{ width: 88, height: 88, borderRadius: 16, backgroundColor: c.border }} />
          </Pressable>
        ) : (
          <Avatar name={p.usuarios?.nome} size={88} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <T bold lines={1}>{p.usuarios?.nome || "—"}</T>
          <T muted size={12}>{p.usuarios?.cargo || "Funcionário"}</T>
          <T size={13}>{TIPO_PONTO_LABEL[p.tipo] ?? p.tipo}</T>
          <T muted size={12}>{formatDataHora(p.horario)}</T>
          <T muted size={12}>
            {p.locais_trabalho?.nome ? `${p.locais_trabalho.nome} · ` : ""}
            {formatDistancia(p.distancia_metros)}
          </T>
        </View>
        {st && <Badge label={st.label.toUpperCase()} tone={st.tone} />}
      </Row>
      {!!p.observacao && <Notice type="info" msg={p.observacao} />}
      <Row>
        {p.latitude != null && p.longitude != null && (
          <Button small style={{ flex: 1 }} variant="outline" icon="map-outline" title="Mapa" onPress={() => Linking.openURL(mapsUrl(p.latitude!, p.longitude!))} />
        )}
        {p.status_validacao !== "aprovado" && (
          <Button small style={{ flex: 1 }} variant="success" title="Aprovar" onPress={() => onValidar(p, "aprovado")} />
        )}
        {p.status_validacao !== "rejeitado" && (
          <Button small style={{ flex: 1 }} variant="danger" title="Rejeitar" onPress={() => onValidar(p, "rejeitado")} />
        )}
      </Row>
    </Card>
  );
}

function Locais() {
  const { c } = useTheme();
  const [nome, setNome] = useState("");
  const [raio, setRaio] = useState("150");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "error" });
  const locais = useLoad(() => api<Local[]>("/pontos/locais"));

  const cadastrar = async () => {
    if (!nome.trim()) return setAviso({ msg: "Informe o nome do local.", type: "error" });
    setSalvando(true);
    setAviso({ msg: "", type: "error" });
    try {
      const pos = await posicaoAtual();
      await api("/pontos/locais", {
        method: "POST",
        body: { nome: nome.trim(), latitude: pos.latitude, longitude: pos.longitude, raio_metros: Number(raio) || 150 },
      });
      setNome("");
      setAviso({ msg: "Local cadastrado com a sua posição atual.", type: "success" });
      locais.reload();
    } catch (e: any) {
      setAviso({ msg: e.message, type: "error" });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (l: Local) => {
    if (!(await confirm(`Remover o local "${l.nome}"?`))) return;
    try {
      await api(`/pontos/locais/${l.id}`, { method: "DELETE" });
      locais.reload();
    } catch (e: any) {
      setAviso({ msg: e.message, type: "error" });
    }
  };

  return (
    <>
      <Card>
        <H>Novo local</H>
        <T muted size={13}>Vá até o local de trabalho e cadastre usando a localização deste celular.</T>
        <Notice msg={aviso.msg} type={aviso.type} />
        <Input placeholder="Nome (ex: Sede Paulista)" value={nome} onChangeText={setNome} />
        <Input label="Raio permitido (metros)" keyboardType="number-pad" value={raio} onChangeText={(v) => setRaio(v.replace(/\D/g, ""))} />
        <Button title="Cadastrar com minha localização" icon="locate-outline" onPress={cadastrar} loading={salvando} />
      </Card>

      {locais.loading && !locais.data ? (
        <Loading />
      ) : !locais.data?.length ? (
        <Card><Empty text="Nenhum local cadastrado. Sem local, todo ponto vai para revisão." /></Card>
      ) : (
        locais.data.map((l) => (
          <Card key={l.id}>
            <Row>
              <Icon name="location-outline" size={22} color={c.primary} />
              <View style={{ flex: 1 }}>
                <T bold>{l.nome}</T>
                <T muted size={12}>Raio de {l.raio_metros} m</T>
              </View>
              <Pressable hitSlop={10} onPress={() => Linking.openURL(mapsUrl(l.latitude, l.longitude))} accessibilityLabel="Ver no mapa">
                <Icon name="map-outline" size={20} color={c.primary} />
              </Pressable>
              <Pressable hitSlop={10} onPress={() => remover(l)} accessibilityLabel="Remover local">
                <Icon name="trash-outline" size={20} color="#DC2626" />
              </Pressable>
            </Row>
          </Card>
        ))
      )}
    </>
  );
}
