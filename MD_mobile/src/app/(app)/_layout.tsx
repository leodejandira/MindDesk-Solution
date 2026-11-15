import { Stack } from "expo-router";
import { View } from "react-native";
import { EntryAnimation } from "@/components/EntryAnimation";
import { displayName } from "@/lib/jwt";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

// Telas de gerente ficam atrás do guard de admin (mesma regra do useRequireAuth("admin") da web).
export default function AppLayout() {
  const { isAdmin, user, welcome, endWelcome } = useAuth();
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="manager" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="qrcode" />
      <Stack.Screen name="ponto" />
      <Stack.Screen name="cursos" />
      <Stack.Screen name="configuracoes" />
      <Stack.Protected guard={isAdmin} redirectTo="/manager">
        <Stack.Screen name="relatorios" />
        <Stack.Screen name="humanograma" />
        <Stack.Screen name="funcionarios" />
        <Stack.Screen name="documentos" />
        <Stack.Screen name="revisao-ponto" />
      </Stack.Protected>
    </Stack>
    {/* Animação "first": só depois de um login, antes de mostrar o menu (que já carrega por baixo). */}
    {welcome && (
      <EntryAnimation name="first" title={`Olá, ${displayName(user).replace(/(^|\s)\S/g, (m) => m.toUpperCase())}!`} subtitle="Preparando seu espaço no MindDesk" duration={3600} onDone={endWelcome} />
    )}
    </View>
  );
}
