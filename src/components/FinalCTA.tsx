import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const FinalCTA = () => {
  useEffect(() => {
    if (document.querySelector('script[data-aiw-loader="1"]')) return;

    // 1) глобальный конфиг (перебьёт дефолты лоадера)
    (window as any).__AIW_CONFIG__ = {
      endpoint: "https://cloudcompliance.duckdns.org/api/aiw/chat",
      siteId: "SITE_123",
      title: "Sales Assistant",
      position: "br",
      accent: "#6D28D9",
      welcome: "Hi! Ask about pricing, bundles, or demos.",
      lang: "en",

      // NEW: автоприветствие
      autostart: true,                    // включить
      autostartDelay: 5000,               // мс
      autostartMode: "local",                // "local" | "ai"
      autostartMessage: "Hi there! Need help choosing a plan? I can assist you.", // только для "local"
      autostartPrompt:
        "Write a short warm greeting in one sentence and suggest 3 quick questions about pricing, bundles, demos.",
      autostartCooldownHours: 0.017,         // не чаще 1 раза в 12 ч
        preserveHistory: false,          // не хранить историю в localStorage
  resetHistoryOnOpen: true         // чистить при каждом открытии
    };

    // 2) загрузчик (с cache-busting, чтобы стянулся новый код)
    const ver = Date.now(); // простой cache-bust
    const s = document.createElement("script");
    s.src = `https://cloudcompliance.duckdns.org/aiw/widget-loader.js?v=${ver}`;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.setAttribute("data-aiw-loader", "1");

    // 3) продублируем конфиг через data-* (на случай, если загрузчик не читает window.__AIW_CONFIG__)
    s.setAttribute("data-src", `https://cloudcompliance.duckdns.org/aiw/widget.js?v=${ver}`);
    s.setAttribute("data-endpoint", "https://cloudcompliance.duckdns.org/api/aiw/chat");
    s.setAttribute("data-site-id", "SITE_123");
    s.setAttribute("data-title", "AI-Consultant Widget");
    s.setAttribute("data-accent", "#6D28D9");
    s.setAttribute("data-position", "br");
    s.setAttribute("data-lang", "en");
    s.setAttribute("data-welcome", "Hi! Ask about pricing, bundles, or demos.");

    // NEW: атрибуты для автозапуска (должны читаться твоим обновлённым loader’ом)
    s.setAttribute("data-autostart", "true");
    s.setAttribute("data-autostart-delay", "5000");
    s.setAttribute("data-autostart-mode", "local"); // "local" | "ai"
    s.setAttribute("data-autostart-message", "Hi there! Need help choosing a plan? I can assist you.");
    s.setAttribute(
      "data-autostart-prompt",
      "Write a short warm greeting in one sentence and suggest 3 quick questions about pricing, bundles, demos."
    );
    s.setAttribute("data-autostart-cooldown-hours", "0.017");

    document.body.appendChild(s);

    (s.onload = () => {
      // @ts-ignore
      console.log("[AIW] loader ready, cfg=", (window as any).__AIW_CONFIG__);
    });
  }, []);

  return (
    <section className="py-24 px-6 bg-gradient-to-r from-purple-accent to-accent">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Ready to add an AI Sales Consultant to your site?
          </h2>
          <p className="text-xl lg:text-2xl text-white/90 leading-relaxed">
            Join hundreds of businesses already converting more visitors into customers
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Button
              size="lg"
              className="bg-white text-purple-accent hover:bg-white/90 font-semibold px-12 py-6 text-xl shadow-lg transition-all duration-300 hover:shadow-xl"
              onClick={() => window.dispatchEvent(new Event("aiw:open"))}
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-purple-accent font-semibold px-12 py-6 text-xl transition-all duration-300"
              onClick={() => window.dispatchEvent(new Event("aiw:open"))}
            >
              Book a Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
