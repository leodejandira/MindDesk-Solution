import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TONES, useTheme, type ToneName } from "@/lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];
export { Ionicons as Icon };

/** Confirmação nativa (Alert) com fallback para o navegador. */
export function confirm(title: string, message = ""): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n${message}`.trim()));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirmar", style: "destructive", onPress: () => resolve(true) },
    ])
  );
}

// ---------- Layout ----------
type ScreenProps = {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ title, back = true, right, children, scroll = true, refreshing, onRefresh }: ScreenProps) {
  const { c } = useTheme();
  const router = useRouter();
  const header = title !== undefined && (
    <View style={[s.header, { borderColor: c.border }]}>
      {back ? (
        <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace("/manager"))}>
          <Ionicons name="arrow-back" size={24} color={c.text} />
        </Pressable>
      ) : (
        <View style={{ width: 24 }} />
      )}
      <Text style={[s.headerTitle, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 24, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}>{children}</View>;
}

// ---------- Texto ----------
type TxtProps = { children: ReactNode; muted?: boolean; size?: number; bold?: boolean; color?: string; style?: any; lines?: number };
export function T({ children, muted, size = 15, bold, color, style, lines }: TxtProps) {
  const { c } = useTheme();
  return (
    <Text
      numberOfLines={lines}
      style={[{ color: color ?? (muted ? c.muted : c.text), fontSize: size, fontWeight: bold ? "700" : "400" }, style]}
    >
      {children}
    </Text>
  );
}

export const H = ({ children }: { children: ReactNode }) => (
  <T size={20} bold style={{ marginBottom: 4 }}>
    {children}
  </T>
);

// ---------- Controles ----------
type Variant = "primary" | "outline" | "danger" | "success" | "ghost";
type BtnProps = { title: string; onPress: () => void; variant?: Variant; icon?: IconName; disabled?: boolean; loading?: boolean; style?: ViewStyle; small?: boolean };

export function Button({ title, onPress, variant = "primary", icon, disabled, loading, style, small }: BtnProps) {
  const { c } = useTheme();
  const map: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: "#FFF" },
    outline: { bg: "transparent", fg: c.text, border: c.border },
    danger: { bg: TONES.red.bg, fg: TONES.red.fg },
    success: { bg: "#16A34A", fg: "#FFF" },
    ghost: { bg: c.primarySoft, fg: c.primary },
  };
  const v = map[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        small && { height: 38, paddingHorizontal: 12 },
        { backgroundColor: v.bg, borderColor: v.border ?? v.bg, opacity: off ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} />}
          <Text style={{ color: v.fg, fontWeight: "600", fontSize: small ? 13 : 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, style, ...props }: TextInputProps & { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <T size={12} muted bold style={{ textTransform: "uppercase" }}>{label}</T>}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[s.input, { borderColor: c.border, backgroundColor: c.card, color: c.text }, style]}
      />
    </View>
  );
}

/** Seletor em abas (substitui tabs / <select> da web). */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return (
    <View style={[s.segment, { backgroundColor: c.primarySoft }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.segmentItem, on && { backgroundColor: c.card }]}>
            <Text style={{ color: on ? c.primary : c.muted, fontWeight: "600", fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Feedback ----------
export function Notice({ msg, type = "error" }: { msg?: string; type?: "error" | "success" | "info" }) {
  if (!msg) return null;
  const t = TONES[type === "error" ? "red" : type === "success" ? "green" : "blue"];
  return (
    <View style={[s.notice, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontWeight: "500" }}>{msg}</Text>
    </View>
  );
}

export function Badge({ label, tone = "blue" }: { label: string; tone?: ToneName }) {
  const t = TONES[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return <ActivityIndicator style={{ padding: 32 }} color={c.primary} size="large" />;
}

export function Empty({ text = "Nenhum dado encontrado." }: { text?: string }) {
  return (
    <T muted style={{ textAlign: "center", paddingVertical: 32 }}>
      {text}
    </T>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string | number; tone?: ToneName }) {
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <T size={12} muted>{label}</T>
      <T size={22} bold color={tone ? TONES[tone].fg : undefined}>{value}</T>
    </Card>
  );
}

export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const { c } = useTheme();
  const parts = (name || "?").trim().split(/\s+/);
  const ini = (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFF", fontWeight: "700", fontSize: size / 3 }}>{ini}</Text>
    </View>
  );
}

/** Barras horizontais simples (substitui o Recharts). Suporta valores negativos. */
export function Bars({ items }: { items: { label: string; value: number; color: string; display?: string }[] }) {
  const { c } = useTheme();
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <View style={{ gap: 8 }}>
      {items.map((i, idx) => (
        <View key={idx} style={{ gap: 4 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <T size={13} lines={1} style={{ flex: 1 }}>{i.label}</T>
            <T size={13} bold color={i.color}>{i.display ?? i.value}</T>
          </Row>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.border, overflow: "hidden" }}>
            <View style={{ width: `${(Math.abs(i.value) / max) * 100}%`, height: "100%", backgroundColor: i.color, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 },
  btn: { height: 48, borderRadius: 14, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 },
  input: { height: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  segmentItem: { flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notice: { padding: 12, borderRadius: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
});
