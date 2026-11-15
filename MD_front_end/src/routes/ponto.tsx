import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Alert, BackButton, Card, Logo, PageShell, useRequireAuth } from "@/components/minddesk";
import { EntryAnimation } from "@/components/entry-animation";
import { Camera, Fingerprint, Loader2, MapPin, X } from "lucide-react";
import { STATUS_PONTO, TIPO_PONTO_LABEL, apiPonto, formatDataHora, formatDistancia, posicaoAtual, type Posicao } from "@/lib/ponto";

export const Route = createFileRoute("/ponto")({
  component: PontoPage,
});

type Resultado = {
  tipo: string;
  horario: string;
  status_validacao: string;
  distancia_metros: number | null;
  observacao: string | null;
  local: string | null;
};

// Mesmo fluxo do app: localização → selfie → POST /pontos/selfie (o back-end decide o tipo e valida o local).
function PontoPage() {
  useRequireAuth();
  const [etapa, setEtapa] = useState("");
  const [erro, setErro] = useState("");
  const [pos, setPos] = useState<Posicao | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const iniciar = async () => {
    setErro("");
    setResultado(null);
    setEtapa("Obtendo sua localização...");
    try {
      setPos(await posicaoAtual()); // abre a câmera
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEtapa("");
    }
  };

  const enviar = async (foto: Blob) => {
    if (!pos) return;
    setPos(null);
    setEtapa("Enviando...");
    try {
      const form = new FormData();
      form.append("foto", foto, "selfie.jpg");
      form.append("latitude", String(pos.latitude));
      form.append("longitude", String(pos.longitude));
      if (pos.precisao != null) form.append("precisao", String(pos.precisao));
      form.append("mocked", "false");
      setResultado(await apiPonto<Resultado>("/pontos/selfie", { method: "POST", body: form }));
    } catch (e) {
      setErro((e as Error).message || "Não foi possível registrar o ponto.");
    } finally {
      setEtapa("");
    }
  };

  const status = resultado ? STATUS_PONTO[resultado.status_validacao] : null;

  return (
    <PageShell>
      <EntryAnimation name="ponto" title="Registrar Ponto" subtitle="Preparando câmera e localização" />
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-8 max-w-xl mx-auto">
          <Logo />
          <BackButton />
        </div>

        <div className="max-w-xl mx-auto space-y-4">
          <Card className="p-6 sm:p-8 rounded-[32px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] shadow-xl text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/10 border border-primary/10 grid place-items-center text-primary">
              <Camera size={30} strokeWidth={1.8} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Ponto com selfie</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Tire uma selfie no momento da marcação. Sua localização é registrada junto com a foto e pode ser revisada pelo seu gestor.
            </p>
            <button
              onClick={iniciar}
              disabled={!!etapa}
              className="mt-6 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60 transition-all hover:-translate-y-0.5"
            >
              {etapa ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
              {etapa || "Registrar ponto agora"}
            </button>
          </Card>

          <Alert type="error" msg={erro} />

          {resultado && status && (
            <Card className="p-6 rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-foreground">{TIPO_PONTO_LABEL[resultado.tipo] ?? resultado.tipo}</h2>
                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold ${status.cls}`}>{status.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{formatDataHora(resultado.horario)}</p>
              {resultado.local && (
                <p className="text-sm text-foreground inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> {resultado.local} · {formatDistancia(resultado.distancia_metros)}
                </p>
              )}
              {resultado.status_validacao === "aprovado" ? (
                <Alert type="success" msg="Ponto registrado com sucesso." />
              ) : (
                <Alert type="info" msg={`Registrado e enviado para revisão do gestor: ${resultado.observacao}.`} />
              )}
            </Card>
          )}
        </div>
      </div>

      {pos && <SelfieCamera onCapture={enviar} onCancel={() => setPos(null)} />}
    </PageShell>
  );
}

/** Câmera frontal do navegador (webcam ou celular). Sem suporte, cai no seletor de arquivo com captura. */
function SelfieCamera({ onCapture, onCancel }: { onCapture: (b: Blob) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [falha, setFalha] = useState("");

  useEffect(() => {
    let stream: MediaStream | undefined;
    if (!navigator.mediaDevices?.getUserMedia) {
      setFalha("Câmera indisponível neste navegador.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setFalha("Permita o acesso à câmera ou envie uma foto."));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const capturar = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const escala = Math.min(1, 960 / v.videoWidth); // selfie leve, como no app
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * escala);
    c.height = Math.round(v.videoHeight * escala);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((b) => b && onCapture(b), "image/jpeg", 0.7);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-md rounded-[32px] overflow-hidden bg-card border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="font-semibold text-foreground">Sua selfie</span>
          <button onClick={onCancel} aria-label="Cancelar" className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        {falha ? (
          <p className="px-5 pb-2 text-sm text-muted-foreground">{falha}</p>
        ) : (
          <video ref={video} autoPlay playsInline muted className="w-full aspect-[3/4] object-cover bg-black -scale-x-100" />
        )}
        <div className="p-5 grid gap-2">
          {!falha && (
            <button
              onClick={capturar}
              className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/90"
            >
              <Camera size={18} /> Tirar selfie e registrar
            </button>
          )}
          {/* Só sem câmera: como no app, a selfie precisa ser tirada na hora. */}
          {falha && (
            <button
              onClick={() => file.current?.click()}
              className="h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              Tirar foto pelo dispositivo
            </button>
          )}
          <input
            ref={file}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={(e) => e.target.files?.[0] && onCapture(e.target.files[0])}
          />
        </div>
      </div>
    </div>
  );
}
