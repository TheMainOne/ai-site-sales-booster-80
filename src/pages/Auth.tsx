// src/pages/Auth.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

// Если твои auth-роуты под /api/auth — оставь так; если под /api/aiw/auth — поменяй BASE
const API_BASE = import.meta.env.VITE_API_BASE || "https://cloudcompliance.duckdns.org/api/aiw";

type BackendUser = {
  id?: string;
  _id?: string;
  email: string;
  name?: string;
  roles?: string[];
  sites?: string[];
  isActive?: boolean;
};

type LoginResponse = {
  user?: BackendUser;
  tokens?: { accessToken?: string; refreshToken?: string };
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  message?: string;
  error?: string;
};

// ---------- Token helpers ----------
function setAuthTokens(accessToken?: string, refreshToken?: string) {
  if (accessToken) localStorage.setItem("auth_access", accessToken);
  if (refreshToken) localStorage.setItem("auth_refresh", refreshToken);
}

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ---- Возврат из Google: токены в URL → сохраняем и сразу уходим на /dashboard
  useEffect(() => {
    if (location.pathname !== "/auth") return;

    const params = new URLSearchParams(location.search);
    const accessFromUrl = params.get("accessToken") || params.get("token");
    const refreshFromUrl = params.get("refreshToken") || undefined;

    if (accessFromUrl) {
      setAuthTokens(accessFromUrl, refreshFromUrl || undefined);
      // чистим query, чтобы токены не торчали в адресе
      window.history.replaceState({}, "", location.pathname);
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Логин/Регистрация: при успехе → сразу /dashboard
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isSignUp ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.message || "Auth failed");

      const accessToken =
        data?.token ||
        data?.accessToken ||
        data?.tokens?.accessToken ||
        null;

      const refreshToken =
        data?.refreshToken ||
        data?.tokens?.refreshToken ||
        null;

      if (accessToken) setAuthTokens(accessToken, refreshToken || undefined);

      toast({
        title: isSignUp ? "Registration successful" : "Logged in",
        description: isSignUp ? "You can now sign in." : "Welcome!",
      });

      // 👉 ключевая строка: сразу уходим на dashboard
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Authentication error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ---- Google OAuth ----
  const handleGoogleAuth = () => {
    setLoading(true);
    const redirectUri = `${window.location.origin}/auth`;
    window.location.href = `${API_BASE}/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* ← Back to Home */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute left-4 top-4"
        onClick={() => navigate("/")}
        aria-label="Back to home"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isSignUp ? "Sign Up" : "Login"}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? "Create your account to get started" : "Log in to your dashboard"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </Button>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary hover:underline"
              disabled={loading}
            >
              {isSignUp ? "Already have an account? Login" : "No account? Sign Up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
