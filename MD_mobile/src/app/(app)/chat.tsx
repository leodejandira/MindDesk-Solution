import { useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Icon, Screen, confirm } from "@/components/ui";
import { api, appendFile, type LocalFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isoDate, parseInline } from "@/lib/logic";
import { pickDocument, pickPhoto } from "@/lib/pick";
import { useTheme } from "@/lib/theme";

type Msg = { id: number; type: "ai" | "user"; text: string };
const BOAS_VINDAS: Msg = { id: 0, type: "ai", text: "Olá! Sou o assistente virtual da MindDesk. Como posso ajudar com dúvidas de RH hoje?" };

export default function Chat() {
  const { user } = useAuth();
  const { c } = useTheme();
  const [msgs, setMsgs] = useState<Msg[]>([BOAS_VINDAS]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Msg>>(null);

  const push = (type: Msg["type"], text: string) => setMsgs((m) => [...m, { id: Date.now() + Math.random(), type, text }]);
  const ask = (query: string) =>
    api<{ answer?: string }>("/chat/perguntar", { method: "POST", body: { query, tenant_id: user?.tenant_id } });

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    push("user", text);
    setInput("");
    setBusy(true);
    try {
      push("ai", (await ask(text)).answer || "Não foi possível gerar uma resposta.");
    } catch {
      push("ai", "Desculpe, ocorreu um erro. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  // Mesmo fluxo da web: sobe o atestado e pede ao chat para analisá-lo pela URL.
  const upload = async (file: LocalFile | null) => {
    if (!file) return;
    push("user", `Enviando documento: ${file.name}`);
    setBusy(true);
    const motivo = input.trim() || "Enviado via Chat de IA";
    setInput("");
    try {
      const form = new FormData();
      appendFile(form, "arquivo", file);
      form.append("tenant_id", String(user?.tenant_id ?? ""));
      form.append("usuario_id", String(user?.id ?? ""));
      form.append("data_emissao", isoDate(new Date()));
      form.append("dias_afastamento", "1");
      form.append("motivo_cid", motivo);
      const { url } = await api<{ url: string }>("/atestados/upload", { method: "POST", body: form });
      push("ai", (await ask(`Analise este atestado medico: ${url}`)).answer || "Atestado recebido e enviado para análise!");
    } catch (e: any) {
      push("ai", `Falha ao processar atestado: ${e.message || "Tente novamente."}`);
    } finally {
      setBusy(false);
    }
  };

  const attach = () => {
    const run = (fn: () => Promise<LocalFile | null>) => fn().then(upload).catch((e) => push("ai", e.message));
    if (Platform.OS === "web") return run(pickDocument);
    Alert.alert("Enviar atestado", "Escolha a origem", [
      { text: "Câmera", onPress: () => run(() => pickPhoto("camera")) },
      { text: "Galeria", onPress: () => run(() => pickPhoto("library")) },
      { text: "Arquivo (PDF)", onPress: () => run(pickDocument) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const novaConversa = async () => (await confirm("Iniciar uma nova conversa?")) && setMsgs([BOAS_VINDAS]);

  return (
    <Screen
      title="MindDesk Assistant"
      scroll={false}
      right={
        <Pressable hitSlop={12} onPress={novaConversa} accessibilityLabel="Nova conversa">
          <Icon name="add-circle-outline" size={26} color={c.primary} />
        </Pressable>
      }
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <FlatList
          ref={list}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <Bubble m={item} />}
          ListFooterComponent={busy ? <ActivityIndicator style={{ alignSelf: "flex-start", margin: 8 }} color={c.primary} /> : undefined}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
          <Pressable onPress={attach} disabled={busy} hitSlop={8} accessibilityLabel="Anexar atestado">
            <Icon name="attach" size={26} color={busy ? c.border : c.muted} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={send}
            editable={!busy}
            placeholder="Escreva algo ou anexe um atestado..."
            placeholderTextColor={c.muted}
            style={{ flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 12, borderRadius: 14, backgroundColor: c.bg, color: c.text }}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={busy || !input.trim()}
            accessibilityLabel="Enviar"
            style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", opacity: busy || !input.trim() ? 0.5 : 1 }}
          >
            <Icon name="send" size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Bubble({ m }: { m: Msg }) {
  const { c } = useTheme();
  const user = m.type === "user";
  const color = user ? "#FFF" : c.text;
  return (
    <View
      style={{
        alignSelf: user ? "flex-end" : "flex-start",
        maxWidth: "85%",
        padding: 12,
        borderRadius: 18,
        backgroundColor: user ? c.primary : c.card,
        borderWidth: user ? 0 : 1,
        borderColor: c.border,
      }}
    >
      <Text style={{ color, fontSize: 15, lineHeight: 21 }}>
        {m.text.split("\n").map((line, i, arr) => (
          <Text key={i}>
            {parseInline(line).map((seg, j) => (
              <Text key={j} style={{ fontWeight: seg.bold ? "700" : "400", fontStyle: seg.italic ? "italic" : "normal" }}>
                {seg.text}
              </Text>
            ))}
            {i < arr.length - 1 ? "\n" : ""}
          </Text>
        ))}
      </Text>
    </View>
  );
}
