import { useState } from "react";
import { Switch } from "react-native";
import { Avatar, Badge, Button, Card, H, Input, Notice, Row, Screen, T } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { displayName } from "@/lib/jwt";
import { useTheme } from "@/lib/theme";

export default function Configuracoes() {
  const { user, isAdmin, signOut } = useAuth();
  const { dark, toggle, c } = useTheme();
  const [senha, setSenha] = useState({ atual: "", nova: "", confirmar: "" });
  const [notif, setNotif] = useState({ email: true, push: false }); // apenas visual, igual à web
  const [alert, setAlert] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "error" });
  const [saving, setSaving] = useState(false);

  const alterarSenha = async () => {
    if (!senha.atual || !senha.nova || !senha.confirmar) return setAlert({ msg: "Preencha todos os campos.", type: "error" });
    if (senha.nova !== senha.confirmar) return setAlert({ msg: "As senhas não coincidem.", type: "error" });
    if (senha.nova.length < 6) return setAlert({ msg: "Mínimo 6 caracteres.", type: "error" });
    setSaving(true);
    try {
      await api("/auth/senha", { method: "PUT", body: { senhaAtual: senha.atual, novaSenha: senha.nova } });
      setAlert({ msg: "Senha alterada com sucesso!", type: "success" });
      setSenha({ atual: "", nova: "", confirmar: "" });
    } catch (e: any) {
      setAlert({ msg: e.message || "Erro ao alterar senha.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const nome = displayName(user);
  return (
    <Screen title="Configurações">
      <Card>
        <Row>
          <Avatar name={nome} size={56} />
          <Row style={{ flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <T size={18} bold style={{ textTransform: "capitalize" }}>{nome}</T>
            <T muted size={13}>{user?.email}</T>
          </Row>
          <Badge label={isAdmin ? "Gerente" : "Funcionário"} tone={isAdmin ? "yellow" : "blue"} />
        </Row>
      </Card>

      <Card>
        <H>Segurança</H>
        <T muted size={13}>Altere sua senha de acesso</T>
        <Notice msg={alert.msg} type={alert.type} />
        <Input placeholder="Senha atual" secureTextEntry value={senha.atual} onChangeText={(v) => setSenha({ ...senha, atual: v })} />
        <Input placeholder="Nova senha" secureTextEntry value={senha.nova} onChangeText={(v) => setSenha({ ...senha, nova: v })} />
        <Input placeholder="Confirmar senha" secureTextEntry value={senha.confirmar} onChangeText={(v) => setSenha({ ...senha, confirmar: v })} />
        <Button title="Salvar nova senha" onPress={alterarSenha} loading={saving} />
      </Card>

      <Card>
        <H>Notificações</H>
        <Toggle label="Notificações por e-mail" value={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} color={c.primary} />
        <Toggle label="Notificações push" value={notif.push} onChange={(v) => setNotif({ ...notif, push: v })} color={c.primary} />
      </Card>

      <Card>
        <H>Aparência</H>
        <Toggle label="Tema escuro" value={dark} onChange={toggle} color={c.primary} />
      </Card>

      <Button title="Sair da conta" icon="log-out-outline" variant="danger" onPress={signOut} />
    </Screen>
  );
}

function Toggle({ label, value, onChange, color }: { label: string; value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <Row style={{ justifyContent: "space-between", paddingVertical: 6 }}>
      <T>{label}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: color }} />
    </Row>
  );
}
