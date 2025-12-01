// src/pages/AdminClientManage.tsx
import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Copy, Download, ExternalLink, Eye, Image as ImageIcon, Trash2, Upload, X,
  AlertCircle, Search, RefreshCw, ChevronLeft, ChevronRight
} from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Send } from "lucide-react";



const TOAST_SUCCESS = {
  style: { background: "#303036", color: "#ffffff", border: "1px solid #14532d" },
};
const TOAST_WARNING = {
  style: { background: "#303036", color: "#ed0e0eff", border: "1px solid #14532d" },
};

const PUBLIC_API_ROOT = "https://cloudcompliance.duckdns.org/api";
const API_ORIGIN = new URL(PUBLIC_API_ROOT).origin;
// === NEW: Statistics base ===
const STATS_API_ROOT = "https://cloudcompliance.duckdns.org/api/statistic";

// ===== Documents API helpers =====
const DOCS_API = {
  list: (id: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(id)}/documents`,
  upload: (id: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(id)}/documents`,
  download: (docId: string) => `${PUBLIC_API_ROOT}/client-documents/${encodeURIComponent(docId)}/download`,
  text: (docId: string) => `${PUBLIC_API_ROOT}/client-documents/${encodeURIComponent(docId)}/text`,
  remove: (id: string, docId: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
  preview: (docId: string) => `${PUBLIC_API_ROOT}/client-documents/${encodeURIComponent(docId)}/preview`,
};

function isPdf(doc: DocDTO) {
  return (doc.contentType?.toLowerCase().includes("pdf")) || /\.pdf$/i.test(doc.fileName || "");
}
function isImage(doc: DocDTO) {
  const ct = doc.contentType?.toLowerCase() || "";
  return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(doc.fileName || "");
}
function isTextLike(doc: DocDTO) {
  const ct = doc.contentType?.toLowerCase() || "";
  return ct.startsWith("text/") || ct.includes("markdown") || /\.(txt|md)$/i.test(doc.fileName || "");
}
function isOffice(doc: DocDTO) {
  const name = doc.fileName?.toLowerCase() || "";
  const ct = doc.contentType?.toLowerCase() || "";
  return (
    /\.(docx|xlsx|pptx)$/i.test(name) ||
    ct.includes("officedocument")
  );
}

// если в ответе есть s3Url — используем его; иначе fallback на backend inline
function getPublicViewUrl(doc: DocDTO) {
  if (doc.s3Url) return doc.s3Url;
  return DOCS_API.preview(doc._id); // бэкенд сделает 302/inline
}

function getDownloadUrl(doc: DocDTO) {
  return doc.s3Url || ""; // только прямой S3-URL
}

// опционально: обёртка Google Docs Viewer для офисных форматов
function asGoogleViewer(url: string) {
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
}


// ===== Widget Config API helpers =====
const WIDGET_CFG_API = {
  get: (idOrSlug: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(idOrSlug)}/widget-config`,
  put: (idOrSlug: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(idOrSlug)}/widget-config`,
};

// ===== Types =====
type ClientDTO = {
  _id: string;
  name: string;
  slug: string;
  siteId: string;
  isActive: boolean;
  apiKey?: string;
  config?: {
    widgetTitle?: string;
    welcomeMessage?: string;
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    logoUrl?: string | null;
    systemPrompt?: string;
    customSystemPrompt?: string;
    siteId?: string;
  };
  stats?: { documents: number; users: number };
};

type UserDTO = {
  id?: string;
  _id?: string;
  email?: string;
  name?: string;
  createdAt?: string;
};

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant.

CONTENT RULES:
1. ALWAYS answer ONLY based on the knowledge base provided
2. For general questions - give a BRIEF overview (2-3 sentences) using ONLY information from the knowledge base
3. If specific information exists in the knowledge base - use it with exact details
4. If information is not in the knowledge base - honestly say so and suggest contacting support
5. DO NOT use general knowledge - ONLY the knowledge base provided`;

type DocDTO = {
  _id: string;
  clientId?: string;
  fileName: string;
  title?: string;
  contentType?: string;
  size?: number;
  isActive?: boolean;
  createdAt?: string;
  s3Url?: string;
};

type DocumentDialog = {
  id: string;
  title: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
  file_size: number;
  contentType?: string;
  // что показываем
  mode: "pdf" | "image" | "text" | "office" | "unknown";
  viewUrl?: string;  // для iframe/img
  content?: string;  // для text
};

/* =========================
   Analytics helper types
   ========================= */
type TimeseriesRow = { ts: string; count?: number; total?: number; users?: number; assistants?: number; unresolved?: number; resolved?: number };

type SessionsListItem = {
  siteId: string; sessionId: string; visitorId: string;
  pageUrl?: string; referrer?: string;
  startedAt?: string; endedAt?: string;
  messagesCount?: number; userMessages?: number; assistantMessages?: number;
  topics?: string[]; lastUserQuestion?: string;
};

type MessagesListItem = {
  siteId: string; sessionId: string;
  role: "user" | "assistant" | "system";
  content: string; topic?: string;
  latencyMs?: number; promptTokens?: number; completionTokens?: number;
  createdAt?: string;
};

type GapsListItem = {
  siteId: string; sessionId?: string; clientId?: string;
  question: string; normalizedQuestion?: string;
  phase?: string; citations?: string[]; answerPreview?: string;
  judge?: { goodAnswer?: boolean; confidence?: number; reason?: string };
  lastSeenAt?: string; resolvedAt?: string; createdAt?: string;
};

/* =========================
   Small UI helpers
   ========================= */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function humanId(s?: string, left = 6, right = 4) {
  if (!s) return "—";
  return s.length > left + right + 1 ? `${s.slice(0, left)}…${s.slice(-right)}` : s;
}


/* =========================
   AnalyticsTab (NEW)
   ========================= */
function AnalyticsTab({ siteId }: { siteId?: string }) {
  const [days, setDays] = useState<number>(30);
  const [bucket, setBucket] = useState<"hour" | "day" | "week">("day");
  const [tz, setTz] = useState<string>("UTC");

  // Summary
  const [loadingCards, setLoadingCards] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<number>(0);
  const [sessionsTotal, setSessionsTotal] = useState<number>(0);
  const [messagesTotal, setMessagesTotal] = useState<number>(0);
  const [gapsUnresolved, setGapsUnresolved] = useState<number>(0);

  // Tables: pagination & search
  const [q, setQ] = useState<string>("");
  // Sessions
  const [sessPage, setSessPage] = useState(1);
  const [sessLimit, setSessLimit] = useState(10);
  const [sessions, setSessions] = useState<SessionsListItem[]>([]);
  const [sessionsTotalCount, setSessionsTotalCount] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Messages
  const [msgPage, setMsgPage] = useState(1);
  const [msgLimit, setMsgLimit] = useState(10);
  const [msgRole, setMsgRole] = useState<"" | "user" | "assistant">("");
  const [messages, setMessages] = useState<MessagesListItem[]>([]);
  const [messagesTotalCount, setMessagesTotalCount] = useState(0);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Gaps
  const [gapsPage, setGapsPage] = useState(1);
  const [gapsLimit, setGapsLimit] = useState(10);
  const [gapsOnlyUnresolved, setGapsOnlyUnresolved] = useState(true);
  const [gapsPhase, setGapsPhase] = useState<string>("");
  const [gaps, setGaps] = useState<GapsListItem[]>([]);
  const [gapsTotalCount, setGapsTotalCount] = useState(0);
  const [gapsLoading, setGapsLoading] = useState(false);

  // 👇 ДОБАВЬ
  const [isSessDialogOpen, setIsSessDialogOpen] = useState(false);
  const [sessDialogSession, setSessDialogSession] = useState<SessionsListItem | null>(null);
  const [sessDialogLoading, setSessDialogLoading] = useState(false);
  const [sessDialogMsgs, setSessDialogMsgs] = useState<MessagesListItem[]>([]);


  async function openSessionDialog(s: SessionsListItem) {
    if (!siteId) return;
    setSessDialogSession(s);
    setIsSessDialogOpen(true);
    setSessDialogLoading(true);
    try {
      const url = new URL(`${STATS_API_ROOT}/messages/list`);
      url.searchParams.set("days", String(days));
      url.searchParams.set("siteId", siteId);
      url.searchParams.set("sessionId", s.sessionId);
      url.searchParams.set("page", "1");
      url.searchParams.set("limit", "200"); // хватит для одного диалога
      const res = await fetch(url.toString());
      const data = res.ok ? await res.json() : { items: [] };
      // сортируем по времени возрастания — так привычнее читать переписку
      const items: MessagesListItem[] = Array.isArray(data.items) ? data.items : [];
      items.sort((a, b) => (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
      setSessDialogMsgs(items);
    } catch {
      setSessDialogMsgs([]);
    } finally {
      setSessDialogLoading(false);
    }
  }

  const disabled = !siteId;

  const qs = useMemo(() => new URLSearchParams({
    days: String(days),
    siteId: siteId || "",
  }), [days, siteId]);

  async function loadCards() {
    if (!siteId) return;
    setLoadingCards(true);
    try {
      // 1) Active visitors (unique)
      const a = await fetch(`${STATS_API_ROOT}/sessions/active/count?${qs.toString()}&uniqueBy=visitor`);
      const aJson = a.ok ? await a.json() : { total: 0 };

      // 2) Sessions count (raw)
      const b = await fetch(`${STATS_API_ROOT}/sessions/count?${qs.toString()}`);
      const bJson = b.ok ? await b.json() : { total: 0 };

      // 3) Messages summary
      const c = await fetch(`${STATS_API_ROOT}/messages/summary?${qs.toString()}`);
      const cJson = c.ok ? await c.json() : { totals: { totalMessages: 0 } };

      // 4) Gaps summary (unresolved)
      const d = await fetch(`${STATS_API_ROOT}/gaps/summary?${qs.toString()}`);
      const dJson = d.ok ? await d.json() : { totals: { unresolved: 0 } };

      setActiveVisitors(Number(aJson?.total || 0));
      setSessionsTotal(Number(bJson?.total || 0));
      setMessagesTotal(Number(cJson?.totals?.totalMessages || 0));
      setGapsUnresolved(Number(dJson?.totals?.unresolved || 0));
    } catch {
      // no-op
    } finally {
      setLoadingCards(false);
    }
  }

  async function loadSessions() {
    if (!siteId) return;
    setSessionsLoading(true);
    try {
      const url = new URL(`${STATS_API_ROOT}/sessions/list`);
      url.searchParams.set("days", String(days));
      url.searchParams.set("siteId", siteId);
      url.searchParams.set("page", String(sessPage));
      url.searchParams.set("limit", String(sessLimit));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSessions(Array.isArray(data?.items) ? data.items : []);
      setSessionsTotalCount(Number(data?.total || 0));
    } catch (e) {
      setSessions([]);
      setSessionsTotalCount(0);
    } finally {
      setSessionsLoading(false);
    }
  }

  async function loadMessages() {
    if (!siteId) return;
    setMessagesLoading(true);
    try {
      const url = new URL(`${STATS_API_ROOT}/messages/list`);
      url.searchParams.set("days", String(days));
      url.searchParams.set("siteId", siteId);
      url.searchParams.set("page", String(msgPage));
      url.searchParams.set("limit", String(msgLimit));
      if (msgRole) url.searchParams.set("role", msgRole);
      if (q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages(Array.isArray(data?.items) ? data.items : []);
      setMessagesTotalCount(Number(data?.total || 0));
    } catch {
      setMessages([]);
      setMessagesTotalCount(0);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function loadGaps() {
    if (!siteId) return;
    setGapsLoading(true);
    try {
      const url = new URL(`${STATS_API_ROOT}/gaps/list`);
      url.searchParams.set("days", String(days));
      url.searchParams.set("siteId", siteId);
      url.searchParams.set("page", String(gapsPage));
      url.searchParams.set("limit", String(gapsLimit));
      if (gapsOnlyUnresolved) url.searchParams.set("unresolvedOnly", "true");
      if (gapsPhase) url.searchParams.set("phase", gapsPhase);
      if (q.trim()) url.searchParams.set("q", q.trim());

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGaps(Array.isArray(data?.items) ? data.items : []);
      setGapsTotalCount(Number(data?.total || 0));
    } catch {
      setGaps([]);
      setGapsTotalCount(0);
    } finally {
      setGapsLoading(false);
    }
  }

  // Initial & on filters change
  useEffect(() => { if (!disabled) loadCards(); /* eslint-disable-next-line */ }, [disabled, days, siteId]);
  useEffect(() => { if (!disabled) loadSessions(); /* eslint-disable-next-line */ }, [disabled, days, siteId, sessPage, sessLimit]);
  useEffect(() => { if (!disabled) loadMessages(); /* eslint-disable-next-line */ }, [disabled, days, siteId, msgPage, msgLimit, msgRole, q]);
  useEffect(() => { if (!disabled) loadGaps(); /* eslint-disable-next-line */ }, [disabled, days, siteId, gapsPage, gapsLimit, gapsOnlyUnresolved, gapsPhase, q]);


  const totalSessPages = Math.max(1, Math.ceil(sessionsTotalCount / sessLimit));
  const totalMsgPages = Math.max(1, Math.ceil(messagesTotalCount / msgLimit));
  const totalGapPages = Math.max(1, Math.ceil(gapsTotalCount / gapsLimit));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Scope analytics using siteId, window and timezone</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-4">
          <Field label="Site ID">
            <Input value={siteId || ""} readOnly className="font-mono text-xs" />
          </Field>
          <Field label="Days">
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, Number(e.target.value || 30)))}
            />
          </Field>
          <Field label="Bucket">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={bucket}
              onChange={(e) => setBucket(e.target.value as any)}
            >
              <option value="hour">hour</option>
              <option value="day">day</option>
              <option value="week">week</option>
            </select>
          </Field>
          <Field label="Timezone">
            <Input value={tz} onChange={(e) => setTz(e.target.value)} placeholder="UTC or IANA (e.g., Europe/Warsaw)" />
          </Field>
          <Field label="Search (Messages/Gaps)">
            <div className="flex gap-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search text…" />
              <Button variant="outline" onClick={() => { setQ(q.trim()); }}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </Field>
          {!siteId && (
            <div className="md:col-span-5 p-3 border border-yellow-500/40 bg-yellow-500/10 rounded text-sm text-yellow-200">
              To see analytics, set <span className="font-mono">siteId</span> in client’s widget config.
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid md:grid-cols-4 gap-4">
        {[{
          title: "Active Visitors",
          value: activeVisitors
        }, {
          title: "Sessions",
          value: sessionsTotal
        }, {
          title: "Messages",
          value: messagesTotal
        }, {
          title: "Unresolved Gaps",
          value: gapsUnresolved
        }].map((k, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">{k.title}</CardTitle>
              <CardDescription>Last {days} days</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCards ? <Skeleton className="h-8 w-24" /> : <div className="text-3xl font-bold">{k.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions table */}
      <Card>
        <CardHeader className="flex items-start justify-between space-y-0">
          <div>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>Recent sessions for this site</CardDescription>
          </div>
          <div className="flex gap-2">
            <Field label="Per page">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={sessLimit}
                onChange={(e) => { setSessLimit(Number(e.target.value)); setSessPage(1); }}
              >
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Button variant="outline" onClick={loadSessions}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sessions found.</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Session</th>
                      <th className="text-left p-3 font-medium">Visitor</th>
                      <th className="text-left p-3 font-medium">Started</th>
                      <th className="text-left p-3 font-medium">Msgs</th>
                      <th className="text-left p-3 font-medium">Last Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.sessionId} className="border-t hover:bg-muted/40">
                        <td className="p-3 font-mono text-xs">
                          <button
                            className="text-primary hover:underline"
                            title={s.sessionId}
                            onClick={() => openSessionDialog(s)}
                          >
                            {humanId(s.sessionId)}
                          </button>
                        </td>
                        <td className="p-3 font-mono text-xs" title={s.visitorId || ""}>
                          {humanId(s.visitorId)}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-xs">
                          {s.messagesCount ?? 0} <span className="text-muted-foreground">({s.userMessages ?? 0}/{s.assistantMessages ?? 0})</span>
                        </td>
                        <td className="p-3 text-xs">{s.lastUserQuestion ? (s.lastUserQuestion.length > 80 ? s.lastUserQuestion.slice(0, 80) + "…" : s.lastUserQuestion) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">Total: {sessionsTotalCount}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={sessPage <= 1} onClick={() => setSessPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm">Page {sessPage} / {totalSessPages}</div>
                  <Button variant="outline" size="sm" disabled={sessPage >= totalSessPages} onClick={() => setSessPage(p => Math.min(totalSessPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Messages table */}
      <Card>
        <CardHeader className="flex items-start justify-between space-y-0">
          <div>
            <CardTitle>Messages</CardTitle>
            <CardDescription>All messages within the period</CardDescription>
          </div>
          <div className="flex items-end gap-3">
            <Field label="Role">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={msgRole}
                onChange={(e) => { setMsgRole(e.target.value as any); setMsgPage(1); }}
              >
                <option value="">any</option>
                <option value="user">user</option>
                <option value="assistant">assistant</option>
              </select>
            </Field>
            <Field label="Per page">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={msgLimit}
                onChange={(e) => { setMsgLimit(Number(e.target.value)); setMsgPage(1); }}
              >
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Button variant="outline" onClick={loadMessages}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {messagesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No messages found.</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Time</th>
                      <th className="text-left p-3 font-medium">Session</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Content</th>
                      <th className="text-left p-3 font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 text-xs text-muted-foreground">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 font-mono text-xs">{m.sessionId}</td>
                        <td className="p-3 text-xs">{m.role}</td>
                        <td className="p-3 text-xs">
                          {m.content ? (m.content.length > 120 ? m.content.slice(0, 120) + "…" : m.content) : "—"}
                        </td>
                        <td className="p-3 text-xs">{typeof m.latencyMs === "number" ? `${m.latencyMs} ms` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">Total: {messagesTotalCount}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={msgPage <= 1} onClick={() => setMsgPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm">Page {msgPage} / {totalMsgPages}</div>
                  <Button variant="outline" size="sm" disabled={msgPage >= totalMsgPages} onClick={() => setMsgPage(p => Math.min(totalMsgPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gaps table */}
      <Card>
        <CardHeader className="flex items-start justify-between space-y-0">
          <div>
            <CardTitle>Gaps</CardTitle>
            <CardDescription>Unanswered/low-confidence questions</CardDescription>
          </div>
          <div className="flex items-end gap-3">
            <Field label="Phase">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={gapsPhase}
                onChange={(e) => { setGapsPhase(e.target.value); setGapsPage(1); }}
              >
                <option value="">any</option>
                <option value="no-context">no-context</option>
                <option value="rag">rag</option>
                <option value="rag-extractive">rag-extractive</option>
              </select>
            </Field>
            <Field label="Unresolved only">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={String(gapsOnlyUnresolved)}
                onChange={(e) => { setGapsOnlyUnresolved(e.target.value === "true"); setGapsPage(1); }}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </Field>
            <Field label="Per page">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={gapsLimit}
                onChange={(e) => { setGapsLimit(Number(e.target.value)); setGapsPage(1); }}
              >
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Button variant="outline" onClick={loadGaps}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent>
          {gapsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : gaps.length === 0 ? (
            <div className="text-sm text-muted-foreground">No gaps found.</div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Question</th>
                      <th className="text-left p-3 font-medium">Phase</th>
                      <th className="text-left p-3 font-medium">Confidence</th>
                      <th className="text-left p-3 font-medium">Last Seen</th>
                      <th className="text-left p-3 font-medium">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((g, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-3 text-xs">
                          {g.question ? (g.question.length > 120 ? g.question.slice(0, 120) + "…" : g.question) : "—"}
                        </td>
                        <td className="p-3 text-xs">{g.phase || "—"}</td>
                        <td className="p-3 text-xs">
                          {typeof g?.judge?.confidence === "number" ? g.judge.confidence.toFixed(2) : "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {g.lastSeenAt ? new Date(g.lastSeenAt).toLocaleString() : (g.createdAt ? new Date(g.createdAt).toLocaleString() : "—")}
                        </td>
                        <td className="p-3 text-xs">{g.resolvedAt ? new Date(g.resolvedAt).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">Total: {gapsTotalCount}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={gapsPage <= 1} onClick={() => setGapsPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm">Page {gapsPage} / {totalGapPages}</div>
                  <Button variant="outline" size="sm" disabled={gapsPage >= totalGapPages} onClick={() => setGapsPage(p => Math.min(totalGapPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ⬇️ ВСТАВЬ ВОТ СЮДА: сразу после блока Gaps */}
      {/* ===== Session Conversation Dialog ===== */}
      <Dialog open={isSessDialogOpen} onOpenChange={setIsSessDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Session {humanId(sessDialogSession?.sessionId)}{" "}
              <span className="text-muted-foreground text-sm">
                (Visitor {humanId(sessDialogSession?.visitorId)})
              </span>
            </DialogTitle>
            <DialogDescription>
              {sessDialogSession?.startedAt
                ? `Started: ${new Date(sessDialogSession.startedAt).toLocaleString()}`
                : "Conversation messages"}
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-md max-h-[60vh] overflow-auto p-3 bg-muted/30">
            {sessDialogLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
                <Skeleton className="h-6 w-4/6" />
              </div>
            ) : sessDialogMsgs.length === 0 ? (
              <div className="text-sm text-muted-foreground">No messages in this session.</div>
            ) : (
              <ul className="space-y-3">
                {sessDialogMsgs.map((m, i) => (
                  <li key={i} className="flex gap-2">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium h-6 flex items-center ${m.role === "user"
                          ? "bg-blue-500/20 text-blue-300"
                          : m.role === "assistant"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-zinc-500/20 text-zinc-200"
                        }`}
                      title={m.role}
                    >
                      {m.role}
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] text-muted-foreground">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                        {typeof m.latencyMs === "number" ? ` • ${m.latencyMs}ms` : ""}
                        {typeof m.promptTokens === "number" || typeof m.completionTokens === "number"
                          ? ` • tok ${m.promptTokens ?? 0}/${m.completionTokens ?? 0}`
                          : ""}
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{m.content || "—"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================
   PAGE COMPONENT
   ========================= */
export default function AdminClientManage() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  // ===== Client state =====
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientDTO | null>(null);

  // ===== Users state (REAL data) =====
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [clientUsers, setClientUsers] = useState<UserDTO[]>([]);

  // ===== Active tab (controlled) =====
  const [activeTab, setActiveTab] = useState<
    "setup" | "knowledge" | "users" | "code" | "demo" | "analytics"
  >("setup");

  // ===== Widget settings UI (from WidgetConfig) =====
  const [settings, setSettings] = useState({
    // базовые UI
    widget_title: "AI Assistant",
    welcome_message: "Hi! How can I help you today?",
    primary_color: "#2927ea",
    background_color: "#0f0f0f",
    text_color: "#ffffff",
    border_color: "#2927ea",
    logo_url: null as string | null,

    // мета / позиционирование
    site_id: "",
    lang: "en" as "en" | "ru" | string,
    position: "br" as "br" | "bl",

    // поведение / автозапуск
    autostart: false,
    autostart_delay: 5000,
    autostart_mode: "local" as "local" | "ai",
    autostart_message: "",
    autostart_prompt: "",
    autostart_cooldown_hours: 12,

    // история
    preserve_history: true,
    reset_history_on_open: false,

    // НОВЫЕ UI-поля
    input_placeholder: "",
    header_bg_color: "",
    header_text_color: "",
    assistant_bubble_color: "",
    assistant_bubble_text_color: "",
    user_bubble_color: "",
    user_bubble_text_color: "",
    bubble_border_color: "",
    input_bg_color: "",
    input_text_color: "",
    input_border_color: "",
    send_button_bg_color: "",
    send_button_icon_color: "",
    show_avatars: true,
    show_timestamps: true,

    // потоковый ответ
    stream: true,

    // шрифты
    font_family: "",
    font_css_url: "",
    font_file_url: "",

    // inline-автостарт (сырое JSON для UI)
    inline_autostart_raw: "",

    // LLM
    system_prompt: DEFAULT_SYSTEM_PROMPT,
  });

  const [fontUploading, setFontUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // ===== Documents state (REAL data) =====
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // ===== Dialog state for preview =====
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<DocumentDialog | null>(null);

  // ===== Users add form =====
  const [emailInput, setEmailInput] = useState("");

  // ===== Helpers =====
  const copyToClipboard = (t: string) => navigator.clipboard?.writeText(t);
  const generateEmbedCode = (apiKey: string) => `<!-- AI Sales Widget -->
<script>
  window.salesWidgetConfig = { apiKey: '${apiKey}', host: '${API_ORIGIN}' };
</script>
<script src="${API_ORIGIN}/widget-embed.js"></script>`;



  // ===== IFRAME PREVIEW REF =====
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  // ===== Fetch client by :clientId (id or slug) + WidgetConfig =====
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${PUBLIC_API_ROOT}/clients/${encodeURIComponent(clientId || "")}`, {
          credentials: "omit",
        });
        if (!res.ok) throw new Error(await res.text());
        const data: ClientDTO = await res.json();
        if (!alive) return;

        setClient(data);

        if (clientId) {
          const cfgRes = await fetch(WIDGET_CFG_API.get(clientId), { credentials: "omit" });
          if (cfgRes.ok) {
            const { config } = await cfgRes.json();
            const cfg = config || {};

            setSettings({
              // UI
              widget_title: cfg.widgetTitle ?? "AI Assistant",
              welcome_message: cfg.welcomeMessage ?? "Hi! How can I help you today?",
              primary_color: cfg.primaryColor ?? "#2927ea",
              background_color: cfg.backgroundColor ?? "#0f0f0f",
              text_color: cfg.textColor ?? "#ffffff",
              border_color: (cfg.borderColor ?? cfg.primaryColor ?? "#2927ea"),
              logo_url: cfg.logo?.url ?? null,

              // поведение / метаданные
              site_id: (cfg.siteId ?? data.siteId ?? ""),
              lang: (cfg.lang ?? "en"),
              position: (cfg.position ?? "br"),

              autostart: !!cfg.autostart,
              autostart_delay: typeof cfg.autostartDelay === "number" ? cfg.autostartDelay : 5000,
              autostart_mode: (cfg.autostartMode ?? "local"),
              autostart_message: (cfg.autostartMessage ?? ""),
              autostart_prompt: (cfg.autostartPrompt ?? ""),
              autostart_cooldown_hours: typeof cfg.autostartCooldownHours === "number" ? cfg.autostartCooldownHours : 12,

              preserve_history: cfg.preserveHistory ?? true,
              reset_history_on_open: !!cfg.resetHistoryOnOpen,

              // НОВЫЕ UI-поля (как есть из конфига)
              input_placeholder: cfg.inputPlaceholder ?? "",
              header_bg_color: cfg.headerBackgroundColor || "",
              header_text_color: cfg.headerTextColor || "",
              assistant_bubble_color: cfg.assistantBubbleColor || "",
              assistant_bubble_text_color: cfg.assistantBubbleTextColor || "",
              user_bubble_color: cfg.userBubbleColor || "",
              user_bubble_text_color: cfg.userBubbleTextColor || "",
              bubble_border_color: cfg.bubbleBorderColor || "",
              input_bg_color: cfg.inputBackgroundColor || "",
              input_text_color: cfg.inputTextColor || "",
              input_border_color: cfg.inputBorderColor || "",
              send_button_bg_color: cfg.sendButtonBackgroundColor || "",
              send_button_icon_color: cfg.sendButtonIconColor || "",
              show_avatars: cfg.showAvatars !== false,
              show_timestamps: cfg.showTimestamps !== false,

              stream: cfg.stream !== false,

              font_family: cfg.fontFamily || "",
              font_css_url: cfg.fontCssUrl || "",
              font_file_url: cfg.fontFileUrl || "",

              inline_autostart_raw: cfg.inlineAutostart
                ? JSON.stringify(cfg.inlineAutostart, null, 2)
                : "",

              // LLM
              system_prompt:
                (cfg?.customSystemPrompt && String(cfg.customSystemPrompt).trim().length
                  ? cfg.customSystemPrompt
                  : DEFAULT_SYSTEM_PROMPT),
            });

            setLogoPreview(null);
          } else {
            // если конфиг не найден — хотя бы скопировать client.siteId
            setSettings((prev) => ({ ...prev, site_id: data.siteId || prev.site_id }));
          }
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load client");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [clientId]);


  // ===== Fetch REAL users of client =====
  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    (async () => {
      setUsersLoading(true);
      setUsersError(null);
      try {
        const res = await fetch(`${PUBLIC_API_ROOT}/clients/${encodeURIComponent(clientId)}/users`, {
          credentials: "omit",
        });
        if (!res.ok) throw new Error(await res.text());
        const data: any = await res.json();
        if (!alive) return;

        const list: UserDTO[] = Array.isArray(data) ? data : (data?.users || []);
        setClientUsers(list);
      } catch (e: any) {
        if (!alive) return;
        setUsersError(e?.message || "Failed to load users");
        setClientUsers([]);
      } finally {
        if (alive) setUsersLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [clientId]);

  // ===== Fetch REAL documents of client =====
  async function fetchDocuments() {
    if (!clientId) return;
    setDocsLoading(true);
    setDocsError(null);
    try {
      const res = await fetch(DOCS_API.list(clientId), { credentials: "omit" });
      if (!res.ok) throw new Error(await res.text());
      const list = await res.json();
      const mapped: DocDTO[] = (Array.isArray(list) ? list : []).map((d: any) => ({
        _id: d._id,
        clientId: d.clientId,
        fileName: d.fileName || d.originalName || d.name,
        title: d.title || d.fileName || d.originalName || d.name,
        contentType: d.contentType || d.mimeType,
        size: typeof d.size === "number" ? d.size : d.fileSize,
        isActive: d.isActive ?? true,
        createdAt: d.createdAt || d.uploadedAt,
        s3Url: d.s3Url,
      }));
      setDocuments(mapped);
    } catch (e: any) {
      setDocsError(e?.message || "Failed to load documents");
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }
  useEffect(() => { fetchDocuments(); /* eslint-disable-next-line */ }, [clientId]);

  // ===== Upload handlers =====
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // проверяем тип
    if (!/^image\/(png|jpeg)$/.test(file.type)) {
      toast.warning("Only PNG or JPEG allowed", TOAST_WARNING);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);

    setLogoFile(file); // <— сохраняем сам файл
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    // опционально можно завести флаг removeLogo = true
  };

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !clientId) return;

    setUploadError(null);
    setUploading(true);
    setUploadProgress(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", DOCS_API.upload(clientId), true);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fd);
      });

      await fetchDocuments();
      toast.success("Uploaded", { description: "Document has been uploaded.", ...TOAST_SUCCESS });
    } catch (e: any) {
      setUploadError(e?.message || "Upload failed");
      toast.warning("Upload failed", { description: e?.message || "Try again later.", ...TOAST_WARNING });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      e.currentTarget.value = "";
    }
  }

  // ===== View / Download / Delete handlers =====
  async function handleViewDocumentById(doc: DocDTO) {
    // 1) PDF
    if (isPdf(doc)) {
      setViewingDocument({
        id: doc._id,
        title: doc.title || doc.fileName,
        file_name: doc.fileName,
        is_active: !!doc.isActive,
        created_at: doc.createdAt || new Date().toISOString(),
        file_size: doc.size || 0,
        contentType: doc.contentType,
        mode: "pdf",
        viewUrl: getPublicViewUrl(doc),
      });
      setIsViewDialogOpen(true);
      return;
    }

    // 2) Image
    if (isImage(doc)) {
      setViewingDocument({
        id: doc._id,
        title: doc.title || doc.fileName,
        file_name: doc.fileName,
        is_active: !!doc.isActive,
        created_at: doc.createdAt || new Date().toISOString(),
        file_size: doc.size || 0,
        contentType: doc.contentType,
        mode: "image",
        viewUrl: getPublicViewUrl(doc),
      });
      setIsViewDialogOpen(true);
      return;
    }

    // 3) Text-like
    if (isTextLike(doc)) {
      try {
        const res = await fetch(DOCS_API.text(doc._id), { credentials: "omit" });
        const data = res.ok ? await res.json() : {};
        const content = typeof data === "string" ? data : (data?.text ?? "");
        setViewingDocument({
          id: doc._id,
          title: doc.title || doc.fileName,
          file_name: doc.fileName,
          is_active: !!doc.isActive,
          created_at: doc.createdAt || new Date().toISOString(),
          file_size: doc.size || 0,
          contentType: doc.contentType,
          mode: "text",
          content: content || "No preview available",
        });
        setIsViewDialogOpen(true);
        return;
      } catch {
        // пойдём в unknown
      }
    }

    // 4) Office (docx/xlsx/pptx) — используем Google Viewer
    if (isOffice(doc)) {
      const raw = getPublicViewUrl(doc);
      setViewingDocument({
        id: doc._id,
        title: doc.title || doc.fileName,
        file_name: doc.fileName,
        is_active: !!doc.isActive,
        created_at: doc.createdAt || new Date().toISOString(),
        file_size: doc.size || 0,
        contentType: doc.contentType,
        mode: "office",
        viewUrl: asGoogleViewer(raw),
      });
      setIsViewDialogOpen(true);
      return;
    }

    // 5) Fallback
    setViewingDocument({
      id: doc._id,
      title: doc.title || doc.fileName,
      file_name: doc.fileName,
      is_active: !!doc.isActive,
      created_at: doc.createdAt || new Date().toISOString(),
      file_size: doc.size || 0,
      contentType: doc.contentType,
      mode: "unknown",
    });
    setIsViewDialogOpen(true);
  }


  function handleDownloadDocumentById(doc: DocDTO) {
    const url = getDownloadUrl(doc);
    if (!url) {
      toast.warning("Download unavailable", { description: "s3Url is missing for this file.", ...TOAST_WARNING });
      return;
    }
    window.open(url, "_blank", "noopener");
  }


  async function handleDeleteDocument(doc: DocDTO) {
    if (!clientId) {
      alert("ClientId is missing in route.");
      return;
    }
    if (!confirm(`Delete "${doc.fileName}"?`)) return;

    try {
      const res = await fetch(DOCS_API.remove(clientId, doc._id), {
        method: "DELETE",
        credentials: "omit",
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchDocuments();
      toast.success("Deleted", { description: "Document has been removed.", ...TOAST_SUCCESS });
    } catch (e: any) {
      toast.warning("Delete failed", { description: e?.message || "Try again later.", ...TOAST_WARNING });
      alert(e?.message || "Failed to delete");
    }
  }

  // ===== Save (PUT /clients/:idOrSlug/widget-config) =====
  const handleSaveSettings = async () => {
    if (!clientId) return;
    setSaving(true);
    setError(null);

    try {
      // общие поля
      const baseFields = {
        widgetTitle: settings.widget_title,
        welcomeMessage: settings.welcome_message,
        primaryColor: settings.primary_color,
        borderColor: (settings.border_color || settings.primary_color),
        backgroundColor: settings.background_color,
        textColor: settings.text_color,

        siteId: (settings.site_id || "").trim(),
        lang: settings.lang,
        position: settings.position,

        // поведение
        autostart: !!settings.autostart,
        autostartDelay: Number(settings.autostart_delay) || 0,
        autostartMode: settings.autostart_mode,
        autostartMessage: settings.autostart_message,
        autostartPrompt: settings.autostart_prompt,
        autostartCooldownHours: Number(settings.autostart_cooldown_hours) || 0,

        preserveHistory: !!settings.preserve_history,
        resetHistoryOnOpen: !!settings.reset_history_on_open,

        // НОВЫЕ UI-поля
        inputPlaceholder: settings.input_placeholder,
        headerBackgroundColor: settings.header_bg_color,
        headerTextColor: settings.header_text_color,
        assistantBubbleColor: settings.assistant_bubble_color,
        assistantBubbleTextColor: settings.assistant_bubble_text_color,
        userBubbleColor: settings.user_bubble_color,
        userBubbleTextColor: settings.user_bubble_text_color,
        bubbleBorderColor: settings.bubble_border_color,
        inputBackgroundColor: settings.input_bg_color,
        inputTextColor: settings.input_text_color,
        inputBorderColor: settings.input_border_color,
        sendButtonBackgroundColor: settings.send_button_bg_color,
        sendButtonIconColor: settings.send_button_icon_color,
        showAvatars: !!settings.show_avatars,
        showTimestamps: !!settings.show_timestamps,

        stream: !!settings.stream,

        // шрифты
        fontFamily: settings.font_family,
        fontCssUrl: settings.font_css_url,
        fontFileUrl: settings.font_file_url,

        // inline-автостарт — сырая строка, бэкенд сам распарсит
        inlineAutostart: settings.inline_autostart_raw.trim() || "",

        // LLM
        customSystemPrompt: settings.system_prompt,
        isActive: true,
      };


      let res: Response;

      if (logoFile) {
        // === multipart/form-data ===
        const fd = new FormData();
        Object.entries(baseFields).forEach(([k, v]) => {
          fd.append(k, typeof v === "string" ? v : JSON.stringify(v));
        });
        fd.append("logo", logoFile); // <— ключ совпадает с multer-s3.single("logo")

        res = await fetch(WIDGET_CFG_API.put(clientId), {
          method: "PUT",
          body: fd,
          credentials: "omit",
        });
      } else {
        // === обычный JSON ===
        res = await fetch(WIDGET_CFG_API.put(clientId), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify(baseFields),
        });
      }

      if (!res.ok) throw new Error(await res.text());
      const { config } = await res.json();

      setSettings((prev) => ({
        ...prev,
        widget_title: config?.widgetTitle ?? prev.widget_title,
        welcome_message: config?.welcomeMessage ?? prev.welcome_message,
        primary_color: config?.primaryColor ?? prev.primary_color,
        background_color: config?.backgroundColor ?? prev.background_color,
        text_color: config?.textColor ?? prev.text_color,
        border_color: config?.borderColor ?? prev.border_color,
        logo_url: config?.logo?.url ?? prev.logo_url,
        site_id: config?.siteId ?? prev.site_id,
        system_prompt:
          (config?.customSystemPrompt && String(config.customSystemPrompt).trim().length
            ? config.customSystemPrompt
            : prev.system_prompt),
      }));

      setLogoPreview(null);
      setLogoFile(null);

      toast.success("Saved", {
        description: "Widget settings were updated successfully.",
        ...TOAST_SUCCESS,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
      toast.warning("Save failed", {
        description: e?.message || "Please try again.",
        ...TOAST_WARNING,
      });
    } finally {
      setSaving(false);
    }
  };


  // ===== Helper to inject preview HTML into iframe (REAL chat, no inner scrollbars) =====
  function injectPreview() {
    if (!previewRef.current || !client) return;

    const iframe = previewRef.current;
    const doc = iframe.contentDocument || (iframe as any).ownerDocument;
    if (!doc) return;

    const shell = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <meta name="viewport" content="width=device-width,initial-scale=1"/>
          <title>Widget Preview</title>
        </head>
        <body>
          <div class="host">
            <div id="widget" class="card" aria-live="polite">
              <div class="head">
                <div class="logo" id="logo"></div>
                <div class="title" id="title"></div>
              </div>
              <div class="body">
<div class="messages" id="messages"></div>
<div class="composer">
  <form id="composer-form" class="form">
   <div class="field">
  <textarea id="inp" placeholder="Type your message..." aria-label="Type your message..."></textarea>
  <button id="send" type="submit" aria-label="Send">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M2 21l20-9L2 3l5 8-5 10z"></path>
    </svg>
  </button>
</div>
<div class="info">
  <div class="hint">Press Enter to send, Shift+Enter for new line</div>
  <div class="counter" id="counter">0/1000</div>
</div>
  </form>
</div>

              </div>
            </div>
          </div>
        </body>
      </html>`;
    doc.open(); doc.write(shell); doc.close();

    const style = doc.createElement("style");
    style.textContent = `
      :root { color-scheme: dark; }
html,body { height:100%; margin:0; background:#0a0a0a; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }

.host { height:100%; width:100%; display:flex; }
.card {
  flex:1; display:flex; flex-direction:column;
  background: var(--bg, #0d0f12);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px;
}
/* header */
.head{
  padding:12px 16px; display:flex; align-items:center; gap:10px;
  border-bottom:1px solid rgba(255,255,255,.07);
  background:#101215;
}
.title { font-weight:700; font-size:14px; color:#fff; }
.logo  { width:28px; height:28px; border-radius:8px; background:#222; object-fit:contain; }

/* layout */
.body{ flex:1; min-height:0; display:flex; flex-direction:column; background:#0d0f12; }
.messages{
  flex:1; padding:16px 20px; overflow:auto; display:flex; flex-direction:column; gap:14px;
}
.messages::-webkit-scrollbar{ width:8px; }
.messages::-webkit-scrollbar-thumb{ background: rgba(255,255,255,.15); border-radius:8px; }
.messages::-webkit-scrollbar-track{ background:transparent; }

/* message row with avatar */
.row{ display:flex; align-items:flex-end; gap:10px; }
.row.me{ justify-content:flex-end; }
.row.me .avatar{ order:2; }
.row.me .bubble{ order:1; }

/* avatar */
.avatar{
  width:28px; height:28px; border-radius:50%;
  background:#1e2228; border:2px solid rgba(255,255,255,.9);
  flex:0 0 28px; overflow:hidden; position:relative;
}
.avatar img{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }

/* bubble + meta */
.bubble{
  max-width:78%;
  background:#22252b; /* ассистент по умолчанию */
  color:#fff;
  border:1px solid rgba(255,255,255,.08);
  border-radius:16px;
  padding:10px 12px;
  line-height:1.5; word-break:break-word; white-space:pre-wrap;
  box-shadow:0 1px 0 rgba(0,0,0,.25);
}
.row.me .bubble{
  background:#2b2f36; color:#fff; border-color:transparent;
}
.meta{
  margin-top:4px; font-size:11px; color:rgba(235,239,245,.65);
}

/* typing state */
.typing .bubble{
  display:inline-flex; align-items:center; gap:6px; min-height:18px;
}
.dot{ width:6px; height:6px; border-radius:50%; background: currentColor; opacity:.4; animation: blink 1.2s infinite; }
.dot:nth-child(2){ animation-delay:.2s; }
.dot:nth-child(3){ animation-delay:.4s; }
@keyframes blink{ 0%,80%,100%{opacity:.2} 40%{opacity:1} }

/* === Composer (footer) === */
.composer { padding:16px 20px; border-top:1px solid rgba(255,255,255,.08); background:#0b0c0f; }
.form{ max-width:1100px; margin:0 auto; }
.form .field{ position:relative; isolation:isolate; }
.form textarea{
  display:block; width:100%; min-height:56px; resize:vertical;
  background:#16191e; color:#e9edf3;
  border:1px solid #2f3136; border-radius:16px;
  padding:12px 80px 12px 12px;
  outline:none; line-height:1.4; font-size:14px; font-family:inherit; caret-color:#fff;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.03), 0 1px 2px rgba(0,0,0,.4);
  box-sizing:border-box;
}
.form textarea::placeholder{ color:rgba(229,231,235,.55); }
.form button#send{
  position:absolute; right:12px; top:50%; transform:translateY(-50%);
  height:40px; width:40px; border:none; border-radius:9999px;
  background:#2b2f36; color:#fff; cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center;
  box-shadow:0 2px 6px rgba(0,0,0,.35); z-index:2;
}
.form button#send svg path{ fill:currentColor; }
.form button#send:disabled{ opacity:.6; cursor:default; }
.form .info{ margin-top:8px; display:flex; align-items:center; justify-content:space-between; gap:12px; font-size:12px; color:rgba(229,231,235,.55); }
.form .hint{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.form .counter{ white-space:nowrap; }

    `;
    (doc.head || doc.getElementsByTagName("head")[0]).appendChild(style);

    const script = doc.createElement("script");
    script.type = "text/javascript";
    script.textContent = `
      (function () {
    var cfg = {
      title: ${JSON.stringify(settings.widget_title)},
      welcome: ${JSON.stringify(settings.welcome_message)},
      pColor: ${JSON.stringify(settings.primary_color)},
      bgColor: ${JSON.stringify(settings.background_color)},
      tColor: ${JSON.stringify(settings.text_color)},
      bColor: ${JSON.stringify(settings.border_color || settings.primary_color)},
      logo: ${JSON.stringify(settings.logo_url)},
      siteId: ${JSON.stringify(settings.site_id || client?.siteId || "")},
      clientId: ${JSON.stringify(client?._id || "")},
      endpoint: "https://cloudcompliance.duckdns.org/api/aiw/chat"
    };

    // --- NEW: простейший storage для visitor/session в превью ---
    var NS = 'aiw-preview:' + (cfg.siteId || cfg.clientId || 'default');
    function load(k){ try { return JSON.parse(localStorage.getItem(NS+':'+k) || 'null'); } catch(_) { return null; } }
    function save(k,v){ try { localStorage.setItem(NS+':'+k, JSON.stringify(v)); } catch(_) {} }

    var visitorId = load('visitorId');
    if (!visitorId) { visitorId = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); save('visitorId', visitorId); }

    var session = load('session');
    if (!session) { session = { id: 's_' + Math.random().toString(36).slice(2), startedAt: Date.now() }; save('session', session); }

    // (опционально) если нужно рвать сессию по таймауту простоя:
    var SESSION_TTL_MS = 30 * 60 * 1000; // 30 минут
    if (Date.now() - (session.startedAt || 0) > SESSION_TTL_MS) {
      session = { id: 's_' + Math.random().toString(36).slice(2), startedAt: Date.now() };
      save('session', session);
    }

        var root = document.getElementById('widget');
        root.style.setProperty('--bg', cfg.bgColor);
        root.style.borderColor = cfg.bColor;
        document.getElementById('title').textContent = cfg.title;

        var logoEl = document.getElementById('logo');
        if (cfg.logo) {
          logoEl.style.background = "transparent";
          logoEl.style.backgroundImage = "url('"+cfg.logo+"')";
          logoEl.style.backgroundSize = "contain";
          logoEl.style.backgroundRepeat = "no-repeat";
          logoEl.style.backgroundPosition = "center";
        } else {
          logoEl.style.background = cfg.pColor;
        }

        var messages = document.getElementById('messages');
        var inp = document.getElementById('inp');
        var btn = document.getElementById('send');
        var form = document.getElementById('composer-form');
        append('assistant', cfg.welcome);

var counter = document.getElementById('counter');
var MAX = 1000;
function updateCounter() {
  var len = (inp.value || '').length;
  counter.textContent = len + '/' + MAX;
}
inp.addEventListener('input', function () {
  if (inp.value.length > MAX) inp.value = inp.value.slice(0, MAX);
  updateCounter();
});
updateCounter();
        function scrollToBottom(){ messages.scrollTop = messages.scrollHeight; }

function formatTime(d){ 
  try{ return new Date(d || Date.now()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  catch{ return ''; }
}

function makeAvatar(role){
  var a = document.createElement('div');
  a.className = 'avatar';
  if (role === 'assistant' && cfg.logo){
    var img = document.createElement('img');
    img.src = cfg.logo; img.alt = 'assistant';
    a.appendChild(img);
  }
  return a;
}

function append(role, text){
  var row = document.createElement('div');
  row.className = 'row ' + (role === 'user' ? 'me' : 'ai');

  row.appendChild(makeAvatar(role));

  var wrap = document.createElement('div');
  var bubble = document.createElement('div');
  bubble.className = 'bubble';
  var meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = formatTime(Date.now());

  if (role === 'assistant') {
    text = normalizeAssistantText(text);
  }
  bubble.textContent = text || '';

  wrap.appendChild(bubble);
  wrap.appendChild(meta);
  row.appendChild(wrap);
  messages.appendChild(row);
  scrollToBottom();

  return { row: row, bubble: bubble, meta: meta };
}


function showTyping(){
  var row = document.createElement('div');
  row.className='row ai typing';
  row.appendChild(makeAvatar('assistant'));
  var wrap = document.createElement('div');
  var bubble = document.createElement('div'); bubble.className='bubble';
  for (var i=0;i<3;i++){ var d=document.createElement('span'); d.className='dot'; bubble.appendChild(d); }
  wrap.appendChild(bubble);
  row.appendChild(wrap);
  messages.appendChild(row);
  scrollToBottom();
  return row;
}

function normalizeAssistantText(t) {
  if (!t) return '';
  t = String(t);

  // Разрешаем ведущие пробелы/переносы перед двоеточием
  // и аккуратно вырезаем нашу служебную метку
  t = t.replace(
    /^\s*:\s*(heartbeat|ok|confirm|gap|no-context|no-data)\b[:\-\s]*/i,
    ''
  );

  return t.trimStart();
}



        async function sendMessage(){
          var text = (inp.value || '').trim(); if (!text) return;
          append('user', text); inp.value=''; updateCounter(); btn.disabled = true;
          var typingRow = showTyping(); var typingBubble = typingRow.querySelector('.bubble');

          try {
            const res = await fetch(cfg.endpoint, {
              method: 'POST',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream, application/json' },
              body: JSON.stringify({
  messages: [{ role: 'user', content: text }],
  siteId: cfg.siteId || null,
  clientId: cfg.clientId || null,
  source: 'admin-preview',
  stream: false,
  // --- NEW: держим связность сессии в демо ---
  sessionId: session.id,
  visitorId: visitorId
})
            });

            if (!res.ok) {
              const errText = await res.text().catch(()=> '');
              typingBubble.textContent = 'Error ' + res.status + (errText ? (': ' + errText) : '');
            } else {
              const ctype = (res.headers.get('content-type') || '').toLowerCase();
              if (ctype.includes('text/event-stream') && res.body) {
                typingBubble.textContent = '';
                const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
                while (true) {
                  const { value, done } = await reader.read(); if (done) break;
                  buf += dec.decode(value, { stream:false });
                  const chunks = buf.split('\\n\\n'); buf = chunks.pop() || '';
                  for (const chunk of chunks) {
                    const line = chunk.split('\\n').find(l => l.startsWith('data:')) || chunk.trim();
                    let payload = line.replace(/^data:\\s?/, '').trim();
                    if (!payload || payload === '[DONE]') continue;
                    try { const j = JSON.parse(payload); typingBubble.textContent += (j.delta || j.text || j.content || ''); }
                    catch { typingBubble.textContent += payload; }
                    scrollToBottom();
                  }
                }
              } else {
                const data = await res.json().catch(()=> ({}));
              var sid = (data && (data.sessionId || (data.session && data.session.id))) || null;
if (sid && sid !== session.id) {
  session.id = sid;
  session.startedAt = Date.now();
  save('session', session);
}
                const msg = data.reply || data.answer || data.message || data.text ||
                  (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No response';
                typingBubble.textContent = normalizeAssistantText(msg);
              }
            }
          } catch (e) {
            typingBubble.textContent = 'Network error: ' + (e && e.message ? e.message : 'request failed');
} finally {
  // превращаем typing в обычный ассистентский bubble с таймстампом
  try{
    typingRow.classList.remove('typing');
    var meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = formatTime(Date.now());
    typingRow.lastElementChild.appendChild(meta); // добавить под bubble
  }catch(e){}
  btn.disabled = false; scrollToBottom();
}
        }

        btn.addEventListener('click', sendMessage);
        inp.addEventListener('keydown', function (ev) {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault();
    form.requestSubmit(); // отправляем форму
  }
});
form.addEventListener('submit', function (ev) {
  ev.preventDefault();
  sendMessage();
});
btn.addEventListener('click', function (ev) {
  ev.preventDefault();
  form.requestSubmit();
});

      })();
    `;
    (doc.body || doc.getElementsByTagName("body")[0]).appendChild(script);
  }

  // ===== Re-inject when demo tab is active & data changes =====
  useEffect(() => {
    if (activeTab !== "demo") return;
    injectPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, client, settings]);

  // ===== Render =====
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4 mb-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </div>

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/dashboard">Clients</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{client?.name ?? "Loading…"}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex items-center gap-3 mt-3">
            {(logoPreview || settings.logo_url) && (
              <img
                src={logoPreview || settings.logo_url || ""}
                alt={client?.name || "Logo"}
                className="h-10 w-10 rounded object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{client?.name ?? "…"}</h1>
              <p className="text-sm text-muted-foreground">Manage client configuration and content</p>
            </div>
          </div>
        </div>
      </header>

      {/* Loading / Error gates */}
      {loading ? (
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <div className="container mx-auto px-6 py-8">
          <div className="p-4 border border-destructive rounded-md text-destructive">{error}</div>
        </div>
      ) : (
        /* Main */
        <div className="container mx-auto px-6 py-8">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="setup">Widget Setup</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="code">Widget Code</TabsTrigger>
              <TabsTrigger value="demo">Demo</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Widget Setup */}
            <TabsContent value="setup" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Configuration</CardTitle>
                  <CardDescription>Customize your AI widget appearance and behavior</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Logo */}
                  <div className="space-y-2">
                    <Label>Widget Logo</Label>
                    <div className="space-y-3">
                      {(logoPreview || settings.logo_url) && (
                        <div className="relative inline-block">
                          <img
                            src={logoPreview || settings.logo_url || ""}
                            alt="Logo preview"
                            className="h-20 w-20 rounded object-contain border border-border bg-muted"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={handleRemoveLogo}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input type="file" accept=".png" onChange={handleLogoChange} className="max-w-xs" />
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PNG format only, max 2MB. Recommended size: 200x200px
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="widget_title">Widget Title</Label>
                    <Input
                      id="widget_title"
                      value={settings.widget_title}
                      onChange={(e) => setSettings({ ...settings, widget_title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="welcome_message">Welcome Message</Label>
                    {/* Site ID */}
                    <div className="space-y-2">
                      <Label htmlFor="site_id">Site ID</Label>
                      <Input
                        id="site_id"
                        placeholder="example.com or example.com::default"
                        value={settings.site_id}
                        onChange={(e) => setSettings({ ...settings, site_id: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used to associate sessions/messages with this client for analytics.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Language */}
                      <div className="space-y-2">
                        <Label htmlFor="lang">Language</Label>
                        <select
                          id="lang"
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={settings.lang}
                          onChange={(e) => setSettings({ ...settings, lang: e.target.value })}
                        >
                          <option value="en">English (en)</option>
                          <option value="ru">Русский (ru)</option>
                        </select>
                      </div>

                      {/* Position */}
                      <div className="space-y-2">
                        <Label htmlFor="position">Widget Position</Label>
                        <select
                          id="position"
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={settings.position}
                          onChange={(e) => setSettings({ ...settings, position: e.target.value as "br" | "bl" })}
                        >
                          <option value="br">Bottom Right</option>
                          <option value="bl">Bottom Left</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="welcome_message">Welcome Message</Label>
                      <Input
                        id="welcome_message"
                        placeholder="Hi! How can I help you today?"
                        value={settings.welcome_message}
                        onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        This is the initial greeting the widget displays when opened.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="input_placeholder">Input Placeholder</Label>
                      <Input
                        id="input_placeholder"
                        placeholder="Type your message..."
                        value={settings.input_placeholder}
                        onChange={(e) => setSettings({ ...settings, input_placeholder: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Placeholder text inside the message input. Leave empty to use a default per language.
                      </p>
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Primary Color</Label>
                      <Input
                        id="primary_color"
                        type="color"
                        value={settings.primary_color}
                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="border_color">Border Color</Label>
                      <Input
                        id="border_color"
                        type="color"
                        value={settings.border_color}
                        onChange={(e) => setSettings({ ...settings, border_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="background_color">Background Color</Label>
                      <Input
                        id="background_color"
                        type="color"
                        value={settings.background_color}
                        onChange={(e) => setSettings({ ...settings, background_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="text_color">Text Color</Label>
                      <Input
                        id="text_color"
                        type="color"
                        value={settings.text_color}
                        onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Advanced chat colors */}
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="header_bg_color">Header Background (optional)</Label>
                      <Input
                        id="header_bg_color"
                        placeholder="#101215"
                        type="color"
                        value={settings.header_bg_color}
                        onChange={(e) => setSettings({ ...settings, header_bg_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="header_text_color">Header Text (optional)</Label>
                      <Input
                        id="header_text_color"
                        placeholder="#ffffff"
                        value={settings.header_text_color}
                        onChange={(e) => setSettings({ ...settings, header_text_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assistant_bubble_color">Assistant Bubble Background</Label>
                      <Input
                        id="assistant_bubble_color"
                        placeholder="#22252b"
                        value={settings.assistant_bubble_color}
                        onChange={(e) => setSettings({ ...settings, assistant_bubble_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assistant_bubble_text_color">Assistant Bubble Text</Label>
                      <Input
                        id="assistant_bubble_text_color"
                        placeholder="#ffffff"
                        value={settings.assistant_bubble_text_color}
                        onChange={(e) => setSettings({ ...settings, assistant_bubble_text_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user_bubble_color">User Bubble Background</Label>
                      <Input
                        id="user_bubble_color"
                        placeholder="#2b2f36"
                        value={settings.user_bubble_color}
                        onChange={(e) => setSettings({ ...settings, user_bubble_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user_bubble_text_color">User Bubble Text</Label>
                      <Input
                        id="user_bubble_text_color"
                        placeholder="#ffffff"
                        value={settings.user_bubble_text_color}
                        onChange={(e) => setSettings({ ...settings, user_bubble_text_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bubble_border_color">Bubble Border (optional)</Label>
                      <Input
                        id="bubble_border_color"
                        placeholder="#333333"
                        value={settings.bubble_border_color}
                        onChange={(e) => setSettings({ ...settings, bubble_border_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="input_bg_color">Input Background</Label>
                      <Input
                        id="input_bg_color"
                        placeholder="#16191e"
                        value={settings.input_bg_color}
                        onChange={(e) => setSettings({ ...settings, input_bg_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="input_text_color">Input Text</Label>
                      <Input
                        id="input_text_color"
                        placeholder="#e9edf3"
                        value={settings.input_text_color}
                        onChange={(e) => setSettings({ ...settings, input_text_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="input_border_color">Input Border</Label>
                      <Input
                        id="input_border_color"
                        placeholder="#2f3136"
                        value={settings.input_border_color}
                        onChange={(e) => setSettings({ ...settings, input_border_color: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="send_button_bg_color">Send Button Background</Label>
                      <Input
                        id="send_button_bg_color"
                        placeholder="#2b2f36"
                        value={settings.send_button_bg_color}
                        onChange={(e) => setSettings({ ...settings, send_button_bg_color: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="send_button_icon_color">Send Button Icon</Label>
                      <Input
                        id="send_button_icon_color"
                        placeholder="#ffffff"
                        value={settings.send_button_icon_color}
                        onChange={(e) => setSettings({ ...settings, send_button_icon_color: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Fonts</Label>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="font_family">font-family</Label>
                        <Input
                          id="font_family"
                          placeholder='"Inter", system-ui, sans-serif'
                          value={settings.font_family}
                          onChange={(e) =>
                            setSettings({ ...settings, font_family: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          CSS font-family string used in the widget.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="font_css_url">Font CSS URL</Label>
                        <Input
                          id="font_css_url"
                          placeholder="https://fonts.googleapis.com/css2?..."
                          value={settings.font_css_url}
                          onChange={(e) =>
                            setSettings({ ...settings, font_css_url: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: link to external CSS (e.g., Google Fonts).
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="font_file_url">Font file URL (woff2/woff/ttf)</Label>
                        <Input
                          id="font_file_url"
                          placeholder="https://.../my-font.woff2"
                          value={settings.font_file_url}
                          onChange={(e) =>
                            setSettings({ ...settings, font_file_url: e.target.value })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          This direct URL will be used to load the font (from Amazon AWS S3 storage).
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Upload font file</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="font_file_input"
                            type="file"
                            accept=".woff,.woff2,.ttf,.otf"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={fontUploading || !clientId}
                            onClick={async () => {
                              const input = document.getElementById(
                                "font_file_input"
                              ) as HTMLInputElement | null;
                              if (!input || !input.files || input.files.length === 0) {
                                alert("Please choose a font file first");
                                return;
                              }

                              const file = input.files[0];
                              const fd = new FormData();
                              fd.append("font", file);
                              // передадим siteId, чтобы на бэке можно было сделать тот же фильтр
                              fd.append("siteId", (settings.site_id || client?.siteId || ""));

                              try {
                                setFontUploading(true);
                                const resp = await fetch(
                                  `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(
                                    clientId || ""
                                  )}/widget-font`,
                                  {
                                    method: "POST",
                                    body: fd,
                                    credentials: "omit",
                                  }
                                );

                                const data = await resp.json();
                                if (!resp.ok || !data.ok) {
                                  console.error("Font upload error", data);
                                  toast.warning("Font upload failed", {
                                    description: data.error || "Unknown error",
                                    ...TOAST_WARNING,
                                  });
                                  return;
                                }

                                setSettings((prev) => ({
                                  ...prev,
                                  font_file_url: data.url || prev.font_file_url,
                                }));
                                toast.success("Font uploaded", {
                                  description: "Font file URL was updated.",
                                  ...TOAST_SUCCESS,
                                });
                              } catch (e: any) {
                                console.error("Font upload error", e);
                                toast.warning("Font upload failed", {
                                  description: String(e?.message || e),
                                  ...TOAST_WARNING,
                                });
                              } finally {
                                setFontUploading(false);
                              }
                            }}
                          >
                            {fontUploading ? "Uploading..." : "Upload"}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          The uploaded file will be stored in S3 and its URL saved into the field on the left.
                        </p>
                      </div>
                    </div>
                  </div>




                  {/* Behavior */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Behavior</Label>

                    {/* Preserve / Reset */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <div className="font-medium text-sm">Preserve History</div>
                          <div className="text-xs text-muted-foreground">Keep chat in localStorage</div>
                        </div>
                        <Switch
                          checked={settings.preserve_history}
                          onCheckedChange={(v) => setSettings({ ...settings, preserve_history: !!v })}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <div className="font-medium text-sm">Reset History on Open</div>
                          <div className="text-xs text-muted-foreground">Clear chat every open</div>
                        </div>
                        <Switch
                          checked={settings.reset_history_on_open}
                          onCheckedChange={(v) => setSettings({ ...settings, reset_history_on_open: !!v })}
                        />
                      </div>
                    </div>

                    {/* Autostart */}
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Autostart</div>
                          <div className="text-xs text-muted-foreground">Show first message automatically</div>
                        </div>
                        <Switch
                          checked={settings.autostart}
                          onCheckedChange={(v) => setSettings({ ...settings, autostart: !!v })}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="autostart_mode">Mode</Label>
                          <select
                            id="autostart_mode"
                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            value={settings.autostart_mode}
                            onChange={(e) => setSettings({ ...settings, autostart_mode: e.target.value as "local" | "ai" })}
                            disabled={!settings.autostart}
                          >
                            <option value="local">local</option>
                            <option value="ai">ai</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="autostart_delay">Delay (ms)</Label>
                          <Input
                            id="autostart_delay"
                            type="number"
                            min={0}
                            value={settings.autostart_delay}
                            onChange={(e) => setSettings({ ...settings, autostart_delay: Number(e.target.value || 0) })}
                            disabled={!settings.autostart}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="autostart_cooldown">Cooldown (hours)</Label>
                          <Input
                            id="autostart_cooldown"
                            type="number"
                            min={0}
                            value={settings.autostart_cooldown_hours}
                            onChange={(e) => setSettings({ ...settings, autostart_cooldown_hours: Number(e.target.value || 0) })}
                            disabled={!settings.autostart}
                          />
                        </div>
                      </div>

                      {settings.autostart_mode === "local" ? (
                        <div className="space-y-1">
                          <Label htmlFor="autostart_message">Autostart Message (local mode)</Label>
                          <Input
                            id="autostart_message"
                            value={settings.autostart_message}
                            onChange={(e) => setSettings({ ...settings, autostart_message: e.target.value })}
                            disabled={!settings.autostart}
                            placeholder="Hello! Need help choosing a plan?"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Label htmlFor="autostart_prompt">Autostart Prompt (AI mode)</Label>
                          <Textarea
                            id="autostart_prompt"
                            rows={3}
                            value={settings.autostart_prompt}
                            onChange={(e) => setSettings({ ...settings, autostart_prompt: e.target.value })}
                            disabled={!settings.autostart}
                            placeholder="Write a warm opening message for a first-time visitor…"
                          />
                        </div>
                      )}

                      {/* Дополнительные флаги поведения */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <div className="font-medium text-sm">Show avatars</div>
                            <div className="text-xs text-muted-foreground">Display assistant/user avatars in chat</div>
                          </div>
                          <Switch
                            checked={settings.show_avatars}
                            onCheckedChange={(v) => setSettings({ ...settings, show_avatars: !!v })}
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <div className="font-medium text-sm">Show timestamps</div>
                            <div className="text-xs text-muted-foreground">Display time under each message</div>
                          </div>
                          <Switch
                            checked={settings.show_timestamps}
                            onCheckedChange={(v) => setSettings({ ...settings, show_timestamps: !!v })}
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <div className="font-medium text-sm">Streaming answers</div>
                            <div className="text-xs text-muted-foreground">Stream assistant responses token-by-token</div>
                          </div>
                          <Switch
                            checked={settings.stream}
                            onCheckedChange={(v) => setSettings({ ...settings, stream: !!v })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Inline autostart (JSON) */}
                    <div className="space-y-1">
                      <Label htmlFor="inline_autostart_raw">Inline autostart script (JSON)</Label>
                      <Textarea
                        id="inline_autostart_raw"
                        rows={5}
                        className="font-mono text-xs"
                        placeholder='{"enabled":true,"mode":"cooldown","cooldownMinutes":60,"script":[{"text":"Hi!","delayMs":0}]}'
                        value={settings.inline_autostart_raw}
                        onChange={(e) => setSettings({ ...settings, inline_autostart_raw: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Raw JSON for inline autostart scenario. Backend will validate &amp; parse it.
                      </p>
                    </div>
                  </div>


                  {/* System Prompt */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="system_prompt">Custom System Prompt (Optional)</Label>
                    <Textarea
                      id="system_prompt"
                      value={settings.system_prompt}
                      onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                      placeholder="Leave empty to use default prompt…"
                    />
                    <p className="text-xs text-muted-foreground">
                      This prompt defines how the AI assistant behaves. If your knowledge base has context, it will be appended.
                    </p>
                    {settings.system_prompt && (
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> Your custom prompt is active.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveSettings} disabled={saving}>
                      {saving ? "Saving…" : "Save Settings"}
                    </Button>
                    {error && <span className="text-sm text-destructive self-center">{error}</span>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            {/* Knowledge Base */}
            <TabsContent value="knowledge" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Documents</CardTitle>
                  <CardDescription>Upload TXT, PDF, DOCX (up to 10MB)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload TXT, PDF, or DOCX files
                      </p>
                      <div className="flex flex-col items-center gap-2">
                        <Input
                          type="file"
                          accept=".txt,.pdf,.docx"
                          className="max-w-xs mx-auto"
                          onChange={handleFileSelected}
                          disabled={uploading}
                        />
                        {uploadProgress !== null && (
                          <p className="text-xs text-muted-foreground">Uploading… {uploadProgress}%</p>
                        )}
                        {uploadError && (
                          <p className="text-xs text-destructive">{uploadError}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Upload documents containing information about your products, services, or FAQs.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Your Documents</h3>

                      {docsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : docsError ? (
                        <div className="p-3 border border-destructive rounded text-destructive text-sm">
                          {docsError}
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No documents yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div
                              key={doc._id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="font-medium">{doc.title || doc.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.fileName}
                                  {doc.size ? ` • ${(doc.size / 1024).toFixed(1)} KB` : ""} •{" "}
                                  {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ""}
                                  {doc.contentType ? ` • ${doc.contentType}` : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDocumentById(doc)}
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadDocumentById(doc)}
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant={doc.isActive ? "default" : "outline"} size="sm" disabled>
                                  {doc.isActive ? "Active" : "Inactive"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDocument(doc)}
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Users</CardTitle>
                  <CardDescription>Manage users who have access to this client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userEmail">Add User by Email</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="userEmail"
                          type="email"
                          placeholder="user@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                        />
                        <Button disabled>Add User</Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        The user must already have an account to be added.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Current Users</h3>

                    {usersLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : usersError ? (
                      <div className="p-3 border border-destructive rounded text-destructive text-sm">
                        {usersError}
                      </div>
                    ) : clientUsers.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No users found for this client.</div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium">Name</th>
                              <th className="text-left p-3 font-medium">Email</th>
                              <th className="text-left p-3 font-medium">Created</th>
                              <th className="text-right p-3 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientUsers.map((u) => {
                              const id = u.id || u._id || "";
                              const created = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—";
                              return (
                                <tr key={id} className="border-t">
                                  <td className="p-3">{u.name || "—"}</td>
                                  <td className="p-3">{u.email || "—"}</td>
                                  <td className="p-3 text-muted-foreground">{created}</td>
                                  <td className="p-3 text-right">
                                    <Button variant="destructive" size="sm" disabled>
                                      Remove
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Widget Code */}
            <TabsContent value="code" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Installation Instructions</CardTitle>
                  <CardDescription>Copy this code to your website</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Step 1: Your API Key</h3>
                    <div className="flex gap-2">
                      <Input value={client?.apiKey || ""} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        onClick={() => client?.apiKey && copyToClipboard(client.apiKey!)}
                        disabled={!client?.apiKey}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Keep it secure. Don’t share publicly.</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Step 2: Add Embed Code</h3>
                    <p className="text-sm text-muted-foreground">Paste before the closing &lt;/body&gt; tag:</p>
                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                        {generateEmbedCode(client?.apiKey || "pk_live_xxx")}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(generateEmbedCode(client?.apiKey || "pk_live_xxx"))}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Step 3: Test Your Widget</h3>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/demo/${client?.slug || ""}`, "_blank")}
                      disabled={!client?.slug}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Demo Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

{/* Demo */}
<TabsContent value="demo">
  <Card className="bg-[#0a0a0a] border-gray-800 overflow-visible">
    <CardHeader>
      <CardTitle className="text-gray-100">Widget Preview</CardTitle>
      <CardDescription className="text-gray-400">
        Test your AI chat widget in action.
      </CardDescription>
    </CardHeader>

    {/* убираем дефолтный паддинг CardContent и задаём свой */}
    <CardContent className="p-0">
      <div className="p-6">
        <iframe
          key={settings.site_id || client?.siteId}
          src={
            "https://cloudcompliance.duckdns.org/aiw/widget-frame.html" +
            `?siteId=${encodeURIComponent(settings.site_id || client?.siteId)}` +
            "&mode=inline&fit=container"
          }
          className="w-full h-[600px] block"
          style={{ border: "none" }}
          title="AI Widget Preview"
        />
      </div>
    </CardContent>
  </Card>
</TabsContent>




            {/* Analytics (NEW) */}
            <TabsContent value="analytics">
              <AnalyticsTab siteId={settings.site_id || client?.siteId} />
            </TabsContent>
          </Tabs>

          {/* View Document Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-5xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle>{viewingDocument?.title}</DialogTitle>
                <DialogDescription>
                  {viewingDocument?.file_name} •{" "}
                  {viewingDocument?.file_size ? (viewingDocument.file_size / 1024).toFixed(1) : 0} KB
                  {viewingDocument?.contentType ? ` • ${viewingDocument.contentType}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="h-[65vh] border rounded overflow-hidden bg-muted/20">
                {viewingDocument?.mode === "pdf" && viewingDocument.viewUrl && (
                  <iframe
                    title="Preview PDF"
                    src={viewingDocument.viewUrl}
                    className="w-full h-full"
                  />
                )}

                {viewingDocument?.mode === "image" && viewingDocument.viewUrl && (
                  <div className="w-full h-full flex items-center justify-center bg-black/50">
                    <img
                      src={viewingDocument.viewUrl}
                      alt={viewingDocument.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}

                {viewingDocument?.mode === "text" && (
                  <ScrollArea className="h-full w-full p-4">
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {viewingDocument.content || "No content"}
                    </pre>
                  </ScrollArea>
                )}

                {viewingDocument?.mode === "office" && viewingDocument.viewUrl && (
                  <iframe
                    title="Preview Document"
                    src={viewingDocument.viewUrl}
                    className="w-full h-full"
                  />
                )}

                {viewingDocument?.mode === "unknown" && (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                    Preview not available. Use Download.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    viewingDocument &&
                    window.open(
                      getPublicViewUrl(documents.find(d => d._id === viewingDocument.id) || { _id: viewingDocument.id } as DocDTO),
                      "_blank",
                      "noopener"
                    )
                  }
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in new tab
                </Button>
                <Button
                  onClick={() => {
                    if (!viewingDocument) return;
                    const doc = documents.find(d => d._id === viewingDocument.id);
                    if (!doc || !doc.s3Url) {
                      toast.warning("Download unavailable", { description: "s3Url is missing for this file.", ...TOAST_WARNING });
                      return;
                    }
                    const url = getDownloadUrl(doc);
                    window.open(url, "_blank", "noopener");
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
