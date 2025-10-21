import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";


/** Обёртка вокруг fetch: логирует запрос/ответ и читает debug-заголовки с сервера */
async function askAIW(
  endpoint: string,
  payload: any,
  {
    siteId,
    sessionId,
    debug = true,
    signal,
  }: { siteId: string; sessionId: string; debug?: boolean; signal?: AbortSignal }
) {
  const t0 = performance.now();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-AIW-Site": siteId,
    "X-AIW-Session": sessionId,
  };
  if (debug) headers["X-AIW-Debug"] = "1";

  console.groupCollapsed("%cAIW → request", "color:#6D28D9;font-weight:bold");
  console.log("URL:", endpoint);
  console.log("Headers:", headers);
  console.log("Body:", payload);
  console.groupEnd();

  const res = await fetch(endpoint + (debug ? "?debug=1" : ""), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  const rawText = await res.clone().text();
  let json: any = null;
  try { json = JSON.parse(rawText); } catch { /* оставим как текст */ }

  const exposed = (k: string) => res.headers.get(k);
  const dbg = {
    status: res.status,
    build: exposed("X-AIW-Build"),
    source: exposed("X-AIW-Source"),
    citationsCount: exposed("X-AIW-Citations-Count"),
    handler: exposed("X-AIW-Handler"),
    route: exposed("X-AIW-Route"),
    site: exposed("X-AIW-Resolved-Site"),
    session: exposed("X-AIW-Resolved-Session"),
    phase: exposed("X-AIW-Phase"),
    db: exposed("X-AIW-DB"),
    timing: (() => { try { return JSON.parse(exposed("X-AIW-Timing") || "{}"); } catch { return {}; } })(),
    rttMs: Math.round(performance.now() - t0),
  };

  console.groupCollapsed("%cAIW ← response", "color:#16A34A;font-weight:bold");
  console.log("Server debug:", dbg);
  console.log("JSON:", json ?? rawText);
  console.groupEnd();

  if (!res.ok) {
    throw new Error(`Backend ${res.status}. ${rawText.slice(0, 300)}`);
  }

  return { json, rawText, debugHeaders: dbg };
}


type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };

const STARTERS = ["Price for 10 users", "Product bundle", "Book a demo"];
const STORAGE_KEY = "aiw.messages.v1";
const SESSION_KEY = "aiw.sessionId.v1";

const AIAvatar = () => (
  <div className="w-8 h-8 bg-purple-accent rounded-full flex items-center justify-center flex-shrink-0">
    <span className="text-white text-xs font-bold">AI</span>
  </div>
);

const UserAvatar = () => (
  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
    <span className="text-gray-600 text-xs font-bold">You</span>
  </div>
);

/** Универсальный помощник: умеет и обычный JSON, и поток (ReadableStream) */
/** Универсальный помощник: JSON сейчас; позже можно включить stream через onToken */
async function sendToBackend(
  messages: ChatMessage[],
  onToken?: (chunk: string) => void,
  opts?: { siteId?: string; sessionId?: string; signal?: AbortSignal }
): Promise<string> {
  const ENDPOINT = "https://cloudcompliance.duckdns.org/api/aiw/chat";
  const siteId = opts?.siteId ?? "SITE_123";
  const sessionId = opts?.sessionId ?? "sess-local";

  // важно: сервер ждёт messages[], а не message
  const payload = { messages, stream: false, meta: { siteId, sessionId, lang: "en" } };

  const { json, rawText } = await askAIW(ENDPOINT, payload, {
    siteId,
    sessionId,
    signal: opts?.signal,
  });

  // сервер всегда отдаёт { reply, source, citations }, но подстрахуемся
  if (json && typeof json === "object" && "reply" in json) {
    return String(json.reply ?? "");
  }
  return rawText || "";
}



function AIWidgetDemo() {
const [messages, setMessages] = useState<ChatMessage[]>(() => {
  try {
    if (typeof window === "undefined") throw new Error();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error();
    return parsed as ChatMessage[];
    } catch {
      return [{
        role: "assistant",
        content:
         "Hi! I'm your AI sales consultant. I can help you with pricing, product bundles, demos, and answer any questions about our services. What would you like to know?",
         }];
        }
        });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => {
  try {
    if (typeof window === "undefined") return "ssr";
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = (crypto as any)?.randomUUID?.() || String(Date.now());
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "local";
  }
});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
  const t = setTimeout(() => {
    try {
      // ограничим хранения историю, чтобы не разрасталась (последние 200 сообщений)
      const trimmed = messages.slice(-200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }, 150); // лёгкий дебаунс
  return () => clearTimeout(t);
}, [messages]);
  

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;
  // если пользователь не «подкручивает» чат вручную — скроллим вниз
  const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
  if (nearBottom) {
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }
}, [messages, isSending]);

