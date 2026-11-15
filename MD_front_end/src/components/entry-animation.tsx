import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Mesmas animações do app. Cada JSON é carregado sob demanda (não pesa no bundle inicial),
// e o lottie-web só é importado no navegador (o TanStack Start também renderiza no servidor).
const SOURCES = {
  first: () => import("@/assets/lottie/first.json"),
  chat: () => import("@/assets/lottie/chat.json"),
  relatorios: () => import("@/assets/lottie/relatorios.json"),
  humanograma: () => import("@/assets/lottie/humanograma.json"),
  ponto: () => import("@/assets/lottie/ponto.json"),
  documentos: () => import("@/assets/lottie/documentos.json"),
  funcionarios: () => import("@/assets/lottie/funcionarios.json"),
};
export type AnimName = keyof typeof SOURCES;

type Props = {
  name: AnimName;
  title?: string;
  subtitle?: string;
  /** Tempo na tela antes de sumir (ms). A página por baixo já carrega os dados enquanto isso. */
  duration?: number;
  onDone?: () => void;
};

/** Transição de entrada: cobre a página ao abrir, toca a animação e some com fade. Clique para pular. */
export function EntryAnimation({ name, title, subtitle, duration = 2000, onDone }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [saindo, setSaindo] = useState(false);
  const [fim, setFim] = useState(false);
  const [montado, setMontado] = useState(false);

  const fechar = () => setSaindo(true);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!montado) return;
    let anim: { destroy: () => void } | undefined;
    let vivo = true;
    Promise.all([import("lottie-web/build/player/lottie_light"), SOURCES[name]()]).then(([lottie, json]) => {
      if (!vivo || !box.current) return;
      anim = lottie.default.loadAnimation({
        container: box.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: structuredClone((json as { default: unknown }).default),
      });
    });
    const t = setTimeout(fechar, duration);
    return () => {
      vivo = false;
      clearTimeout(t);
      anim?.destroy();
    };
  }, [name, duration, montado]);

  useEffect(() => {
    if (!saindo) return;
    const t = setTimeout(() => {
      setFim(true);
      onDone?.();
    }, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saindo]);

  if (fim || !montado) return null;
  // Portal no <body>: algumas páginas (ex.: chat) criam o próprio contexto de empilhamento.
  return createPortal(
    <div
      role="status"
      aria-label={title ? `Abrindo ${title}` : "Carregando"}
      onClick={fechar}
      style={{ position: "fixed" }} // o .md-bg do styles.css força position: relative
      className={`md-bg fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-2 px-6 transition-opacity duration-300 ${saindo ? "opacity-0" : "opacity-100"}`}
    >
      <div className="relative mb-4 flex w-full max-w-[420px] items-center justify-center animate-in zoom-in-95 fade-in duration-500">
        {/* Sem fundo: só um brilho azul suave atrás da ilustração. */}
        <div className="absolute aspect-square w-[78%] rounded-full bg-primary/15 blur-2xl" />
        <div ref={box} className="relative aspect-square w-full" />
      </div>
      {title && <h2 className="text-center text-2xl font-bold tracking-tight text-foreground">{title}</h2>}
      {subtitle && <p className="text-center text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="md-dot h-2 w-2 rounded-full bg-primary" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>,
    document.body
  );
}
