import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Badge, Button, Card, Loading, Notice, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";

// O ticket expira em 60s no back-end; renovamos a cada 50s como a web.
const RENOVAR_MS = 50_000;

export default function QrCodeScreen() {
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      setTicket((await api<{ ticket: string }>("/pontos/ticket")).ticket);
      setError("");
    } catch {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTicket();
    const t = setInterval(fetchTicket, RENOVAR_MS);
    return () => clearInterval(t);
  }, [fetchTicket]);

  return (
    <Screen title="Bater Ponto">
      <Card style={{ alignItems: "center", gap: 16 }}>
        <T muted>Aproxime do leitor</T>
        <Notice msg={error} />
        <View style={{ padding: 16, backgroundColor: "#FFF", borderRadius: 20, minHeight: 272, justifyContent: "center" }}>
          {loading && !ticket ? <Loading /> : ticket ? <QRCode value={ticket} size={240} color="#0F172A" /> : null}
        </View>
        <Badge label="Código seguro (renovado automaticamente)" tone="green" />
        <Button title={loading ? "Gerando..." : "Atualizar código"} icon="refresh" onPress={fetchTicket} disabled={loading} style={{ alignSelf: "stretch" }} />
      </Card>
    </Screen>
  );
}
