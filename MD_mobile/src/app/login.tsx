import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Card, Icon, Input, Notice, Screen, T } from "@/components/ui";
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
        <View style={{ alignItems: "center", marginTop: 12, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
              <Icon name="sparkles" size={20} color={c.primaryText} />
            </View>
            <T size={30} bold style={{ letterSpacing: -0.8 }}>
              Mind<T size={30} bold color={c.primary}>Desk</T>
            </T>
          </View>
          <Image source={require("../../assets/illus/login.png")} style={{ width: 230, height: 220 }} resizeMode="contain" />
        </View>
        <Card style={{ gap: 14, padding: 24, borderRadius: 32 }}>
          <View>
            <T size={24} semibold style={{ letterSpacing: -0.5 }}>Bem-vindo de volta</T>
            <T muted size={14}>Acesse sua conta MindDesk RH</T>
          </View>
          <Notice msg={error} />
          <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Input label="Senha" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry onSubmitEditing={submit} />
          <Button title="Entrar" icon="arrow-forward" onPress={submit} loading={loading} style={{ marginTop: 4 }} />
          <T size={12} muted style={{ textAlign: "center" }}>Problemas com acesso? Fale com o RH</T>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}
