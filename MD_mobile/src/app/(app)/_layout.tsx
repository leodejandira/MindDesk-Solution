import { Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

// Telas de gerente ficam atrás do guard de admin (mesma regra do useRequireAuth("admin") da web).
export default function AppLayout() {
  const { isAdmin } = useAuth();
  const { c } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="manager" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="qrcode" />
      <Stack.Screen name="cursos" />
      <Stack.Screen name="configuracoes" />
      <Stack.Protected guard={isAdmin} redirectTo="/manager">
        <Stack.Screen name="relatorios" />
        <Stack.Screen name="humanograma" />
        <Stack.Screen name="funcionarios" />
        <Stack.Screen name="documentos" />
      </Stack.Protected>
    </Stack>
  );
}
