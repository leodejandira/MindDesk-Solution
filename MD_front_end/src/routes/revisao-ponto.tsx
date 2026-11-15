import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, BackButton, Card, Logo, PageShell, useRequireAuth } from "@/components/minddesk";
import { EntryAnimation } from "@/components/entry-animation";
import { Loader2, LocateFixed, Map as MapIcon, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { STATUS_PONTO, TIPO_PONTO_LABEL, apiPonto, formatDataHora, formatDistancia, mapsUrl, posicaoAtual } from "@/lib/ponto";

export const Route = createFileRoute("/revisao-ponto")({
  component: RevisaoPontoPage,
});

type Status = "pendente_revisao" | "aprovado" | "rejeitado";
type PontoRevisao = {
  id: number;
  horario: string;
  tipo: string;
  observacao: string | null;
  latitude: number | null;
  longitude: number | null;
  distancia_metros: number | null;
  status_validacao: Status;
  foto: string | null;
  usuarios: { nome: string; cargo: string } | null;
  locais_trabalho: { nome: string } | null;
};
type Local = { id: number; nome: string; latitude: number; longitude: number; raio_metros: number };

const CARD = "rounded-[28px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03]";

function Tabs<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-primary/10">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-colors ${o.key === value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RevisaoPontoPage() {
  useRequireAuth("admin");
  const [aba, setAba] = useState<"pontos" | "locais">("pontos");
  return (
    <PageShell>
      <EntryAnimation name="ponto" title="Revisão de Ponto" subtitle="Carregando selfies e locais" />
      <div className="min-h-screen px-4 sm:px-6 lg:px-12 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
          <Logo />
          <BackButton />
        </div>
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="mb-2">
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck size={22} className="text-primary" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Revisão de Ponto</h1>
            </div>
            <p className="text-sm text-muted-foreground">Confira as selfies e a localização das marcações e cadastre os locais de trabalho.</p>
          </div>
          <Tabs
            options={[
              { key: "pontos", label: "Pontos com selfie" },
              { key: "locais", label: "Locais de trabalho" },
            ]}
            value={aba}
            onChange={setAba}
          />
          {aba === "pontos" ? <Pontos /> : <Locais />}
        </div>
      </div>
    </PageShell>
  );
}

