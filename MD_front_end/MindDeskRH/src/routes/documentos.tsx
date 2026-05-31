import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  API,
  TENANT_ID,
  authHeaders,
  useRequireAuth,
  PageShell,
  Card,
  BackButton,
  Logo,
  Alert,
} from "@/components/minddesk";
import docsIllus from "@/assets/illus-docs.png";

export const Route = createFileRoute("/documentos")({
  component: DocumentosPage,
});

type Doc = {
  id: number;
  nome?: string;
  filename?: string;
  url?: string;
  created_at?: string;
};

type UsuarioAtribuido = {
  id: string;
  nome: string;
  cargo: string;
  concluido: boolean;
  concluido_em?: string;
};

type CursoAgrupado = {
  id: number;
  titulo: string;
  link: string;
  descricao?: string;
  prazo_dias?: number;
  created_at?: string;
  usuarios_atribuidos: UsuarioAtribuido[];
};

type Funcionario = {
  id: string;
  nome: string;
  cargo?: string;
};

type AlertState = { msg: string; type: "error" | "success" };

function DocumentosPage() {
  useRequireAuth("admin");

  const [tab, setTab] = useState<"docs" | "cursos">("docs");
  const [alert, setAlert] = useState<AlertState>({
    msg: "",
    type: "success",
  });

  const showAlert = (
    msg: string,
    type: AlertState["type"] = "success"
  ) => {
    setAlert({ msg, type });

    setTimeout(() => {
      setAlert({ msg: "", type: "success" });
    }, 4000);
  };

  return (
    <PageShell>
      <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <Logo />
            <BackButton />
          </div>

          <Card className="overflow-hidden border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl rounded-3xl">
            {/* Header */}
            <div className="relative overflow-hidden border-b border-border/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />

              <div className="relative p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm">
                  <img
                    src={docsIllus}
                    alt=""
                    loading="lazy"
                    className="w-10 sm:w-14 object-contain"
                  />
                </div>

                <div className="flex-1">
                  <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
                    Documentos & Cursos
                  </h1>

                  <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-2xl">
                    Gerencie arquivos, materials internos e conteúdos de
                    treinamento da equipe.
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="p-4 sm:p-6">
              <div className="flex gap-2 p-1.5 bg-secondary/70 rounded-2xl mb-5 border border-border/50">
                <TabBtn
                  active={tab === "docs"}
                  onClick={() => setTab("docs")}
                >
                  Documentos
                </TabBtn>

                <TabBtn
                  active={tab === "cursos"}
                  onClick={() => setTab("cursos")}
                >
                  Cursos
                </TabBtn>
              </div>

              {alert.msg && (
                <div className="mb-5">
                  <Alert type={alert.type} msg={alert.msg} />
                </div>
              )}

              {tab === "docs" && (
                <DocsTab showAlert={showAlert} />
              )}

              {tab === "cursos" && (
                <CursosTab showAlert={showAlert} />
              )}
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        .md-input {
          width: 100%;
          height: 48px;
          padding: 0 .95rem;
          border: 1px solid var(--color-border);
          border-radius: 1rem;
          background: var(--color-background);
          color: inherit;
          font-size: .92rem;
          transition: .2s ease;
        }

        .md-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px oklch(0.55 0.17 255 / 0.10);
        }
      `}</style>
    </PageShell>
  );
}

function DocsTab({
  showAlert,
}: {
  showAlert: (
    msg: string,
    type?: AlertState["type"]
  ) => void;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/pdfs?tenant_id=${TENANT_ID}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      showAlert("Erro ao carregar os documentos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      return showAlert("Apenas arquivos PDF são permitidos.", "error");
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("arquivo", file);
    formData.append("tenant_id", String(TENANT_ID));

    const headers = authHeaders() as Record<string, string>;
    delete headers["Content-Type"];

    try {
      const res = await fetch(`${API}/pdfs/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error();
      showAlert("Documento enviado com sucesso!", "success");
      fetchDocs();
    } catch {
      showAlert("Erro ao enviar documento.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (doc: Doc) => {
    if (!window.confirm(`Deseja remover "${doc.filename || doc.nome}"?`)) return;

    try {
      const res = await fetch(`${API}/pdfs/${doc.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showAlert("Documento removido com sucesso.", "success");
      fetchDocs();
    } catch {
      showAlert("Erro ao remover documento.", "error");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`rounded-3xl border-2 border-dashed transition-all p-7 sm:p-10 text-center ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
        }`}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-background border border-border flex items-center justify-center mb-4 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15.75V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18v-2.25M7.5 10.5L12 6m0 0l4.5 4.5M12 6v12" />
          </svg>
        </div>
        <h3 className="text-base font-semibold">{uploading ? "Enviando documento..." : "Enviar arquivo PDF"}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-5">Arraste um arquivo ou selecione manualmente.</p>
        {!uploading && (
          <label className="inline-flex items-center justify-center px-5 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition">
            Selecionar arquivo
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadFile(f); }} />
          </label>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Arquivos enviados</h3>
          <span className="text-xs text-muted-foreground">{docs.length} documento(s)</span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Carregando documentos...</div>
          ) : docs.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</div>
          ) : (
            docs.map((doc) => (
              <div key={doc.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375H14.25V5.625A3.375 3.375 0 0010.875 2.25H6.75A2.25 2.25 0 004.5 4.5v15A2.25 2.25 0 006.75 21.75h10.5A2.25 2.25 0 0019.5 19.5v-5.25z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{doc.filename || doc.nome || `Documento #${doc.id}`}</p>
                    {doc.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition flex items-center justify-center">Abrir</a>
                  )}
                  <button onClick={() => handleDeleteDoc(doc)} className="h-10 px-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition">Excluir</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CursosTab({
  showAlert,
}: {
  showAlert: (msg: string, type?: AlertState["type"]) => void;
}) {
  const [cursos, setCursos] = useState<CursoAgrupado[]>([]);
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    titulo: "",
    link: "",
    descricao: "",
    prazo_dias: "",
  });

  const [courseFile, setCourseFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"link" | "pdf">("link");
  const [sending, setSending] = useState(false);
  const [cursoAtribuindo, setCursoAtribuindo] = useState<number | null>(null);
  const [funcionariosSelecionados, setFuncionariosSelecionados] = useState<string[]>([]);

  useEffect(() => {
    fetchCursos();
    fetchFuncionarios();
  }, []);

  const fetchCursos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/cursos/todos?tenant_id=${TENANT_ID}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      const agrupados: Record<string, CursoAgrupado> = {};

      data.forEach((c: any) => {
        const key = c.link;
        if (!agrupados[key]) {
          agrupados[key] = {
            id: c.id,
            titulo: c.titulo,
            link: c.link,
            descricao: c.descricao,
            prazo_dias: c.prazo_dias,
            created_at: c.created_at,
            usuarios_atribuidos: [],
          };
        }

        if (c.usuarios) {
          agrupados[key].usuarios_atribuidos.push({
            id: c.usuario_id,
            nome: c.usuarios.nome,
            cargo: c.usuarios.cargo || "Não informado",
            concluido: !!c.concluido,
            concluido_em: c.concluido_em,
          });
        }
      });

      setCursos(Object.values(agrupados));
    } catch {
      showAlert("Erro ao carregar cursos.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFuncionarios = async () => {
    try {
      const res = await fetch(`${API}/usuarios?tenant_id=${TENANT_ID}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setFuncionarios(Array.isArray(data) ? data : []);
      }
    } catch {}
  };

  const uploadPdfToStorage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("arquivo", file);
    formData.append("tenant_id", String(TENANT_ID));
    const headers = authHeaders() as Record<string, string>;
    delete headers["Content-Type"];

    const res = await fetch(`${API}/pdfs/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.url;
  };

  const handleCriarCurso = async () => {
    if (!form.titulo) return showAlert("Preencha o nome do curso.", "error");
    if (uploadMode === "link" && !form.link) return showAlert("Insira um link.", "error");
    if (uploadMode === "pdf" && !courseFile) return showAlert("Selecione um PDF.", "error");

    setSending(true);
    try {
      let finalLink = form.link;
      if (uploadMode === "pdf" && courseFile) {
        finalLink = await uploadPdfToStorage(courseFile);
      }

      const res = await fetch(`${API}/cursos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          usuarios_ids: [],
          titulo: form.titulo,
          link: finalLink,
          descricao: form.descricao || null,
          prazo_dias: form.prazo_dias
            ? Number(form.prazo_dias)
            : null,
        }),
      });

      if (!res.ok) throw new Error();

      showAlert("Curso adicionado.", "success");
      setForm({ titulo: "", link: "", descricao: "", prazo_dias: "" });
      setCourseFile(null);
      fetchCursos();
    } catch {
      showAlert("Erro ao cadastrar curso.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleAtribuirCurso = async (curso: CursoAgrupado) => {
    if (funcionariosSelecionados.length === 0) {
      return showAlert("Selecione funcionários.", "error");
    }

    try {
      const res = await fetch(`${API}/cursos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          usuarios_ids: funcionariosSelecionados,
          titulo: curso.titulo,
          link: curso.link,
          descricao: curso.descricao || null,
          prazo_dias: curso.prazo_dias || null,
        }),
      });

      if (!res.ok) throw new Error();

      showAlert("Curso compartilhado.", "success");
      setCursoAtribuindo(null);
      setFuncionariosSelecionados([]);
      fetchCursos();
    } catch {
      showAlert("Erro ao compartilhar.", "error");
    }
  };

  const handleRemoverUsuarioDoCurso = async (cursoId: number, usuarioId: string, usuarioNome: string) => {
    if (!window.confirm(`Deseja remover o acesso de ${usuarioNome} deste curso?`)) return;

    try {
      const res = await fetch(`${API}/cursos/${cursoId}/usuarios/${usuarioId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error();

      showAlert("Colaborador removido do curso.", "success");
      fetchCursos();
    } catch {
      showAlert("Erro ao remover colaborador do curso.", "error");
    }
  };

  const handleDelete = async (curso: CursoAgrupado) => {
    if (!window.confirm(`Deseja excluir "${curso.titulo}"?`)) return;

    try {
      const res = await fetch(`${API}/cursos/${curso.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      showAlert("Curso removido.", "success");
      fetchCursos();
    } catch {
      showAlert("Erro ao remover curso.", "error");
    }
  };

  const toggleFuncionarioSelecao = (id: string) => {
    setFuncionariosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const funcionariosFiltrados = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Formulário Novo Curso */}
      <div className="rounded-3xl border border-border bg-secondary/30 p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-5">Novo curso</h2>

        <div className="space-y-4">
          <input
            className="md-input"
            placeholder="Nome do curso"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />

          <input
            className="md-input"
            placeholder="Descrição"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1 ml-1">
              Prazo para conclusão (dias corridos)
            </label>

            <input
              type="number"
              min="1"
              className="md-input"
              placeholder="Ex: 30"
              value={form.prazo_dias}
              onChange={(e) =>
                setForm({ ...form, prazo_dias: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2 rounded-2xl bg-background border border-border p-1">
            <button
              onClick={() => setUploadMode("link")}
              className={`flex-1 h-11 rounded-xl text-sm font-medium transition ${
                uploadMode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              Link
            </button>
            <button
              onClick={() => setUploadMode("pdf")}
              className={`flex-1 h-11 rounded-xl text-sm font-medium transition ${
                uploadMode === "pdf" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              PDF
            </button>
          </div>

          {uploadMode === "link" ? (
            <input
              className="md-input"
              placeholder="URL do curso"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
          ) : (
            <div className="p-3 border border-border rounded-xl bg-background">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setCourseFile(f);
                }}
              />
            </div>
          )}

          <button
            onClick={handleCriarCurso}
            disabled={sending || !form.titulo}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
          >
            {sending ? "Salvando..." : "Salvar curso"}
          </button>
        </div>
      </div>

      {/* Lista de Cursos Cadastrados */}
      <div className="space-y-4">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Carregando cursos...
          </div>
        )}

        {!loading &&
          cursos.map((c) => (
            <div key={c.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <a
                    href={c.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base sm:text-lg font-bold hover:text-primary transition"
                  >
                    {c.titulo}
                  </a>

                  {c.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{c.descricao}</p>
                  )}

                  {c.prazo_dias && (
                    <p className="text-xs text-primary font-medium mt-2">
                      Prazo: {c.prazo_dias} dias corridos
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(c)}
                  className="px-3 h-10 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition"
                >
                  Excluir
                </button>
              </div>

              {/* Seção de usuários vinculados */}
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Colaboradores com acesso e Status:
                </label>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {c.usuarios_atribuidos.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Nenhum colaborador vinculado.</span>
                  ) : (
                    c.usuarios_atribuidos.map((u, i) => (
                      <div
                        key={i}
                        className={`inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium border ${
                          u.concluido 
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                            : "bg-primary/10 text-primary border-primary/20"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{u.nome} <span className="opacity-60">({u.cargo})</span></span>
                          {u.concluido && (
                            <span className="text-[10px] text-emerald-600/80 font-semibold">
                              ✓ Concluído em {new Date(u.concluido_em!).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoverUsuarioDoCurso(c.id, u.id, u.nome)}
                          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-foreground/10 transition text-muted-foreground hover:text-foreground"
                          title="Remover acesso"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    setCursoAtribuindo(cursoAtribuindo === c.id ? null : c.id);
                    setFuncionariosSelecionados([]);
                    setSearchTerm("");
                  }}
                  className="h-10 px-4 rounded-xl border border-border bg-card text-sm font-medium hover:border-primary/40 hover:text-primary transition"
                >
                  {cursoAtribuindo === c.id ? "Cancelar" : "Gerenciar Acessos"}
                </button>

                {/* Painel Melhorado de escolha de Funcionários */}
                {cursoAtribuindo === c.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <input
                      type="text"
                      placeholder="Pesquisar funcionário..."
                      className="md-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="max-h-48 overflow-y-auto border border-border rounded-xl bg-background p-2 space-y-1">
                      {funcionariosFiltrados.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2 text-center">Nenhum funcionário encontrado.</p>
                      ) : (
                        funcionariosFiltrados.map((f) => {
                          const jaTemAcesso = c.usuarios_atribuidos.some((ua) => ua.id === f.id);
                          return (
                            <label
                              key={f.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition ${
                                jaTemAcesso ? "opacity-40 bg-secondary/20" : "hover:bg-secondary/60"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  disabled={jaTemAcesso}
                                  checked={funcionariosSelecionados.includes(f.id) || jaTemAcesso}
                                  onChange={() => toggleFuncionarioSelecao(f.id)}
                                  className="rounded text-primary focus:ring-primary w-4 h-4"
                                />
                                <span className="font-medium">{f.nome} <span className="text-xs text-muted-foreground">({f.cargo})</span></span>
                              </div>
                              {jaTemAcesso && <span className="text-[11px] text-muted-foreground italic font-medium">Já tem acesso</span>}
                            </label>
                          );
                        })
                      )}
                    </div>

                    <button
                      onClick={() => handleAtribuirCurso(c)}
                      disabled={funcionariosSelecionados.length === 0}
                      className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition disabled:opacity-50"
                    >
                      Conceder acesso para os ({funcionariosSelecionados.length}) selecionados
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all ${
        active ? "bg-card text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}