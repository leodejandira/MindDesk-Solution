import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  API,
  authHeaders,
  getToken,
  PageShell,
  BackButton,
  Logo,
  Alert,
} from "@/components/minddesk";

import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  Mail,
  Briefcase,
  Crown,
  X,
} from "lucide-react";

import funcionariosIllus from "@/assets/illus-funcionarios.png";

export const Route = createFileRoute("/funcionarios")({
  component: FuncionariosPage,
});

type Func = {
  id: number;
  nome: string;
  email: string;
  cargo: string;
  nivel: string;
};

function FuncionariosPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) navigate({ to: "/login" });
  }, [navigate]);

  const [list, setList] = useState<Func[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Func | null>(null);

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    confirmarSenha: "",
    cargo: "",
    nivel: "Funcionário",
  });

  const [alert, setAlert] = useState<{
    msg: string;
    type: "error" | "success";
  }>({
    msg: "",
    type: "error",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API}/usuarios`, {
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      setList(
        (data || []).map((f: any) => ({
          id: f.id,
          nome: f.nome || "",
          email: f.email || "",
          cargo: f.cargo || "Não informado",
          nivel:
            f.role === "admin"
              ? "Gerente"
              : "Funcionário",
        }))
      );
    } catch {
      setAlert({
        msg: "Não foi possível carregar a lista.",
        type: "error",
      });
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return list.filter((f) => {
      return (
        f.nome.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        f.cargo.toLowerCase().includes(q)
      );
    });
  }, [list, search]);

  const totalFuncionarios = list.length;

  const totalGerentes = list.filter(
    (f) => f.nivel === "Gerente"
  ).length;

  const totalFuncionariosComuns =
    totalFuncionarios - totalGerentes;

  const openNovo = () => {
    setEditing(null);

    setForm({
      nome: "",
      email: "",
      password: "",
      confirmarSenha: "",
      cargo: "",
      nivel: "Funcionário",
    });

    setAlert({
      msg: "",
      type: "error",
    });

    setShowModal(true);
  };

  const openEdit = (f: Func) => {
    setEditing(f);

    setForm({
      nome: f.nome || "",
      email: f.email || "",
      password: "",
      confirmarSenha: "",
      cargo: f.cargo || "",
      nivel: f.nivel || "Funcionário",
    });

    setAlert({
      msg: "",
      type: "error",
    });

    setShowModal(true);
  };

  const handleSave = async () => {
    if (loading) return;

    setLoading(true);

    setAlert({
      msg: "",
      type: "error",
    });

    try {
      const nome = form.nome.trim();
      const email = form.email.trim().toLowerCase();
      const cargo = form.cargo.trim();

      const role =
        form.nivel === "Gerente"
          ? "admin"
          : "viewer";

      if (!nome || !email || !cargo) {
        return setAlert({
          msg: "Nome, e-mail e cargo são obrigatórios.",
          type: "error",
        });
      }

      if (nome.length < 3) {
        return setAlert({
          msg: "O nome deve possuir ao menos 3 caracteres.",
          type: "error",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return setAlert({
          msg: "Digite um e-mail válido.",
          type: "error",
        });
      }

      if (cargo.length < 2) {
        return setAlert({
          msg: "Cargo inválido.",
          type: "error",
        });
      }

      if (!editing) {
        if (!form.password) {
          return setAlert({
            msg: "Senha é obrigatória.",
            type: "error",
          });
        }

        if (form.password.length < 6) {
          return setAlert({
            msg: "A senha deve possuir no mínimo 6 caracteres.",
            type: "error",
          });
        }

        if (form.password !== form.confirmarSenha) {
          return setAlert({
            msg: "As senhas não coincidem.",
            type: "error",
          });
        }
      }

      let res: Response;

      if (editing) {
        const payload: any = {
          nome,
          cargo,
        };

        if (email !== editing.email) {
          payload.novoEmail = email;
        }

        res = await fetch(
          `${API}/usuarios?email=${encodeURIComponent(
            editing.email
          )}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(`${API}/usuarios/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            nome,
            email,
            password: form.password,
            cargo,
            role,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return setAlert({
          msg:
            data?.erro ||
            data?.detalhe ||
            "Erro ao salvar funcionário.",
          type: "error",
        });
      }

      setAlert({
        msg: editing
          ? "Funcionário atualizado com sucesso."
          : "Funcionário criado com sucesso.",
        type: "success",
      });

      setShowModal(false);

      fetchAll();
    } catch {
      setAlert({
        msg: "Erro de conexão com o servidor.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (f: Func) => {
    if (!window.confirm(`Excluir ${f.nome}?`)) return;

    try {
      const res = await fetch(
        `${API}/usuarios?email=${encodeURIComponent(
          f.email
        )}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return setAlert({
          msg:
            data?.erro ||
            "Erro ao excluir funcionário.",
          type: "error",
        });
      }

      fetchAll();
    } catch {
      setAlert({
        msg: "Erro de conexão.",
        type: "error",
      });
    }
  };

  return (
    <PageShell>
      <div className="min-h-screen px-4 sm:px-6 py-6 sm:py-8 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_35%)]">
        <div className="max-w-7xl mx-auto">
          <header className="flex items-center justify-between mb-8">
            <Logo />
            <BackButton />
          </header>

          {/* FIX: Removido o overflow-hidden para evitar o corte do card branco se ele vazar propositalmente, ou ajustado o container */}
          <div className="relative rounded-[36px] border border-black/5 dark:border-white/10 bg-gradient-to-br from-[#0f172a] via-[#132554] to-[#0b1220] p-6 sm:p-8 lg:p-10 mb-8 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                  Funcionários
                </h1>

                <p className="mt-4 text-sm sm:text-lg text-white/70 leading-relaxed max-w-xl">
                  Gerencie usuários, cargos e
                  permissões da sua equipe com uma
                  experiência moderna e organizada.
                </p>

                <button
                  onClick={openNovo}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#0f172a] font-semibold shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <Plus size={18} />
                  Novo funcionário
                </button>
              </div>

              <div className="hidden md:flex items-center justify-center flex-1 relative z-20">
                <img
                  src={funcionariosIllus}
                  alt="Funcionários"
                  className="w-56 lg:w-72 xl:w-80 h-auto object-contain drop-shadow-[0_20px_50px_rgba(59,130,246,0.35)]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 sm:p-5 shadow-sm mb-6">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou cargo..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full h-14 pl-12 pr-12 rounded-2xl border border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {search && (
              <p className="text-sm text-zinc-500 dark:text-white/50 mt-4">
                {filtered.length} resultado
                {filtered.length !== 1 ? "s" : ""} encontrado
                {filtered.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {alert.msg && !showModal && (
            <div className="mb-6">
              <Alert
                type={alert.type}
                msg={alert.msg}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full rounded-[30px] border border-dashed border-black/10 dark:border-white/10 py-20 text-center bg-white dark:bg-white/[0.03]">
                <Users
                  size={42}
                  className="mx-auto mb-4 text-zinc-400"
                />

                <p className="text-zinc-500 dark:text-white/50">
                  {search
                    ? "Nenhum funcionário encontrado."
                    : "Nenhum funcionário cadastrado."}
                </p>
              </div>
            )}

            {filtered.map((f) => (
              <div
                key={f.id}
                className="group relative overflow-hidden rounded-[30px] border border-black/5 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />

                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center text-xl font-bold shadow-lg shrink-0">
                    {f.nome.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold truncate text-zinc-900 dark:text-white">
                          {f.nome}
                        </h3>

                        <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-white/50 truncate">
                          <Mail size={14} />
                          {f.email}
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-sm text-zinc-500 dark:text-white/50">
                          <Briefcase size={14} />
                          {f.cargo}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                          f.nivel === "Gerente"
                            ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {f.nivel}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => openEdit(f)}
                        className="flex-1 h-11 rounded-2xl border border-primary/20 bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(f)}
                        className="flex-1 h-11 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={15} />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-5"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full md:max-w-xl max-h-[95vh] overflow-y-auto rounded-t-[34px] md:rounded-[34px] border border-black/5 dark:border-white/10 bg-white dark:bg-[#0f1115] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-20 px-5 sm:px-6 py-5 border-b border-black/5 dark:border-white/10 bg-white/90 dark:bg-[#0f1115]/90 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {editing
                      ? "Editar funcionário"
                      : "Novo funcionário"}
                  </h2>

                  <p className="text-sm text-zinc-500 dark:text-white/50 mt-1">
                    Preencha os dados abaixo
                  </p>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-11 h-11 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-white/70"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {alert.msg && (
                <div className="mb-4">
                  <Alert
                    type={alert.type}
                    msg={alert.msg}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <input
                  className="md-input"
                  placeholder="Nome completo"
                  value={form.nome}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nome: e.target.value,
                    })
                  }
                />

                <input
                  className="md-input"
                  type="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />

                <input
                  className="md-input"
                  placeholder="Cargo"
                  value={form.cargo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cargo: e.target.value,
                    })
                  }
                />

                {!editing && (
                  <>
                    <input
                      className="md-input"
                      type="password"
                      placeholder="Senha"
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                    />

                    <input
                      className="md-input"
                      type="password"
                      placeholder="Confirmar senha"
                      value={form.confirmarSenha}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          confirmarSenha:
                            e.target.value,
                        })
                      }
                    />
                  </>
                )}

                {/* FIX: Adicionada a classe customizada 'md-select' para tratar o bug visual do Dropdown */}
                <div className="relative">
                  <select
                    className="md-input md-select"
                    value={form.nivel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nivel: e.target.value,
                      })
                    }
                  >
                    <option value="Funcionário">Funcionário</option>
                    <option value="Gerente">Gerente</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl border border-black/5 dark:border-white/10 font-medium text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.05] transition-all"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 h-12 rounded-2xl bg-primary text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .md-input {
          width: 100%;
          height: 56px;
          padding: 0 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(0,0,0,0.06);
          background: rgba(255,255,255,0.9);
          color: #18181b;
          font-size: .95rem;
          transition: .2s ease;
        }

        .dark .md-input {
          background: rgba(15, 17, 21, 0.9);
          border-color: rgba(255,255,255,0.08);
          color: white;
        }

        .md-input::placeholder {
          color: #a1a1aa;
        }

        .md-input:focus {
          outline: none;
          border-color: rgb(var(--color-primary));
          box-shadow: 0 0 0 4px rgba(59,130,246,.12);
        }

        /* FIX: Força estilização correta dos options nos navegadores e retira bg branco nativo */
        .md-select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1.2em;
          padding-right: 2.5rem;
        }

        .md-select option {
          background: #ffffff;
          color: #18181b;
        }

        .dark .md-select option {
          background: #15181e;
          color: #ffffff;
        }
      `}</style>
    </PageShell>
  );
}

export default FuncionariosPage;