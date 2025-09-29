import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";
type ChatMessage = { role: Role; content: string };

const STARTERS = ["Price for 10 users", "Product bundle", "Book a demo"];

const AIAvatar = () => (
  <div className="w-8 h-8 bg-purple-accent rounded-full flex items-center justify-center flex-shrink-0">
    <span className="text-white text-xs font-bold">AI</span>
  </div>
);

const UserAvatar = () => (
  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
    <span className="text-gray-600 text-xs font-bold">U</span>
  </div>
);

/** Универсальный помощник: умеет и обычный JSON, и поток (ReadableStream) */
async function sendToBackend(
  messages: ChatMessage[],
  onToken?: (chunk: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const res = await fetch("/api/aiw/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, stream: true }),
    signal, 
  });

  // 1) Явная проверка статуса
  if (!res.ok) {
    let details = "";
    try {
      const err = await res.text();
      details = err?.slice(0, 400);
    } catch {}
    throw new Error(`Backend error ${res.status}. ${details}`);
  }

  const contentType = res.headers.get("content-type") || "";

  // 2) Если это не event-stream — считаем обычный JSON
  if (!res.body || !contentType.includes("text/event-stream")) {
    const data = await res.json().catch(() => ({} as any));
    return data.reply ?? "";
  }

  // 3) Читаем поток; поддержим как «сырые токены», так и SSE с "data:"
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const raw = decoder.decode(value, { stream: true });

    // Если сервер шлёт настоящие SSE-сообщения
    // формата "data: ...\n\n" — удалим префикс и пустые строки:
const chunks = raw
  .split("\n")
  .map(line => (line.startsWith("data:") ? line.slice(5).trimStart() : line))
  .map(line => line.trim())
  .filter(line => line.length > 0 && line !== "[DONE]");

    const text = chunks.join("\n");
    if (!text) continue;

    full += text;
    onToken?.(text);
  }
  return full;
}


function AIWidgetDemo() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI sales consultant. I can help you with pricing, product bundles, demos, and answer any questions about our services. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
  abortRef.current?.signal // <= пробрасываем
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
          <div className="flex gap-2">
            <div className={`w-3 h-3 ${isSending ? "bg-yellow-400" : "bg-green-500"} rounded-full`} />
            <span className="text-xs text-muted-foreground">Live Demo</span>
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
                  <p>{m.content}</p>
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
          {isSending && (
            <div className="flex gap-3">
              <AIAvatar />
              <div className="bg-white rounded-lg p-4 shadow-sm max-w-md">
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

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