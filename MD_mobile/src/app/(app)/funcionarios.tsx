import { useMemo, useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Badge, Button, Card, Empty, H, Icon, Input, Loading, Notice, Row, Screen, Segmented, T, confirm } from "@/components/ui";
import { api } from "@/lib/api";
import { matches, validarFuncionario, type FuncForm } from "@/lib/logic";
import { useTheme } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

type Func = { id: string; nome: string; email: string; cargo: string; gerente: boolean };
const VAZIO: FuncForm = { nome: "", email: "", cargo: "", password: "", confirmar: "" };

export default function Funcionarios() {
  const { c } = useTheme();
  const [busca, setBusca] = useState("");
  const [aviso, setAviso] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "error" });
  const [editando, setEditando] = useState<Func | null>(null);
  const [aberto, setAberto] = useState(false);

  const lista = useLoad(async () =>
    ((await api<any[]>("/usuarios")) || []).map(
      (f): Func => ({ id: f.id, nome: f.nome || "", email: f.email || "", cargo: f.cargo || "Não informado", gerente: f.role === "admin" })
    )
  );
  const filtrados = useMemo(() => (lista.data ?? []).filter((f) => matches(busca, f.nome, f.email, f.cargo)), [lista.data, busca]);

  const excluir = async (f: Func) => {
    if (!(await confirm(`Excluir ${f.nome}?`))) return;
    try {
      await api(`/usuarios?email=${encodeURIComponent(f.email)}`, { method: "DELETE" });
      lista.reload();
    } catch (e: any) {
      setAviso({ msg: e.message || "Erro ao excluir funcionário.", type: "error" });
    }
  };

  const abrir = (f: Func | null) => {
    setEditando(f);
    setAberto(true);
  };

  return (
    <Screen title="Funcionários" refreshing={lista.loading} onRefresh={lista.reload}>
      <Button title="Novo funcionário" icon="add" onPress={() => abrir(null)} />
      <Input placeholder="Buscar por nome, e-mail ou cargo..." value={busca} onChangeText={setBusca} />
      {!!busca && <T muted size={13}>{filtrados.length} resultado(s) encontrado(s)</T>}
      <Notice msg={aviso.msg} type={aviso.type} />

      {lista.loading && !lista.data ? (
        <Loading />
      ) : !filtrados.length ? (
        <Card><Empty text={busca ? "Nenhum funcionário encontrado." : "Nenhum funcionário cadastrado."} /></Card>
      ) : (
        filtrados.map((f) => (
          <Card key={f.id}>
            <Row style={{ alignItems: "flex-start" }}>
              <Avatar name={f.nome} />
              <View style={{ flex: 1, gap: 2 }}>
                <T bold size={16} lines={1}>{f.nome}</T>
                <Row style={{ gap: 6 }}><Icon name="mail-outline" size={13} color={c.muted} /><T muted size={13} lines={1}>{f.email}</T></Row>
                <Row style={{ gap: 6 }}><Icon name="briefcase-outline" size={13} color={c.muted} /><T muted size={13}>{f.cargo}</T></Row>
              </View>
              <Badge label={f.gerente ? "Gerente" : "Funcionário"} tone={f.gerente ? "yellow" : "blue"} />
            </Row>
            <Row>
              <Button small style={{ flex: 1 }} variant="ghost" icon="pencil" title="Editar" onPress={() => abrir(f)} />
              <Button small style={{ flex: 1 }} variant="danger" icon="trash-outline" title="Excluir" onPress={() => excluir(f)} />
            </Row>
          </Card>
        ))
      )}

      {aberto && (
      <FuncModal
        editando={editando}
        onClose={() => setAberto(false)}
        onSaved={(msg) => {
          setAberto(false);
          setAviso({ msg, type: "success" });
          lista.reload();
        }}
      />
      )}
    </Screen>
  );
}

// Montado só quando aberto: o estado inicial vem do funcionário em edição.
function FuncModal({ editando, onClose, onSaved }: { editando: Func | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const { c } = useTheme();
  const [form, setForm] = useState<FuncForm>(() =>
    editando ? { ...VAZIO, nome: editando.nome, email: editando.email, cargo: editando.cargo } : VAZIO
  );
  const [nivel, setNivel] = useState<"viewer" | "admin">(editando?.gerente ? "admin" : "viewer");
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FuncForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const salvar = async () => {
    const msg = validarFuncionario(form, !editando);
    if (msg) return setErro(msg);
    setSaving(true);
    setErro("");
    const nome = form.nome.trim();
    const email = form.email.trim().toLowerCase();
    const cargo = form.cargo.trim();
    try {
      if (editando) {
        const body: Record<string, string> = { nome, cargo };
        if (email !== editando.email) body.novoEmail = email;
        await api(`/usuarios?email=${encodeURIComponent(editando.email)}`, { method: "PUT", body });
      } else {
        await api("/usuarios/register", { method: "POST", body: { nome, email, password: form.password, cargo, role: nivel } });
      }
      onSaved(editando ? "Funcionário atualizado com sucesso." : "Funcionário criado com sucesso.");
    } catch (e: any) {
      setErro(e.message || "Erro ao salvar funcionário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <H>{editando ? "Editar funcionário" : "Novo funcionário"}</H>
          <Notice msg={erro} />
          <Input placeholder="Nome completo" value={form.nome} onChangeText={set("nome")} />
          <Input placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set("email")} />
          <Input placeholder="Cargo" value={form.cargo} onChangeText={set("cargo")} />
          {!editando && (
            <>
              <Input placeholder="Senha" secureTextEntry value={form.password} onChangeText={set("password")} />
              <Input placeholder="Confirmar senha" secureTextEntry value={form.confirmar} onChangeText={set("confirmar")} />
              <Segmented options={[{ key: "viewer", label: "Funcionário" }, { key: "admin", label: "Gerente" }]} value={nivel} onChange={setNivel} />
            </>
          )}
          <Row>
            <Button style={{ flex: 1 }} variant="outline" title="Cancelar" onPress={onClose} disabled={saving} />
            <Button style={{ flex: 1 }} title="Salvar" onPress={salvar} loading={saving} />
          </Row>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
