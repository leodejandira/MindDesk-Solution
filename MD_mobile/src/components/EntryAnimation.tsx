import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Backdrop, T } from "@/components/ui";
import { useTheme } from "@/lib/theme";

// Lottie em JSON: funciona no Expo Go, no APK e na web sem configuração extra do Metro.
const SOURCES = {
  first: require("../../assets/lottie/first.json"),
  chat: require("../../assets/lottie/chat.json"),
  relatorios: require("../../assets/lottie/relatorios.json"),
  humanograma: require("../../assets/lottie/humanograma.json"),
  ponto: require("../../assets/lottie/ponto.json"),
  documentos: require("../../assets/lottie/documentos.json"),
  funcionarios: require("../../assets/lottie/funcionarios.json"),
};
export type AnimName = keyof typeof SOURCES;

type Props = {
  name: AnimName;
  title?: string;
  subtitle?: string;
  /** Tempo na tela antes de sumir (ms). A tela por baixo já carrega os dados enquanto isso. */
  duration?: number;
  onDone?: () => void;
};

/**
 * Transição de entrada: cobre a tela ao abrir, toca a animação e some com fade.
 * Toca uma vez por entrada; toque na tela para pular.
 */
export function EntryAnimation({ name, title, subtitle, duration = 2000, onDone }: Props) {
  const { c } = useTheme();
  const [done, setDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => {
      setDone(true);
      onDone?.();
    });
  };

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }).start();
    const t = setTimeout(close, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;
  const src = SOURCES[name];
  const aspectRatio = Math.min(1.6, Math.max(1, (src.w || 1) / (src.h || 1)));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity, zIndex: 10 }]}>
      <Backdrop />
      <Pressable style={s.center} onPress={close} accessibilityLabel="Pular animação" testID="entry-animation">
        {/* Sem fundo: só um brilho azul suave atrás, para destacar a ilustração no tema escuro. */}
        <Animated.View style={[s.stage, { aspectRatio, transform: [{ scale }] }]}>
          <View pointerEvents="none" style={[s.glow, { backgroundColor: c.primarySoft }]} />
          <LottieView source={src} autoPlay loop style={s.lottie} resizeMode="contain" />
        </Animated.View>
        {title && (
          <T size={22} bold style={{ textAlign: "center", letterSpacing: -0.4 }}>
            {title}
          </T>
        )}
        {subtitle && (
          <T muted style={{ textAlign: "center" }}>
            {subtitle}
          </T>
        )}
        <View style={s.dots}>
          {[0, 1, 2].map((i) => (
            <Dot key={i} delay={i * 160} color={c.primary} />
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Pontinhos pulsando (o .md-dot da web). */
function Dot({ delay, color }: { delay: number; color: string }) {
  const v = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.35, duration: 420, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, v]);
  return <Animated.View style={[s.dot, { backgroundColor: color, opacity: v }]} />;
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  stage: { width: "100%", maxWidth: 360, marginBottom: 14, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: "78%", aspectRatio: 1, borderRadius: 999, opacity: 0.9 },
  lottie: { width: "100%", height: "100%" },
  dots: { flexDirection: "row", gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
