import { useState } from "react";
import { Badge, Button, Card, Icon, Notice, Row, Screen, T } from "@/components/ui";
import { api, appendFile } from "@/lib/api";
import { posicaoAtual } from "@/lib/location";
import { STATUS_PONTO, TIPO_PONTO_LABEL, formatDataHora, formatDistancia } from "@/lib/logic";
import { pickPhoto } from "@/lib/pick";
import { useTheme } from "@/lib/theme";

type Resultado = {
  tipo: string;
  horario: string;
  status_validacao: string;
  distancia_metros: number | null;
  observacao: string | null;
  local: string | null;
};

export default function RegistrarPonto() {
  const { c } = useTheme();
  const [etapa, setEtapa] = useState("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const registrar = async () => {
    setErro("");
    setResultado(null);
    try {
      setEtapa("Obtendo sua localização...");
      const pos = await posicaoAtual();

      setEtapa("Abrindo a câmera...");
      const foto = await pickPhoto("camera", true);
      if (!foto) return; // cancelou a selfie

      setEtapa("Enviando...");
      const form = new FormData();
      appendFile(form, "foto", { ...foto, name: "selfie.jpg" });
      form.append("latitude", String(pos.latitude));
      form.append("longitude", String(pos.longitude));
      if (pos.precisao != null) form.append("precisao", String(pos.precisao));
      form.append("mocked", String(pos.mocked));
      setResultado(await api<Resultado>("/pontos/selfie", { method: "POST", body: form }));
    } catch (e: any) {
      setErro(e.message || "Não foi possível registrar o ponto.");
    } finally {
      setEtapa("");
    }
  };

  const status = resultado ? STATUS_PONTO[resultado.status_validacao] : null;

  return (
    <Screen title="Registrar Ponto">
      <Card style={{ alignItems: "center", gap: 12 }}>
        <Icon name="camera-outline" size={44} color={c.primary} />
        <T bold size={17} style={{ textAlign: "center" }}>Ponto com selfie</T>
        <T muted style={{ textAlign: "center" }}>
          Tire uma selfie no momento da marcação. Sua localização é registrada junto com a foto e pode ser revisada pelo seu gestor.
        </T>
        <Button
          title={etapa || "Registrar ponto agora"}
          icon="finger-print-outline"
          onPress={registrar}
          loading={!!etapa}
          style={{ alignSelf: "stretch" }}
        />
      </Card>

      <Notice msg={erro} />

      {resultado && status && (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <T bold size={18}>{TIPO_PONTO_LABEL[resultado.tipo] ?? resultado.tipo}</T>
            <Badge label={status.label.toUpperCase()} tone={status.tone} />
          </Row>
          <T muted>{formatDataHora(resultado.horario)}</T>
          {resultado.local && (
            <T size={14}>
              {resultado.local} · {formatDistancia(resultado.distancia_metros)}
            </T>
          )}
          {resultado.status_validacao === "aprovado" ? (
            <Notice type="success" msg="Ponto registrado com sucesso." />
          ) : (
            <Notice type="info" msg={`Registrado e enviado para revisão do gestor: ${resultado.observacao}.`} />
          )}
        </Card>
      )}
    </Screen>
  );
}
