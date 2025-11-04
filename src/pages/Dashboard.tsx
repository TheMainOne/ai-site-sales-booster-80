// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut,
  Building2,
  FileText,
  Users,
  TrendingUp,
  ExternalLink,
  User as UserIcon,
} from "lucide-react";

// === Types ===
interface Client {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  created_at: string;
  // опционально, если бэк вернёт siteId — используем в fallback-фильтрации
  siteId?: string;
}

interface Stats {
  totalClients: number;
  totalDocuments: number;
  totalUsers: number;
  activeSessions: number;
}

interface Me {
  id?: string;      // JWT-based
  _id?: string;     // Mongo _id
  email: string;
  name?: string;
  roles?: string[];
  sites?: string[]; // ВАЖНО: список доступных сайтов/тенантов
}

// !!! ДОЛЖЕН совпадать с Auth.tsx !!!
const API_BASE = import.meta.env.VITE_API_BASE || "https://cloudcompliance.duckdns.org/api/aiw";

// === Token helpers (sync with Auth.tsx) ===
const getAccessToken = () => localStorage.getItem("auth_access");
const setAccessToken = (t: string | null) =>
  t ? localStorage.setItem("auth_access", t) : localStorage.removeItem("auth_access");
const getRefreshToken = () => localStorage.getItem("auth_refresh");
const setRefreshToken = (t: string | null) =>
  t ? localStorage.setItem("auth_refresh", t) : localStorage.removeItem("auth_refresh");