function Pontos() {
  const [status, setStatus] = useState<Status>("pendente_revisao");
  const [lista, setLista] = useState<PontoRevisao[] | null>(null);
  const [erro, setErro] = useState("");
  const [ampliada, setAmpliada] = useState<string | null>(null);

  useEffect(() => {
    setLista(null);
    setErro("");
    apiPonto<PontoRevisao[]>(`/pontos/revisao?status=${status}`)
      .then(setLista)
      .catch((e) => {
        setErro(e.message);
        setLista([]);
      });
  }, [status]);

  const validar = async (p: PontoRevisao, novo: "aprovado" | "rejeitado") => {
    setErro("");
    try {
      await apiPonto(`/pontos/${p.id}/validacao`, { method: "PATCH", body: { status: novo } });
      setLista((prev) => (prev ?? []).filter((x) => x.id !== p.id));
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  return (
    <>
      <Tabs
        options={[
          { key: "pendente_revisao", label: "Em revisão" },
          { key: "aprovado", label: "Aprovados" },
          { key: "rejeitado", label: "Rejeitados" },
        ]}
        value={status}
        onChange={setStatus}
      />
      <Alert type="error" msg={erro} />
      {lista === null ? (
        <div className="py-10 grid place-items-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
      ) : lista.length === 0 ? (
        <Card className={`${CARD} p-10 text-center text-sm text-muted-foreground`}>Nenhum ponto nesta categoria.</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lista.map((p) => {
            const st = STATUS_PONTO[p.status_validacao];
            return (
              <Card key={p.id} className={`${CARD} p-5 space-y-3`}>
                <div className="flex gap-4">
                  {p.foto ? (
                    <button onClick={() => setAmpliada(p.foto)} aria-label="Ampliar selfie" className="shrink-0">
                      <img src={p.foto} alt={`Selfie de ${p.usuarios?.nome ?? "funcionário"}`} className="w-24 h-24 rounded-2xl object-cover bg-muted" />
                    </button>
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-primary/10 grid place-items-center text-primary font-bold text-xl shrink-0">
                      {(p.usuarios?.nome || "?").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">{p.usuarios?.nome || "—"}</p>
                      {st && <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap ${st.cls}`}>{st.label}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.usuarios?.cargo || "Funcionário"}</p>
                    <p className="text-sm text-foreground">{TIPO_PONTO_LABEL[p.tipo] ?? p.tipo}</p>
                    <p className="text-xs text-muted-foreground">{formatDataHora(p.horario)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.locais_trabalho?.nome ? `${p.locais_trabalho.nome} · ` : ""}
                      {formatDistancia(p.distancia_metros)}
                    </p>
                  </div>
                </div>
                {p.observacao && <Alert type="info" msg={p.observacao} />}
                <div className="flex gap-2">
                  {p.latitude != null && p.longitude != null && (
                    <a
                      href={mapsUrl(p.latitude, p.longitude)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 h-10 rounded-xl border border-border text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-secondary"
                    >
                      <MapIcon size={15} /> Mapa
                    </a>
                  )}
                  {p.status_validacao !== "aprovado" && (
                    <button onClick={() => validar(p, "aprovado")} className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                      Aprovar
                    </button>
                  )}
                  {p.status_validacao !== "rejeitado" && (
                    <button onClick={() => validar(p, "rejeitado")} className="flex-1 h-10 rounded-xl bg-red-500/15 text-red-600 dark:text-red-300 text-sm font-semibold hover:bg-red-500/25">
                      Rejeitar
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {ampliada && (
        <button onClick={() => setAmpliada(null)} className="fixed inset-0 z-40 bg-black/80 grid place-items-center p-6" aria-label="Fechar">
          <img src={ampliada} alt="Selfie ampliada" className="max-h-[85vh] rounded-3xl" />
        </button>
      )}
    </>
  );
}

function Locais() {
  const [locais, setLocais] = useState<Local[] | null>(null);
  const [nome, setNome] = useState("");
  const [raio, setRaio] = useState("150");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "error" });

  const carregar = useCallback(() => {
    apiPonto<Local[]>("/pontos/locais")
      .then(setLocais)
      .catch((e) => {
        setAviso({ msg: e.message, type: "error" });
        setLocais([]);
      });
  }, []);
  useEffect(carregar, [carregar]);

  const cadastrar = async () => {
    if (!nome.trim()) return setAviso({ msg: "Informe o nome do local.", type: "error" });
    setSalvando(true);
    setAviso({ msg: "", type: "error" });
    try {
      const pos = await posicaoAtual();
      await apiPonto("/pontos/locais", {
        method: "POST",
        body: { nome: nome.trim(), latitude: pos.latitude, longitude: pos.longitude, raio_metros: Number(raio) || 150 },
      });
      setNome("");
      setAviso({ msg: "Local cadastrado com a sua posição atual.", type: "success" });
      carregar();
    } catch (e) {
      setAviso({ msg: (e as Error).message, type: "error" });
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (l: Local) => {
    if (!window.confirm(`Remover o local "${l.nome}"?`)) return;
    try {
      await apiPonto(`/pontos/locais/${l.id}`, { method: "DELETE" });
      carregar();
    } catch (e) {
      setAviso({ msg: (e as Error).message, type: "error" });
    }
  };

  const input = "w-full h-12 px-4 rounded-2xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr] items-start">
      <Card className={`${CARD} p-6 space-y-3`}>
        <h2 className="text-lg font-bold text-foreground">Novo local</h2>
        <p className="text-sm text-muted-foreground">Cadastre estando no local de trabalho: a posição atual deste dispositivo vira o centro do raio.</p>
        <Alert type={aviso.type} msg={aviso.msg} />
        <input className={input} placeholder="Nome (ex: Sede Paulista)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raio permitido (metros)</span>
          <input className={input} inputMode="numeric" value={raio} onChange={(e) => setRaio(e.target.value.replace(/\D/g, ""))} />
        </label>
        <button
          onClick={cadastrar}
          disabled={salvando}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60"
        >
          {salvando ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />} Cadastrar com minha localização
        </button>
      </Card>

      <div className="space-y-3">
        {locais === null ? (
          <div className="py-10 grid place-items-center text-muted-foreground"><Loader2 className="animate-spin" /></div>
        ) : locais.length === 0 ? (
          <Card className={`${CARD} p-10 text-center text-sm text-muted-foreground`}>Nenhum local cadastrado. Sem local, todo ponto vai para revisão.</Card>
        ) : (
          locais.map((l) => (
            <Card key={l.id} className={`${CARD} p-5 flex items-center gap-4`}>
              <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center text-primary"><MapPin size={20} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{l.nome}</p>
                <p className="text-xs text-muted-foreground">Raio de {l.raio_metros} m</p>
              </div>
              <a href={mapsUrl(l.latitude, l.longitude)} target="_blank" rel="noreferrer" aria-label="Ver no mapa" className="text-primary hover:opacity-80"><MapIcon size={19} /></a>
              <button onClick={() => remover(l)} aria-label="Remover local" className="text-red-500 hover:opacity-80"><Trash2 size={19} /></button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
