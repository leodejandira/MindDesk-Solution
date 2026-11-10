import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Card, Input, Notice, Screen, T } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function Login() {
  const { signIn } = useAuth();
  const { c } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email || !password) return setError("Preencha e-mail e senha.");
    setLoading(true);
    try {
      await signIn(email.trim(), password); // o guard do layout leva ao /manager
    } catch (e: any) {
      setError(e.message || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ alignItems: "center", marginTop: 48, marginBottom: 24 }}>
          <T size={32} bold>
            Mind<T size={32} bold color={c.primary}>Desk</T>
          </T>
          <T muted>RH</T>
        </View>
        <Card style={{ gap: 14 }}>
          <T size={22} bold>Bem-vindo de volta</T>
          <T muted>Acesse sua conta MindDesk RH</T>
          <Notice msg={error} />
          <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Input label="Senha" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry onSubmitEditing={submit} />
          <Button title="Entrar" onPress={submit} loading={loading} />
          <T size={12} muted style={{ textAlign: "center" }}>Problemas com acesso? Fale com o RH</T>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
