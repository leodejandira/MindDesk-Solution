import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import {
  API,
  TENANT_ID,
  authHeaders,
  getToken,
  PageShell,
  Card,
} from "@/components/minddesk";

import {
  ArrowLeft,
  Plus,
  SendHorizonal,
  Paperclip,
} from "lucide-react";

import chatIllus from "@/assets/illus-chat.png";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

type Msg = {
  id: number;
  type: "ai" | "user";
  text: string;
};

interface UserSessionData {
  id: string;
  role?: string;
  cargo?: string;
}

function ChatPage() {
  const navigate = useNavigate();

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      type: "ai",
      text: "Olá! Sou o assistente virtual da MindDesk. Como posso ajudar com dúvidas de RH hoje?",
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const getLoggedUserId = (): string => {
    try {
      const session = localStorage.getItem("user_session");
      if (session) {
        const user = JSON.parse(session) as UserSessionData;
        return user.id;
      }
    } catch (e) {
      console.error("Erro ao obter ID do usuário", e);
    }
    return "usuario-logado-id";
  };

  const renderText = (text: string) => {
    return text.split("\n").map((line, lineIdx, linesArr) => {
      const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return (
        <span key={lineIdx}>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith("*") && part.endsWith("*")) {
              return <em key={i}>{part.slice(1, -1)}</em>;
            }
            return <span key={i}>{part}</span>;
          })}
          {lineIdx < linesArr.length - 1 && <br />}
        </span>
      );
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Msg = {
      id: Date.now(),
      type: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/chat/perguntar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          query: userMsg.text,
          tenant_id: TENANT_ID,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "ai",
          text: data.answer || "Não foi possível gerar uma resposta.",
        },
      ]);
    } catch {
      showErrorAlert();
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isTyping) return;

    const userMsg: Msg = {
      id: Date.now(),
      type: "user",
      text: `Enviando documento: ${file.name}`,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenant_id", String(TENANT_ID));
    formData.append("usuario_id", getLoggedUserId());
    formData.append("data_emissao", new Date().toISOString().split("T")[0]);
    formData.append("dias_afastamento", "1");
    formData.append("motivo_cid", input.trim() || "Enviado via Chat de IA");

    setInput("");

    try {
      // 1. Faz o upload e pega a URL
      const uploadRes = await fetch(`${API}/atestados/upload`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || "Erro no upload");
      }

      const uploadData = await uploadRes.json();
      const urlAtestado = uploadData.url;

      // 2. Manda a URL internamente pro orquestrador (usuário não vê isso)
      const chatRes = await fetch(`${API}/chat/perguntar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          query: `Analise este atestado medico: ${urlAtestado}`,
          tenant_id: TENANT_ID,
        }),
      });

      if (!chatRes.ok) throw new Error("Erro ao analisar atestado");

      const chatData = await chatRes.json();

      // 3. Só mostra a resposta da IA pro usuário
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "ai",
          text: chatData.answer || "Atestado recebido e enviado para analise!",
        },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "ai",
          text: `Falha ao processar atestado: ${error.message || "Tente novamente."}`,
        },
      ]);
    } finally {
      setIsTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const showErrorAlert = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: "ai",
        text: "Desculpe, ocorreu um erro. Tente novamente.",
      },
    ]);
  };

  const handleNewChat = () => {
    if (window.confirm("Iniciar uma nova conversa?")) {
      setMessages([
        {
          id: Date.now(),
          type: "ai",
          text: "Olá! Sou o assistente virtual da MindDesk. Como posso ajudar com dúvidas de RH hoje?",
        },
      ]);
    }
  };

  return (
    <PageShell>
      <div
        className="
          min-h-screen
          grid place-items-center
          p-3 sm:p-4 md:p-6
          bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_35%)]
          dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_35%)]
        "
      >
        <Card
          className="
            w-full
            max-w-[980px]
            h-[calc(100vh-1.5rem)]
            md:h-[calc(100vh-3rem)]
            max-h-[920px]
            flex flex-col
            overflow-hidden
            rounded-[32px]
            border border-black/5
            dark:border-white/10
            bg-white/90
            dark:bg-[#0f1115]/90
            backdrop-blur-2xl
            shadow-[0_10px_60px_rgba(0,0,0,0.08)]
          "
        >
          {/* HEADER */}
          <div
            className="
              flex items-center justify-between
              px-4 sm:px-5
              min-h-[78px]
              border-b border-black/5
              dark:border-white/10
              bg-white/70
              dark:bg-white/[0.02]
              backdrop-blur-xl
            "
          >
            <button
              onClick={() => navigate({ to: "/manager" })}
              className="
                h-11 px-4
                rounded-2xl
                flex items-center gap-2
                bg-black/[0.03]
                dark:bg-white/[0.05]
                border border-black/5
                dark:border-white/10
                text-sm font-medium
                text-zinc-700
                dark:text-white
                hover:bg-black/[0.05]
                dark:hover:bg-white/[0.08]
                transition-all
              "
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <div className="flex items-center gap-3">
              <div
                className="
                  w-11 h-11
                  rounded-2xl
                  bg-primary/10
                  border border-primary/10
                  flex items-center justify-center
                  text-primary
                  font-bold
                  text-sm
                "
              >
                AI
              </div>

              <div className="leading-tight hidden sm:block">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                  MindDesk Assistant
                </div>
                <div className="text-xs text-zinc-500 dark:text-white/50">
                  Assistente virtual de RH
                </div>
              </div>
            </div>

            <button
              onClick={handleNewChat}
              className="
                h-11 px-4
                rounded-2xl
                flex items-center gap-2
                bg-primary
                text-white
                text-sm font-medium
                hover:opacity-90
                transition-all
              "
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nova conversa</span>
            </button>
          </div>

          {/* MESSAGES */}
          <div
            className="
              flex-1
              overflow-y-auto
              px-4 sm:px-6
              py-6
              flex flex-col
              gap-5
              bg-transparent
            "
          >
            {messages.length === 1 && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                <img
                  src={chatIllus}
                  alt=""
                  width={180}
                  height={180}
                  loading="lazy"
                  className="w-50 sm:w-52 h-auto object-contain opacity-95"
                />
                <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight text-center">
                  Como posso ajudar?
                </h2>
                <p className="mt-2 text-sm sm:text-base text-zinc-500 dark:text-white/50 text-center max-w-md leading-relaxed">
                  Tire dúvidas sobre RH, férias, documentos, treinamentos e envie fotos ou atestados médicos.
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex w-full ${
                  m.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[88%] sm:max-w-[75%]
                    px-4 sm:px-5
                    py-3.5
                    rounded-[26px]
                    text-[15px]
                    leading-relaxed
                    shadow-sm
                    transition-all
                    ${
                      m.type === "user"
                        ? `bg-primary text-white rounded-br-md shadow-lg shadow-primary/10`
                        : `bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 text-zinc-800 dark:text-white/90 rounded-bl-md`
                    }
                  `}
                >
                  {renderText(m.text)}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-[24px] rounded-bl-md bg-white dark:bg-white/[0.04] border border-black/5 dark:border-white/10 flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: ".15s" }} />
                  <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: ".3s" }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="
              p-4 sm:p-5
              border-t border-black/5
              dark:border-white/10
              bg-white/70
              dark:bg-white/[0.02]
              backdrop-blur-xl
            "
          >
            <div
              className="
                flex items-center gap-2
                p-2
                rounded-[28px]
                bg-white
                dark:bg-white/[0.04]
                border border-black/5
                dark:border-white/10
                shadow-sm
              "
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={isTyping}
                accept="image/*, .pdf, .doc, .docx, .xls, .xlsx"
                className="hidden"
              />

              <button
                type="button"
                disabled={isTyping}
                onClick={() => fileInputRef.current?.click()}
                title="Fazer upload de documento ou foto"
                className="
                  w-12 h-12
                  rounded-2xl
                  flex items-center justify-center
                  bg-black/[0.03] dark:bg-white/[0.05]
                  text-zinc-500 dark:text-white/60
                  hover:bg-black/[0.06] dark:hover:bg-white/[0.1]
                  active:scale-95
                  disabled:opacity-40
                  transition-all
                  ml-1
                "
              >
                <Paperclip size={18} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva algo ou anexe um atestado no clipe..."
                disabled={isTyping}
                className="
                  flex-1
                  bg-transparent
                  px-2 sm:px-3
                  py-3
                  text-sm sm:text-[15px]
                  text-zinc-800
                  dark:text-white
                  placeholder:text-zinc-400
                  dark:placeholder:text-white/30
                  outline-none
                "
              />

              <button
                type="submit"
                disabled={isTyping || !input.trim()}
                className="
                  w-12 h-12
                  rounded-2xl
                  flex items-center justify-center
                  bg-primary
                  text-white
                  shadow-lg shadow-primary/20
                  hover:scale-[1.03]
                  active:scale-95
                  disabled:opacity-50
                  disabled:hover:scale-100
                  transition-all
                "
              >
                <SendHorizonal size={18} />
              </button>
            </div>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}

export default ChatPage;