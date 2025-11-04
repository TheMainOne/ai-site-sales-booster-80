// src/routes/ProtectedRoute.tsx
import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE || "https://cloudcompliance.duckdns.org/api";
const getAccessToken = () => localStorage.getItem("auth_access");

export default function ProtectedRoute() {
  const [state, setState] = useState<"checking"|"allowed"|"denied">("checking");
  const onceRef = useRef(false);

  useEffect(() => {
    if (onceRef.current) return;
    onceRef.current = true;

    const token = getAccessToken();
    if (!token) { setState("denied"); return; }

    const ac = new AbortController();
    fetch(`${API_BASE}/auth/me`, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: ac.signal
    })
      .then(res => {
        if (res.status === 401) { setState("denied"); return; }
        if (!res.ok) { setState("denied"); return; }
        setState("allowed");
      })
      .catch(() => setState("denied"));

    return () => ac.abort();
  }, []);

  if (state === "checking") {
    return <div className="w-full h-[50vh] flex items-center justify-center text-muted-foreground">Checking access…</div>;
  }
  if (state === "denied") return <Navigate to="/auth" replace />;
  return <Outlet />;
}
