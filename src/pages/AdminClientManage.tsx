// src/pages/AdminClientManage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Copy, Download, ExternalLink, Eye, Image as ImageIcon, Trash2, Upload, X,
  AlertCircle,
} from "lucide-react";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const PUBLIC_API_ROOT = "https://cloudcompliance.duckdns.org/api";

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
  };
  stats?: { documents: number; users: number };
};

type UserDTO = {
  id?: string;
  _id?: string;
  email?: string;
  name?: string;
  createdAt?: string;
  // любые другие поля, которые возвращает твой бэкенд
};

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant.

CONTENT RULES:
1. ALWAYS answer ONLY based on the knowledge base provided
2. For general questions - give a BRIEF overview (2-3 sentences) using ONLY information from the knowledge base
3. If specific information exists in the knowledge base - use it with exact details
4. If information is not in the knowledge base - honestly say so and suggest contacting support
5. DO NOT use general knowledge - ONLY the knowledge base provided`;

type Document = {
  id: string;
  title: string;
  file_name: string;
  is_active: boolean;
  created_at: string;
  file_size: number;
  content?: string;
};

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

  // ===== Widget settings UI (from client.config) =====
  const [settings, setSettings] = useState({
    widget_title: "AI Assistant",
    welcome_message: "Hi! How can I help you today?",
    primary_color: "#2927ea",
    background_color: "#0f0f0f",
    text_color: "#ffffff",
    border_color: "#2927ea",
    logo_url: null as string | null,
    system_prompt: DEFAULT_SYSTEM_PROMPT,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // demo placeholders for docs (позже подключишь реальные /clients/:id/documents)
  const documents: Document[] = useMemo(
    () => [
      { id: "1", title: "Pricing", file_name: "pricing.pdf", is_active: true, created_at: new Date().toISOString(), file_size: 24000, content: "Sample content…" },
      { id: "2", title: "FAQ", file_name: "faq.docx", is_active: false, created_at: new Date().toISOString(), file_size: 12300, content: "Sample content…" },
    ],
    []
  );

  // ===== Fetch client by :clientId (id or slug) =====
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

        const cfg = data.config || {};
        setSettings({
          widget_title: cfg.widgetTitle ?? "AI Assistant",
          welcome_message: cfg.welcomeMessage ?? "Hi! How can I help you today?",
          primary_color: cfg.primaryColor ?? "#2927ea",
          background_color: cfg.backgroundColor ?? "#0f0f0f",
          text_color: cfg.textColor ?? "#ffffff",
          border_color: cfg.borderColor ?? "#2927ea",
          logo_url: cfg.logoUrl ?? null,
          system_prompt:
            cfg.systemPrompt && cfg.systemPrompt.trim().length
              ? cfg.systemPrompt
              : DEFAULT_SYSTEM_PROMPT,
        });
        setLogoPreview(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load client");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [clientId]);

  // ===== Fetch REAL users of client (/clients/:idOrSlug/users) =====
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

        // нормализация в унифицированный массив
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
    return () => {
      alive = false;
    };
  }, [clientId]);

  // ===== UI handlers =====
  const [emailInput, setEmailInput] = useState("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };
  const handleRemoveLogo = () => setLogoPreview(null);
  const handleViewDocument = (doc: Document) => {
    setViewingDocument(doc);
    setIsViewDialogOpen(true);
  };
  const handleDownloadDocument = (doc: Document) => {
    console.log("download", doc.id);
  };
  const copyToClipboard = (t: string) => navigator.clipboard?.writeText(t);
  const generateEmbedCode = (apiKey: string) => `<!-- AI Sales Widget -->
<script>
  window.salesWidgetConfig = { apiKey: '${apiKey}' };
</script>
<script src="${window.location.origin}/widget-embed.js"></script>`;

  // ===== Save (PATCH /clients/:slug) — partial config update =====
  const handleSaveSettings = async () => {
    if (!client) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        config: {
          widgetTitle: settings.widget_title,
          welcomeMessage: settings.welcome_message,
          primaryColor: settings.primary_color,
          backgroundColor: settings.background_color,
          textColor: settings.text_color,
          borderColor: settings.border_color,
          logoUrl: logoPreview ?? settings.logo_url ?? null,
          systemPrompt: settings.system_prompt,
        },
      };
      const res = await fetch(`${PUBLIC_API_ROOT}/clients/${encodeURIComponent(client.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = (await res.json()) as ClientDTO;
      setClient(updated);

      const cfg = updated.config || {};
      setSettings({
        widget_title: cfg.widgetTitle ?? settings.widget_title,
        welcome_message: cfg.welcomeMessage ?? settings.welcome_message,
        primary_color: cfg.primaryColor ?? settings.primary_color,
        background_color: cfg.backgroundColor ?? settings.background_color,
        text_color: cfg.textColor ?? settings.text_color,
        border_color: cfg.borderColor ?? settings.border_color,
        logo_url: cfg.logoUrl ?? settings.logo_url,
        system_prompt:
          cfg.systemPrompt && cfg.systemPrompt.trim().length
            ? cfg.systemPrompt
            : settings.system_prompt,
      });
      setLogoPreview(null);
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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
          <Tabs defaultValue="setup" className="space-y-6">
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
                    <Input
                      id="welcome_message"
                      value={settings.welcome_message}
                      onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                    />
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
                      <Input type="file" className="max-w-xs mx-auto" disabled />
                      <p className="text-xs text-muted-foreground mt-3">
                        Upload documents containing information about your products, services, or FAQs.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Your Documents</h3>
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.file_name} • {(doc.file_size / 1024).toFixed(1)} KB •{" "}
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDocument(doc)} title="View">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc)} title="Download">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant={doc.is_active ? "default" : "outline"} size="sm" disabled>
                              {doc.is_active ? "Active" : "Inactive"}
                            </Button>
                            <Button variant="ghost" size="sm" disabled>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users (REAL data) */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Users</CardTitle>
                  <CardDescription>Manage users who have access to this client</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add user form (пока заглушка) */}
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
                        onClick={() => client?.apiKey && copyToClipboard(client.apiKey)}
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
              <Card className="bg-[#0a0a0a] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-gray-100">Widget Preview</CardTitle>
                  <CardDescription className="text-gray-400">
                    Test your AI chat widget in action.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="border border-gray-800 rounded-lg overflow-hidden"
                    style={{ height: "600px", backgroundColor: "#1a1a1a" }}
                  >
                    <iframe src={`/demo/${client?.slug || ""}`} className="w-full h-full" title="Widget Demo" />
                  </div>
                  <p className="text-xs text-gray-400 mt-3">This is how your widget will appear to visitors.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics (placeholder) */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics</CardTitle>
                  <CardDescription>Coming soon</CardDescription>
                </CardHeader>
                <CardContent>…</CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* View Document Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{viewingDocument?.title}</DialogTitle>
                <DialogDescription>
                  {viewingDocument?.file_name} •{" "}
                  {viewingDocument?.file_size ? (viewingDocument.file_size / 1024).toFixed(1) : 0} KB
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {viewingDocument?.content || "No content available"}
                </pre>
              </ScrollArea>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => viewingDocument && handleDownloadDocument(viewingDocument)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
