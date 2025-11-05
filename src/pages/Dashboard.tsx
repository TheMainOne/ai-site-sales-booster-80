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

const PUBLIC_API_ROOT = "https://cloudcompliance.duckdns.org/api";

// === Types ===
interface Client {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  created_at: string;
  siteId?: string;
}

interface Me {
  id?: string;     // JWT-based
  _id?: string;    // Mongo _id
  email: string;
  name?: string;
  roles?: string[];
  sites?: string[]; // список доступных сайтов/тенантов
}

interface Stats {
  totalClients: number;
  totalDocuments: number;
  totalUsers: number;
  activeSessions: number;
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

// === Normalization helpers ===
type RawClient = any;

function normalizeClients(raw: RawClient[]): Client[] {
  return (raw || []).map((c: any) => ({
    id: c.id || c._id || c.slug,
    name: c.name,
    slug: c.slug,
    is_active: typeof c.is_active === "boolean" ? c.is_active : c.isActive,
    created_at: c.created_at || c.createdAt || new Date().toISOString(),
    siteId: c.siteId,
  }));
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
  const [superadminTotalClients, setSuperadminTotalClients] = useState<number | null>(null);
  const [superadminTotalUsers, setSuperadminTotalUsers] = useState<number | null>(null);
  const isSuperadmin = !!(user?.roles && user.roles.includes("superadmin"));

  // вынесенные лоадеры (проще читать и меньше шансов перепутать скобки)
const loadClients = async (sites: string[], isSuperadmin = false) => {
  try {
    setBusy(b => ({ ...b, clients: true }));

    // Суперадмин без sites -> берём публичный список
    if ((!sites || sites.length === 0) && isSuperadmin) {
      const r = await fetch(`${PUBLIC_API_ROOT}/clients`, { credentials: "omit" });
      if (!r.ok) throw new Error(await r.text());
      const data: RawClient[] = await r.json();
      const list = normalizeClients(Array.isArray(data) ? data : (data?.clients || []));
      setClients(list);
      return;
    }

    if (!sites || sites.length === 0) {
      setClients([]);
      return;
    }

    const q = encodeURIComponent(sites.join(","));
    const r = await fetchWithAuth(`/admin/clients?sites=${q}`);
    const data: RawClient[] = await r.json();
    let list = normalizeClients(data);

    const siteSet = new Set(sites);
    if (list.length && list[0]?.siteId) {
      list = list.filter(c => siteSet.has(c.siteId as string));
    }
    setClients(list.slice().sort((a,b) => a.slug==='widget' ? -1 : b.slug==='widget' ? 1 : 0));
  } catch (e) {
    console.error("Error loading clients:", e);
  } finally {
    setBusy(b => ({ ...b, clients: false }));
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

async function loadGlobalUserCount(isMountedRef?: { current: boolean }) {
  try {
    const res = await fetch(`${PUBLIC_API_ROOT}/users`, { credentials: "omit" });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    // Универсально обрабатываем любые формы ответа
    let total = 0;
    if (Array.isArray(data)) total = data.length;
    else if (data && typeof data.total === "number") total = data.total;
    else if (data && Array.isArray(data.users)) total = data.users.length;

    if (!isMountedRef || isMountedRef.current) setSuperadminTotalUsers(total);
  } catch (e) {
    console.error("Failed to load global users:", e);
    if (!isMountedRef || isMountedRef.current) setSuperadminTotalUsers(null);
  }
}

  async function loadGlobalClientCount(isMountedRef?: { current: boolean }) {
    try {
      const res = await fetch(`${PUBLIC_API_ROOT}/clients`, { credentials: "omit" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      let total = 0;
      if (Array.isArray(data)) total = data.length;
      else if (data && typeof data.total === "number") total = data.total;
      else if (data && Array.isArray(data.clients)) total = data.clients.length;

      if (!isMountedRef || isMountedRef.current) setSuperadminTotalClients(total);
    } catch (e) {
      console.error("Failed to load global clients:", e);
      if (!isMountedRef || isMountedRef.current) setSuperadminTotalClients(null);
    }
  }

  // === Initial auth check and data load ===
  useEffect(() => {
    let isMounted = true;
    const mref = { current: true };

    (async () => {
      try {
        const r = await fetchWithAuth("/auth/me");
        const payload = await r.json();
        const me: Me = payload?.user ?? payload;
        if (!isMounted) return;
        setUser(me);
        localStorage.setItem("currentUser", JSON.stringify(me));

if (me?.roles?.includes("superadmin")) {
  loadGlobalClientCount(mref);
  loadGlobalUserCount(mref);
}


        const sites = me?.sites || [];
const superFlag = me?.roles?.includes("superadmin");

if (!sites.length && !superFlag) {
  setBusy({ stats: false, clients: false });
} else {
  setBusy({ stats: true, clients: true });
  // для супер-админа без sites: stats можно нулями, а клиентов грузим фолбэком
  await Promise.all([
    sites.length ? loadStats(sites) : Promise.resolve(),
    loadClients(sites, !!superFlag),
  ]);
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
      mref.current = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate]); // <-- эта скобка закрывает useEffect, всё ок

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

  const isSuperadminFlag = isSuperadmin;

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
{(!isSuperadminFlag && (!user.sites || user.sites.length === 0)) ? (
  <Card>
    <CardHeader>
      <CardTitle>No sites assigned</CardTitle>
      <CardDescription>You don't have access to any clients yet.</CardDescription>
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
                  {/* Total Clients */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {isSuperadminFlag ? "Total Clients (All Tenants)" : "Total Clients"}
                      </CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {isSuperadminFlag
                          ? (superadminTotalClients ?? <Skeleton className="h-7 w-10" />)
                          : (busy.stats ? <Skeleton className="h-7 w-10" /> : stats.totalClients)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isSuperadminFlag
                          ? "Active client accounts"
                          : "Active client accounts (scoped to your sites)"}
                      </p>
                      {isSuperadminFlag && !busy.stats && (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Your sites: {stats.totalClients}
                        </p>
                      )}
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
      {isSuperadminFlag
        ? (superadminTotalUsers ?? <Skeleton className="h-7 w-10" />)
        : (busy.stats ? <Skeleton className="h-7 w-10" /> : stats.totalUsers)}
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      {isSuperadminFlag ? "Registered users (all tenants)" : "Registered users"}
    </p>
    {isSuperadminFlag && !busy.stats && (
      <p className="text-[11px] text-muted-foreground mt-2">
        Your sites: {stats.totalUsers}
      </p>
    )}
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
  <Card className="border-none shadow-none">
    <CardHeader className="px-0">
      <CardTitle className="text-2xl">All Clients</CardTitle>
      <CardDescription>Manage client accounts and their configurations</CardDescription>
    </CardHeader>
    <CardContent className="px-0">
      {busy.clients ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No clients found</div>
      ) : (
        <div className="flex flex-col gap-4">
          {clients.map((client) => {
            const created =
              client.created_at ? new Date(client.created_at).toLocaleDateString() : "—";
            const isPrimary = client.slug === "widget";

            return (
              <div
                key={client.id}
                className="rounded-2xl border bg-card px-5 py-4 shadow-sm hover:shadow transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold">{client.name}</h3>
                      {isPrimary && (
                        <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          Primary
                        </span>
                      )}
                      {client.is_active === false && (
                        <span className="shrink-0 rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="truncate">Slug: {client.slug}</span>
                      <span>•</span>
                      <span>Created: {created}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => window.open(`/demo/${client.slug}`, "_blank")}
                      title="Open demo in a new tab"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Demo
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleManageClient(client.id)}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
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
