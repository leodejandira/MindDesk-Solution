import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { api, appendFile, type LocalFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateBR, groupCursos, matches, prazoLimite, type Curso } from "@/lib/logic";
import { pickPdf } from "@/lib/pick";
import { useTheme } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";
import { Badge, Button, Card, Empty, Icon, Input, Loading, Notice, Row, Segmented, T, confirm } from "./ui";

// Telas "Meus Cursos" (funcionário) e "Documentos & Cursos" (gerente) reaproveitam estes blocos.

export type Flash = (msg: string, type?: "error" | "success") => void;

const abrir = (url?: string) => url && Linking.openURL(url);

async function uploadPdf(file: LocalFile, tenant?: number): Promise<string> {
  const form = new FormData();
  appendFile(form, "arquivo", file);
  form.append("tenant_id", String(tenant ?? ""));
  return (await api<{ url: string }>("/pdfs/upload", { method: "POST", body: form })).url;
}

// ================= Funcionário: Meus Cursos =================
export function MeusCursos({ flash }: { flash: Flash }) {
  const { data, loading, reload } = useLoad(async () => groupCursos(await api("/cursos")));

  const concluir = async (c: Curso) => {
    try {
      await api(`/cursos/${c.id}/concluir`, { method: "POST" });
      flash("Parabéns! Curso marcado como concluído.");
      reload();
    } catch {
      flash("Erro ao tentar concluir o curso. Tente novamente.", "error");
    }
  };

  if (loading && !data) return <Loading />;
  if (!data?.length) return <Card><Empty text="Nenhum curso disponível no momento." /></Card>;
  return (
    <>
      {data.map((c) => {
        const limite = prazoLimite(c.created_at, c.prazo_dias);
        return (
          <Card key={c.id}>
            <Row style={{ justifyContent: "space-between" }}>
              <T bold size={16} style={{ flex: 1 }}>{c.titulo}</T>
              {c.concluido && <Badge label="CONCLUÍDO" tone="green" />}
            </Row>
            {!!c.descricao && <T muted size={14}>{c.descricao}</T>}
            {limite && <T size={12} color="#DC2626">Limite: {formatDateBR(limite)}</T>}
            <Button title="Acessar curso" variant="ghost" icon="open-outline" onPress={() => abrir(c.link)} />
            {c.concluido ? (
              <Button title="Concluído" variant="outline" icon="checkmark" disabled onPress={() => {}} />
            ) : (
              <Button title="Marcar como concluído" variant="success" icon="checkmark" onPress={() => concluir(c)} />
            )}
          </Card>
        );
      })}
    </>
  );
}

// ================= Gerente: Documentos (PDFs) =================
export function DocsAdmin({ flash }: { flash: Flash }) {
  const { user } = useAuth();
  const { c } = useTheme();
  const [uploading, setUploading] = useState(false);
  const docs = useLoad(async () => {
    const d = await api<any[]>(`/pdfs?tenant_id=${user?.tenant_id}`);
    return Array.isArray(d) ? d : [];
  });

  const enviar = async () => {
    const file = await pickPdf();
    if (!file) return;
    if (file.mimeType && file.mimeType !== "application/pdf") return flash("Apenas arquivos PDF são permitidos.", "error");
    setUploading(true);
    try {
      await uploadPdf(file, user?.tenant_id);
      flash("Documento enviado com sucesso!");
      docs.reload();
    } catch {
      flash("Erro ao enviar documento.", "error");
    } finally {
      setUploading(false);
    }
  };

  const excluir = async (d: any) => {
    if (!(await confirm(`Deseja remover "${d.filename || d.nome}"?`))) return;
    try {
      await api(`/pdfs/${d.id}`, { method: "DELETE" });
      flash("Documento removido com sucesso.");
      docs.reload();
    } catch {
      flash("Erro ao remover documento.", "error");
    }
  };

  return (
    <>
      <Card style={{ alignItems: "center", borderStyle: "dashed", borderWidth: 2 }}>
        <Icon name="cloud-upload-outline" size={32} color={c.primary} />
        <T bold>{uploading ? "Enviando documento..." : "Enviar arquivo PDF"}</T>
        <Button title="Selecionar arquivo" onPress={enviar} loading={uploading} />
      </Card>
      <Row style={{ justifyContent: "space-between" }}>
        <T bold>Arquivos enviados</T>
        <T muted size={12}>{docs.data?.length ?? 0} documento(s)</T>
      </Row>
      {docs.loading && !docs.data ? (
        <Loading />
      ) : !docs.data?.length ? (
        <Card><Empty text="Nenhum documento encontrado." /></Card>
      ) : (
        docs.data.map((d) => (
          <Card key={d.id}>
            <Row>
              <Icon name="document-text-outline" size={24} color={c.primary} />
              <View style={{ flex: 1 }}>
                <T bold lines={1}>{d.filename || d.nome || `Documento #${d.id}`}</T>
                {d.created_at && <T muted size={12}>{formatDateBR(d.created_at)}</T>}
              </View>
            </Row>
            <Row>
              {d.url && <Button small title="Abrir" variant="outline" onPress={() => abrir(d.url)} style={{ flex: 1 }} />}
              <Button small title="Excluir" variant="danger" onPress={() => excluir(d)} style={{ flex: 1 }} />
            </Row>
          </Card>
        ))
      )}
    </>
  );
}

