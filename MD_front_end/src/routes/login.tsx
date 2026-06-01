import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { API, TOKEN_KEY, PageShell, Card, Logo, Alert } from "@/components/minddesk";
import loginIllus from "@/assets/illus-login.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "error" | "success" }>({ msg: "", type: "error" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert({ msg: "", type: "error" });
    if (!email || !password) {
      setAlert({ msg: "Preencha e-mail e senha.", type: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ msg: data.error || "Credenciais inválidas.", type: "error" });
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      navigate({ to: "/manager" });
    } catch {
      setAlert({ msg: "Não foi possível conectar ao servidor.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="min-h-screen grid lg:grid-cols-2 gap-8 items-center px-6 lg:px-16 py-12">
        {/* Illustration */}
        <div className="hidden lg:flex items-center justify-center order-2 lg:order-1">
          <img
            src={loginIllus}
            alt="Acesse o painel da MindDesk"
            width={560}
            height={560}
            className="max-w-[520px] w-full drop-shadow-xl"
          />
        </div>

        {/* Card */}
        <div className="flex justify-center order-1 lg:order-2">
          <Card className="w-full max-w-[440px] p-10">
            <div className="mb-7">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground mb-6">Acesse sua conta MindDesk RH</p>

            {alert.msg && (
              <div className="mb-4">
                <Alert type={alert.type} msg={alert.msg} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="E-mail">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="md-input"
                  autoComplete="email"
                />
              </Field>
              <Field label="Senha">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="md-input"
                  autoComplete="current-password"
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all hover:-translate-y-0.5"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              Problemas com acesso?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Fale com o RH
              </Link>
            </p>
          </Card>
        </div>
      </div>

      {/* shared input style */}
      <style>{`
        .md-input {
          width: 100%;
          padding: 0.7rem 0.95rem;
          border: 1.5px solid var(--color-border);
          border-radius: 0.7rem;
          font-family: inherit;
          font-size: 0.92rem;
          background: var(--color-card);
          color: var(--color-foreground);
          transition: border-color .15s, box-shadow .15s;
        }
        .md-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px oklch(0.5 0.18 255 / 0.12);
        }
      `}</style>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