const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

const send = useCallback(
  async (text: string) => {
    const userText = text.trim();
    if (!userText) return;

    // отменим предыдущий незавершённый запрос (на всякий случай)
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userText }, { role: "assistant", content: "" }]);
    setInput("");
          inputRef.current?.focus();

      setIsSending(true);

    try {
      const localMessages = [...messages, { role: "user" as Role, content: userText }];

      let final = "";
const doSend = sendToBackend(
  localMessages,
  (chunk) => { /* как у тебя */ },
    { siteId: "SITE_123", sessionId, signal: abortRef.current?.signal }
);

      // поддержка отмены (если бэк и fetch умеют)
      const result = await Promise.race([
        doSend,
        new Promise<string>((_, reject) => {
          abortRef.current?.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
      ]);

      if (!final && result) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: result || "…" };
          return copy;
        });
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return; // тихо выходим при отмене
      setError(e?.message || "Something went wrong. Please try again.");
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "⚠️ Error: failed to get a reply." };
        return copy;
      });
    } finally {
      setIsSending(false);
    }
  },
  [messages]
);

// На размонтирование — отменяем активный запрос
useEffect(() => {
  return () => abortRef.current?.abort();
}, []);


  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (canSend) send(input);
    },
    [canSend, input, send]
  );

  return (
    <div
      id="aiw-root"
      className="w-full h-[70vh] max-h-[820px] min-h-[520px] bg-gradient-to-br from-white to-cream/50 border border-border/30 rounded-none lg:rounded-2xl lg:mx-6 shadow-lg"
    >
      <div className="h-full flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-accent rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI-Consultant Widget</h3>
              <p className="text-xs text-muted-foreground">{isSending ? "Typing…" : "Online now"}</p>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className={`w-3 h-3 ${isSending ? "bg-yellow-400" : "bg-green-500"} rounded-full`} />
            <span className="text-xs text-muted-foreground">Live Demo</span>
            <button
             type="button"
             onClick={() => {
              try { localStorage.removeItem(STORAGE_KEY); } catch {}
              setMessages([{
                role: "assistant",
                content:
                 "Hi! I'm your AI sales consultant. I can help you with pricing, product bundles, demos, and answer any questions about our services. What would you like to know?",
                 }]);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                     Reset
                  </button>
          </div>
        </div>

        {/* Chat */}
        <div
        ref={scrollRef}
        className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto overscroll-contain"
        >
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 ${isUser ? "justify-end" : ""}`}
              >
                {!isUser && <AIAvatar />}
                <div
                  className={`${isUser ? "bg-purple-accent text-white" : "bg-white text-foreground"} rounded-lg p-4 shadow-sm max-w-lg whitespace-pre-wrap`}
                >
                  {(!isUser && m.content === "") ? (
                     <span className="inline-flex items-center gap-1 text-muted-foreground">
                       <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                       <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                                </span>
                                 ) : (
                                   <p>{m.content}</p>
                                   )}
                </div>
                {isUser && <UserAvatar />}
              </div>
            );
          })}

          {/* Starter Prompts */}
          {!messages.some((m) => m.role === "user") && (
            <div className="flex flex-wrap gap-2 ml-11">
              {STARTERS.map((prompt) => (
                <button
                  key={prompt}
  onClick={() => !isSending && send(prompt)}
    disabled={isSending}
                  className="px-4 py-2 bg-purple-accent/10 hover:bg-purple-accent/20 text-purple-accent rounded-full text-sm font-medium transition-colors duration-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* typing indicator */}

          {error && (
            <div className="ml-11 text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={onSubmit} className="p-6 border-t border-border/20">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ask about pricing, features, or schedule a demo..."
              className="flex-1 px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-accent/20 focus:border-purple-accent"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={!canSend}
              className="px-6 py-3 bg-purple-accent hover:bg-purple-accent/90 disabled:opacity-50 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




const FullWidthDemo = () => {
  return (
    <section id="demo-section" className="w-full bg-gradient-to-b from-background to-cream py-16">
      <div className="container mx-auto max-w-7xl px-6 mb-12">
        <div className="text-center space-y-6">
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">Play With the Widget</h2>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Ask about pricing, bundles, FAQs — the AI answers from your docs and can generate quotes.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-6">
        {/* Заменили макет на живой виджет */}
        <AIWidgetDemo />
      </div>

      <div className="container mx-auto max-w-7xl px-6 mt-8">
        <p className="text-center text-muted-foreground">
          This is a live demo. Want it on your site?{" "}
          <span className="font-semibold text-purple-accent">Install in 1 line.</span>
        </p>
      </div>
    </section>
  );
};

export default FullWidthDemo;