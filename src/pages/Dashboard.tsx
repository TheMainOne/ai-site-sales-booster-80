// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, FolderKanban, Settings, LogOut, User } from "lucide-react";

type Me = { id: string; email: string; name?: string; roles?: string[] };

const API_BASE = import.meta.env.VITE_API_BASE || "https://cloudcompliance.duckdns.org/api/aiw";

// === локальные хелперы (в этом же файле) ===
const getAccessToken   = () => localStorage.getItem("accessToken");
const setAccessToken   = (t: string | null) => (t ? localStorage.setItem("accessToken", t) : localStorage.removeItem("accessToken"));
const getRefreshToken  = () => localStorage.getItem("refreshToken");
const setRefreshToken  = (t: string | null) => (t ? localStorage.setItem("refreshToken", t) : localStorage.removeItem("refreshToken"));

async function fetchWithAuth(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401) {
    // пробуем рефреш по той же схеме, что в Auth.tsx (refreshToken из localStorage)
    const rt = getRefreshToken();
    if (rt) {
      const rr = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (rr.ok) {
        const data = await rr.json().catch(() => ({}));
        // ожидаем тот же формат, что и в Auth.tsx: { tokens: { accessToken, refreshToken }, user? }
        const newAT = data?.tokens?.accessToken;
        const newRT = data?.tokens?.refreshToken;
        if (newAT) setAccessToken(newAT);
        if (newRT) setRefreshToken(newRT);

        const headers2 = new Headers(init.headers || {});
        const tok2 = getAccessToken();
        if (tok2) headers2.set("Authorization", `Bearer ${tok2}`);
        if (!(init.body instanceof FormData)) headers2.set("Content-Type", "application/json");

        res = await fetch(`${API_BASE}${path}`, { ...init, headers: headers2 });
      }
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchWithAuth("/auth/me");
        const me = (await r.json()) as Me;
        setUser(me);
        // синхронизируем отображаемый email с тем, что сохранялось в Auth.tsx (не обязательно)
        localStorage.setItem("currentUser", JSON.stringify(me));
      } catch {
        setUser(null);
        navigate("/auth");
        return;
      } finally {
        setLoading(false);
      }
    })();

    // синхронизация между вкладками (если вышли из другой)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "accessToken" && !e.newValue) {
        setUser(null);
        navigate("/auth");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const rt = getRefreshToken();
      // если бэкенд ожидает refreshToken в теле — отправляем; если нет, просто игнор будет 200/204
      await fetchWithAuth("/auth/logout", {
        method: "POST",
        body: JSON.stringify(rt ? { refreshToken: rt } : {}),
      });
    } catch {
      // игнорируем сетевые ошибки на logout
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem("currentUser");
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content — оставляю твой JSX как есть */}
      <main className="container py-8">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total Users</CardTitle>
                  <CardDescription>Active users in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">1,234</div>
                  <p className="text-xs text-muted-foreground mt-2">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue</CardTitle>
                  <CardDescription>Total revenue this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">$45,231</div>
                  <p className="text-xs text-muted-foreground mt-2">+8% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Projects</CardTitle>
                  <CardDescription>Currently running projects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">23</div>
                  <p className="text-xs text-muted-foreground mt-2">+3 new this week</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest system events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">New user registered</span>
                    <span className="ml-auto text-muted-foreground">2 min ago</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Project updated</span>
                    <span className="ml-auto text-muted-foreground">15 min ago</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">System maintenance scheduled</span>
                    <span className="ml-auto text-muted-foreground">1 hour ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Projects</h2>
              <Button>Create New Project</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>AI Widget Integration</CardTitle>
                  <CardDescription>Active • Updated 2 days ago</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Implementing AI-powered chat widget for customer support
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Progress: 75%</span>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>In Progress • Updated 1 week ago</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Building comprehensive analytics and reporting system
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Progress: 45%</span>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>Mobile App</CardTitle>
                  <CardDescription>Planning • Created 3 weeks ago</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    React Native mobile application for iOS and Android
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Progress: 10%</span>
                    <Button variant="outline" size="sm">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Manage your account preferences and security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">User ID</label>
                  <p className="text-sm text-muted-foreground font-mono">{user?.id}</p>
                </div>

                <div className="pt-4">
                  <Button variant="outline">Update Password</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your dashboard experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Light or dark mode</p>
                  </div>
                  <Button variant="outline" size="sm">Change</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Language</p>
                    <p className="text-xs text-muted-foreground">Interface language</p>
                  </div>
                  <Button variant="outline" size="sm">English</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
