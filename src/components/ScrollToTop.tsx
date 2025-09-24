import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType(); // PUSH / REPLACE / POP

  useEffect(() => {
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // если есть якорь — к нему
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({
          behavior: prefersReduced ? "auto" : "smooth",
          block: "start",
        });
        return;
      }
    }

    // при навигации (кроме back/forward) — вверх
    if (navType !== "POP") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: prefersReduced ? "auto" : "smooth",
      });
    }
  }, [pathname, hash, navType]);

  return null;
}