// === Fetch helper with Bearer + single-flight refresh ===
let refreshInFlight: Promise<void> | null = null;
async function fetchWithAuth(path: string, init: RequestInit = {}) {
  const makeReq = async () => {
    const headers = new Headers(init.headers || {});
    const at = getAccessToken();
    if (at) headers.set("Authorization", `Bearer ${at}`);
    if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_BASE}${path}`, { ...init, headers, credentials: "include" });
  };

  let res = await makeReq();
  if (res.status !== 401) {
    if (!res.ok) throw new Error(await res.text());
    return res;
  }

  // refresh
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const rt = getRefreshToken();
      if (!rt) throw new Error("No refresh token");
      const rr = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
        credentials: "include",
      });
      if (!rr.ok) throw new Error("Refresh failed");
      const data = await rr.json().catch(() => ({} as any));
      const newAT = data?.token || data?.accessToken || data?.tokens?.accessToken;
      const newRT = data?.refreshToken || data?.tokens?.refreshToken;
      if (newAT) setAccessToken(newAT);
      else throw new Error("No access token after refresh");
      if (newRT) setRefreshToken(newRT);
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  try {
    await refreshInFlight;
  } catch {
    throw new Error("Unauthorized");
  }

  res = await makeReq();
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<Me | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalDocuments: 0,
    totalUsers: 0,
    activeSessions: 0,
  });
  const [busy, setBusy] = useState<{ stats?: boolean; clients?: boolean }>({});

  // === Initial auth check and data load ===
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const r = await fetchWithAuth("/auth/me");
        const payload = await r.json();
        const me: Me = payload?.user ?? payload;
        if (!isMounted) return;
        setUser(me);
        localStorage.setItem("currentUser", JSON.stringify(me));

        const sites = me?.sites || [];
        if (sites.length === 0) {
          // нет сайтов — просто покажем пустое состояние
          setBusy({ stats: false, clients: false });
        } else {
          setBusy({ stats: true, clients: true });
          await Promise.all([loadStats(sites), loadClients(sites)]);
        }
      } catch {
        if (!isMounted) return;
        setUser(null);
        navigate("/auth", { replace: true });
        return;
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth_access" && !e.newValue) navigate("/auth", { replace: true });
    };
    window.addEventListener("storage", onStorage);
    return () => {
      isMounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate]);

  // === Loaders scoped by sites ===
  const loadClients = async (sites: string[]) => {
    try {
      if (!sites || sites.length === 0) {
        setClients([]);
        return;
      }
      const q = encodeURIComponent(sites.join(","));
      const r = await fetchWithAuth(`/admin/clients?sites=${q}`); // ожидаем, что бэк сам отфильтрует
      let data: Client[] = await r.json();

      // Fallback: если бэк вернул шире — фильтруем по client.siteId (если поле есть)
      const siteSet = new Set(sites);
      if (Array.isArray(data) && data.length && (data as any)[0]?.siteId) {
        data = data.filter((c: any) => siteSet.has(c.siteId));
      }

      const sorted = (data || []).slice().sort((a, b) =>
        a.slug === "widget" ? -1 : b.slug === "widget" ? 1 : 0
      );
      setClients(sorted);
    } catch (e) {
      console.error("Error loading clients:", e);
    } finally {
      setBusy((b) => ({ ...b, clients: false }));
    }
  };

  const loadStats = async (sites: string[]) => {
    try {
      if (!sites || sites.length === 0) {
        setStats({ totalClients: 0, totalDocuments: 0, totalUsers: 0, activeSessions: 0 });
        return;
      }
      const q = encodeURIComponent(sites.join(","));
      const r = await fetchWithAuth(`/admin/stats?sites=${q}`); // ожидаем скоуп у бэка
      const data: Partial<Stats> = await r.json();
      setStats({
        totalClients: data.totalClients ?? 0,
        totalDocuments: data.totalDocuments ?? 0,
        totalUsers: data.totalUsers ?? 0,
        activeSessions: data.activeSessions ?? 0,
      });
    } catch (e) {
      console.error("Error loading stats:", e);
    } finally {
      setBusy((b) => ({ ...b, stats: false }));
    }
  };

  // === Actions ===
  const handleLogout = async () => {
    try {
      const rt = getRefreshToken();
      await fetchWithAuth("/auth/logout", {
        method: "POST",
        body: JSON.stringify(rt ? { refreshToken: rt } : {}),
      }).catch(() => {});
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem("currentUser");
      navigate("/auth", { replace: true });
    }
  };

  const handleManageClient = (clientId: string) => {
    navigate(`/admin/client/${clientId}`);
  };

  // === Loading skeleton ===
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-6 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <div className="container mx-auto px-6 py-8">
          <div className="grid gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // === UI ===
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage clients, users, and system settings</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            {!user.sites || user.sites.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No sites assigned</CardTitle>
                  <CardDescription>
                    You are authenticated but have no sites. Contact an administrator to be assigned.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {user.sites.map((s) => (
                    <span key={s} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {busy.stats ? <Skeleton className="h-7 w-10" /> : stats.totalClients}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Active client accounts</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {busy.stats ? <Skeleton className="h-7 w-10" /> : stats.totalDocuments}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Knowledge base documents</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {busy.stats ? <Skeleton className="h-7 w-10" /> : stats.totalUsers}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Registered users</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {busy.stats ? <Skeleton className="h-7 w-10" /> : stats.activeSessions}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Data above is limited to your sites</CardDescription>
                  </CardHeader>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Clients */}
          <TabsContent value="clients" className="space-y-6">
            {!user.sites || user.sites.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No sites assigned</CardTitle>
                  <CardDescription>You don't have access to any clients yet.</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Clients</CardTitle>
                  <CardDescription>Only clients from your sites are listed</CardDescription>
                </CardHeader>
                <CardContent>
                  {busy.clients ? (
                    <div className="grid gap-3">
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                      <Skeleton className="h-16" />
                    </div>
                  ) : clients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No clients found</div>
                  ) : (
                    <div className="space-y-3">
                      {clients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{client.name}</h3>
                              {client.slug === "widget" && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                              {client.is_active === false && (
                                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>Slug: {client.slug}</span>
                              <span>•</span>
                              <span>Created: {new Date(client.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`/demo/${client.slug}`, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" /> Demo
                            </Button>
                            <Button size="sm" onClick={() => handleManageClient(client.id)}>
                              Manage
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Users & Roles (заглушка) */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and access permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">User management coming soon</div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
