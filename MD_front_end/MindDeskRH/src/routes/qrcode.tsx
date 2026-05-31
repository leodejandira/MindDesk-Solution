import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  API,
  authHeaders,
  PageShell,
  BackButton,
  Logo,
  Card,
  Alert,
} from "@/components/minddesk";
import { QrCode, RefreshCcw, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/qrcode")({
  component: QRCodePage,
});

function QRCodePage() {
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "error" });

  // Função para buscar o novo ticket seguro no backend
  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/pontos/ticket`, {
        headers: authHeaders(),
      });
      
      if (!res.ok) throw new Error("Falha ao gerar ticket");
      
      const data = await res.json();
      setTicket(data.ticket);
    } catch (err) {
      setAlert({ msg: "Erro ao conectar com o servidor.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Busca inicial e renovação a cada 50 segundos (o ticket expira em 60s)
  useEffect(() => {
    fetchTicket();
    const interval = setInterval(fetchTicket, 50000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  return (
    <PageShell>
      <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%)]">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <Logo />
            <BackButton />
          </header>

          <div className="max-w-[430px] mx-auto">
            <Card className="p-6 sm:p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center text-primary">
                  <QrCode size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Bater Ponto</h2>
                  <p className="text-sm text-zinc-500 dark:text-white/50">Aproxime do leitor</p>
                </div>
              </div>

              {alert.msg && <Alert type={alert.type} msg={alert.msg} />}

              {/* Área do QR Code */}
              <div className="rounded-[28px] bg-zinc-100 dark:bg-white/[0.04] border border-black/5 dark:border-white/10 p-5 flex items-center justify-center min-h-[300px]">
                {loading ? (
                  <Loader2 className="animate-spin text-primary" size={40} />
                ) : (
                  <div className="bg-white rounded-[28px] p-4 shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(ticket)}&color=0f172a&bgcolor=FFFFFF&margin=10`}
                      alt="QR Code de Ponto"
                      width={300}
                      height={300}
                      className="rounded-2xl"
                    />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 py-2 rounded-xl text-xs font-semibold">
                <ShieldCheck size={14} />
                <span>Código seguro (renovado automaticamente)</span>
              </div>

              <button
                onClick={fetchTicket}
                disabled={loading}
                className="mt-4 w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <RefreshCcw size={18} />
                {loading ? "Gerando..." : "Atualizar Código"}
              </button>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default QRCodePage;