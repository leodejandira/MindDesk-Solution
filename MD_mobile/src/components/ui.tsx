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
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONT, useTheme, type ToneName } from "@/lib/theme";

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

/** Fundo com brilho azul no topo, como o .md-bg / radial-gradient da web. */
export function Backdrop() {
  const { c } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[c.bgGlow, c.bg]}
      locations={[0, 1]}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
    />
  );
}

export function Screen({ title, back = true, right, children, scroll = true, refreshing, onRefresh }: ScreenProps) {
  const { c } = useTheme();
  const router = useRouter();
  const header = title !== undefined && (
    <View style={s.header}>
      {back ? (
        <Pressable
          hitSlop={8}
          accessibilityLabel="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/manager"))}
          style={[s.iconBtn, { backgroundColor: c.card, borderColor: c.cardBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text style={[s.headerTitle, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
      <Backdrop />
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
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
  const { c, dark } = useTheme();
  return <View style={[s.card, !dark && s.shadow, { backgroundColor: c.card, borderColor: c.cardBorder }, style]}>{children}</View>;
}

/** Card de destaque com o gradiente escuro do "Bem-vindo" da web. */
export function Hero({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <LinearGradient colors={c.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, s.hero, style]}>
      <View pointerEvents="none" style={s.heroGlow} />
      {children}
    </LinearGradient>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, style]}>{children}</View>;
}

// ---------- Texto ----------
type TxtProps = { children: ReactNode; muted?: boolean; size?: number; bold?: boolean; semibold?: boolean; color?: string; style?: any; lines?: number };
export function T({ children, muted, size = 15, bold, semibold, color, style, lines }: TxtProps) {
  const { c } = useTheme();
  return (
    <Text
      numberOfLines={lines}
      style={[
        { color: color ?? (muted ? c.muted : c.text), fontSize: size, fontFamily: bold ? FONT.bold : semibold ? FONT.semibold : FONT.regular },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export const H = ({ children }: { children: ReactNode }) => (
  <T size={20} bold style={{ marginBottom: 4, letterSpacing: -0.3 }}>
    {children}
  </T>
);

// ---------- Controles ----------
type Variant = "primary" | "outline" | "danger" | "success" | "ghost";
type BtnProps = { title: string; onPress: () => void; variant?: Variant; icon?: IconName; disabled?: boolean; loading?: boolean; style?: ViewStyle; small?: boolean };

export function Button({ title, onPress, variant = "primary", icon, disabled, loading, style, small }: BtnProps) {
  const { c, tones } = useTheme();
  const map: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.primaryText },
    outline: { bg: c.card, fg: c.text, border: c.cardBorder },
    danger: { bg: tones.red.bg, fg: tones.red.fg },
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
          <Text style={{ color: v.fg, fontFamily: FONT.semibold, fontSize: small ? 13 : 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ label, style, ...props }: TextInputProps & { label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <T size={11} muted semibold style={{ textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</T>}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[s.input, { borderColor: c.cardBorder, backgroundColor: c.input, color: c.text }, style]}
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
            <Text style={{ color: on ? c.primary : c.muted, fontFamily: FONT.semibold, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Feedback ----------
export function Notice({ msg, type = "error" }: { msg?: string; type?: "error" | "success" | "info" }) {
  const { tones } = useTheme();
  if (!msg) return null;
  const t = tones[type === "error" ? "red" : type === "success" ? "green" : "blue"];
  return (
    <View style={[s.notice, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontFamily: FONT.medium }}>{msg}</Text>
    </View>
  );
}

export function Badge({ label, tone = "blue" }: { label: string; tone?: ToneName }) {
  const t = useTheme().tones[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: 10, fontFamily: FONT.semibold, letterSpacing: 0.6 }}>{label}</Text>
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
  const { tones } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14, borderRadius: 22 }}>
      <T size={12} muted>{label}</T>
      <T size={22} bold color={tone ? tones[tone].fg : undefined}>{value}</T>
    </Card>
  );
}

export function Avatar({ name, size = 44 }: { name?: string; size?: number }) {
  const { c } = useTheme();
  const parts = (name || "?").trim().split(/\s+/);
  const ini = (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 3, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: c.primary, fontFamily: FONT.bold, fontSize: size / 3 }}>{ini}</Text>
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
          <View style={{ height: 8, borderRadius: 4, backgroundColor: c.primarySoft, overflow: "hidden" }}>
            <View style={{ width: `${(Math.abs(i.value) / max) * 100}%`, height: "100%", backgroundColor: i.color, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Raios seguem a web: --radius 14px, cards rounded-[28px], hero rounded-[32px], botões rounded-2xl.
const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 64 },
  headerTitle: { flex: 1, fontSize: 19, fontFamily: FONT.semibold, letterSpacing: -0.3 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 28, padding: 18, gap: 8 },
  shadow: { shadowColor: "#0B1C2C", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  hero: { borderColor: "rgba(255,255,255,0.10)", borderRadius: 32, padding: 24, overflow: "hidden" },
  heroGlow: { position: "absolute", top: -90, right: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(76,159,255,0.22)" },
  btn: { height: 50, borderRadius: 16, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 },
  input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 15, fontFamily: FONT.regular },
  segment: { flexDirection: "row", borderRadius: 16, padding: 4, gap: 4 },
  segmentItem: { flex: 1, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notice: { padding: 14, borderRadius: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
});
