// src/pages/Auth.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = import.meta.env.VITE_API_BASE || "https://cloudcompliance.duckdns.org";

type ApiLoginResp = {
  user: { id: string; email: string; name?: string; roles: string[] };
  tokens: { accessToken: string; refreshToken: string };
};

export default function Auth() {
  const navigate = useNavigate();

  // Sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPass, setSiShowPass] = useState(false);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState<string | null>(null);

  // Sign up
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suShowPass, setSuShowPass] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSiError(null);
    if (!siEmail || !siPassword) return setSiError("Введите email и пароль.");
    setSiLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: siEmail.trim(), password: siPassword }),
      });
      const data = (await r.json()) as ApiLoginResp | { error?: string; details?: string[] };

      if (!r.ok) throw new Error(("error" in data && data.error) || "Login failed");

      const resp = data as ApiLoginResp;
      localStorage.setItem("accessToken", resp.tokens.accessToken);
      localStorage.setItem("refreshToken", resp.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(resp.user));

      navigate("/"); // редирект домой/в консоль
    } catch (err: any) {
      setSiError(err.message || "Не удалось войти.");
    } finally {
      setSiLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSuError(null);
    if (!suEmail || !suPassword) return setSuError("Email и пароль обязательны.");
    if (suPassword.length < 6) return setSuError("Пароль должен быть не короче 6 символов.");
    setSuLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: suEmail.trim(), password: suPassword, name: suName.trim() || undefined }),
      });
      const data = (await r.json()) as ApiLoginResp | { error?: string; details?: string[] };

      if (!r.ok) throw new Error(("error" in data && data.error) || "Registration failed");

      const resp = data as ApiLoginResp;
      localStorage.setItem("accessToken", resp.tokens.accessToken);
      localStorage.setItem("refreshToken", resp.tokens.refreshToken);
      localStorage.setItem("currentUser", JSON.stringify(resp.user));

      navigate("/"); // после регистрации сразу внутри
    } catch (err: any) {
      setSuError(err.message || "Не удалось зарегистрироваться.");
    } finally {
      setSuLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative">
      {/* Back */}
      <div className="absolute left-6 top-6 z-20">
                          <Link
                  to="/"
                  className="text-black/80 hover:text-white transition-colors"
                >
                  Back to Home
                </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Добро пожаловать</CardTitle>
          <CardDescription>Войдите в систему или создайте новый аккаунт</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@email.com"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={siShowPass ? "text" : "password"}
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-sm"
                      onClick={() => setSiShowPass((v) => !v)}
                    >
                      {siShowPass ? "Скрыть" : "Показать"}
                    </Button>
                  </div>
                </div>

                {siError && <p className="text-sm text-red-600">{siError}</p>}

                <Button type="submit" className="w-full" disabled={siLoading}>
                  {siLoading ? "Входим…" : "Войти"}
                </Button>

                <div className="text-right">
                  <a className="text-sm text-muted-foreground hover:underline" href="#">
                    Забыли пароль?
                  </a>
                </div>
              </form>
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Имя (необязательно)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Max"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@email.com"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Пароль</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={suShowPass ? "text" : "password"}
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-24"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-sm"
                      onClick={() => setSuShowPass((v) => !v)}
                    >
                      {suShowPass ? "Скрыть" : "Показать"}
                    </Button>
                  </div>
                </div>

                {suError && <p className="text-sm text-red-600">{suError}</p>}

                <Button type="submit" className="w-full" disabled={suLoading}>
                  {suLoading ? "Создаём…" : "Зарегистрироваться"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