// ================= Gerente: Cursos =================
const FORM0 = { titulo: "", descricao: "", prazo_dias: "", link: "" };

export function CursosAdmin({ flash }: { flash: Flash }) {
  const { user } = useAuth();
  const [form, setForm] = useState(FORM0);
  const [modo, setModo] = useState<"link" | "pdf">("link");
  const [file, setFile] = useState<LocalFile | null>(null);
  const [sending, setSending] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);

  const cursos = useLoad(async () => groupCursos(await api(`/cursos/todos?tenant_id=${user?.tenant_id}`)));
  const funcs = useLoad(async () => {
    const d = await api<any[]>(`/usuarios?tenant_id=${user?.tenant_id}`);
    return Array.isArray(d) ? d : [];
  });

  const salvar = async () => {
    if (!form.titulo) return flash("Preencha o nome do curso.", "error");
    if (modo === "link" && !form.link) return flash("Insira um link.", "error");
    if (modo === "pdf" && !file) return flash("Selecione um PDF.", "error");
    setSending(true);
    try {
      const link = modo === "pdf" && file ? await uploadPdf(file, user?.tenant_id) : form.link;
      await api("/cursos", {
        method: "POST",
        body: {
          usuarios_ids: [],
          titulo: form.titulo,
          link,
          descricao: form.descricao || null,
          prazo_dias: form.prazo_dias ? Number(form.prazo_dias) : null,
        },
      });
      flash("Curso adicionado.");
      setForm(FORM0);
      setFile(null);
      cursos.reload();
    } catch {
      flash("Erro ao cadastrar curso.", "error");
    } finally {
      setSending(false);
    }
  };

  const excluir = async (c: Curso) => {
    if (!(await confirm(`Deseja excluir "${c.titulo}"?`))) return;
    try {
      await api(`/cursos/${c.id}`, { method: "DELETE" });
      flash("Curso removido.");
      cursos.reload();
    } catch {
      flash("Erro ao remover curso.", "error");
    }
  };

  const removerUsuario = async (c: Curso, uid: string, nome: string) => {
    if (!(await confirm(`Deseja remover o acesso de ${nome} deste curso?`))) return;
    try {
      await api(`/cursos/${c.id}/usuarios/${uid}`, { method: "DELETE" });
      flash("Colaborador removido do curso.");
      cursos.reload();
    } catch {
      flash("Erro ao remover colaborador do curso.", "error");
    }
  };

  return (
    <>
      <Card>
        <T bold size={17}>Novo curso</T>
        <Input placeholder="Nome do curso" value={form.titulo} onChangeText={(v) => setForm({ ...form, titulo: v })} />
        <Input placeholder="Descrição" value={form.descricao} onChangeText={(v) => setForm({ ...form, descricao: v })} />
        <Input label="Prazo para conclusão (dias corridos)" placeholder="Ex: 30" keyboardType="number-pad" value={form.prazo_dias} onChangeText={(v) => setForm({ ...form, prazo_dias: v.replace(/\D/g, "") })} />
        <Segmented options={[{ key: "link", label: "Link" }, { key: "pdf", label: "PDF" }]} value={modo} onChange={setModo} />
        {modo === "link" ? (
          <Input placeholder="URL do curso" autoCapitalize="none" keyboardType="url" value={form.link} onChangeText={(v) => setForm({ ...form, link: v })} />
        ) : (
          <Button variant="outline" icon="document-attach-outline" title={file ? file.name : "Selecionar PDF"} onPress={async () => setFile(await pickPdf())} />
        )}
        <Button title={sending ? "Salvando..." : "Salvar curso"} onPress={salvar} loading={sending} disabled={!form.titulo} />
      </Card>

      {cursos.loading && !cursos.data ? (
        <Loading />
      ) : !cursos.data?.length ? (
        <Card><Empty text="Nenhum curso cadastrado." /></Card>
      ) : (
        cursos.data.map((c) => (
          <Card key={c.id}>
            <Pressable onPress={() => abrir(c.link)}>
              <T bold size={16}>{c.titulo}</T>
            </Pressable>
            {!!c.descricao && <T muted size={14}>{c.descricao}</T>}
            {!!c.prazo_dias && <T size={12} bold>Prazo: {c.prazo_dias} dias corridos</T>}

            <T muted bold size={11}>COLABORADORES COM ACESSO E STATUS</T>
            {c.usuarios_atribuidos.length === 0 ? (
              <T muted size={13}>Nenhum colaborador vinculado.</T>
            ) : (
              c.usuarios_atribuidos.map((u, i) => (
                <Row key={i} style={{ justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <T size={14}>{u.nome} <T muted size={12}>({u.cargo})</T></T>
                    {u.concluido && <T size={11} color="#15803D">✓ Concluído{u.concluido_em ? ` em ${formatDateBR(u.concluido_em)}` : ""}</T>}
                  </View>
                  <Pressable hitSlop={10} onPress={() => removerUsuario(c, u.id, u.nome)} accessibilityLabel="Remover acesso">
                    <Icon name="close-circle-outline" size={20} color="#DC2626" />
                  </Pressable>
                </Row>
              ))
            )}
            <Row>
              <Button small style={{ flex: 1 }} variant="outline" title={aberto === c.id ? "Cancelar" : "Gerenciar acessos"} onPress={() => setAberto(aberto === c.id ? null : c.id)} />
              <Button small style={{ flex: 1 }} variant="danger" title="Excluir" onPress={() => excluir(c)} />
            </Row>
            {aberto === c.id && (
              <Atribuir
                curso={c}
                funcionarios={funcs.data ?? []}
                onDone={() => {
                  setAberto(null);
                  cursos.reload();
                }}
                flash={flash}
              />
            )}
          </Card>
        ))
      )}
    </>
  );
}

function Atribuir({ curso, funcionarios, onDone, flash }: { curso: Curso; funcionarios: any[]; onDone: () => void; flash: Flash }) {
  const { c } = useTheme();
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const conceder = async () => {
    if (!sel.length) return flash("Selecione funcionários.", "error");
    try {
      await api("/cursos", {
        method: "POST",
        body: { usuarios_ids: sel, titulo: curso.titulo, link: curso.link, descricao: curso.descricao || null, prazo_dias: curso.prazo_dias || null },
      });
      flash("Curso compartilhado.");
      onDone();
    } catch {
      flash("Erro ao compartilhar.", "error");
    }
  };

  const lista = funcionarios.filter((f) => matches(busca, f.nome));
  return (
    <View style={{ gap: 8, borderTopWidth: 1, borderColor: c.border, paddingTop: 10 }}>
      <Input placeholder="Pesquisar funcionário..." value={busca} onChangeText={setBusca} />
      {lista.length === 0 && <T muted size={12}>Nenhum funcionário encontrado.</T>}
      {lista.map((f) => {
        const jaTem = curso.usuarios_atribuidos.some((u) => u.id === f.id);
        const on = jaTem || sel.includes(f.id);
        return (
          <Pressable key={f.id} disabled={jaTem} onPress={() => toggle(f.id)} style={{ opacity: jaTem ? 0.45 : 1 }}>
            <Row>
              <Icon name={on ? "checkbox" : "square-outline"} size={22} color={c.primary} />
              <T size={14} style={{ flex: 1 }}>{f.nome} <T muted size={12}>({f.cargo})</T></T>
              {jaTem && <T muted size={11}>Já tem acesso</T>}
            </Row>
          </Pressable>
        );
      })}
      <Button title={`Conceder acesso (${sel.length})`} onPress={conceder} disabled={!sel.length} />
    </View>
  );
}

/** Mensagem temporária (4s), igual ao showAlert da web. */
export function useFlash() {
  const [alert, setAlert] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "success" });
  const flash: Flash = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert({ msg: "", type: "success" }), 4000);
  };
  return { flash, notice: <Notice msg={alert.msg} type={alert.type} /> };
}
