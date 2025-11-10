// src/pages/AdminClientManage.tsx
import { useEffect, useState, useRef } from "react";
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
import { toast } from "sonner";

const TOAST_SUCCESS = {
  style: { background: "#303036", color: "#ffffff", border: "1px solid #14532d" },
};
const TOAST_WARNING = {
  style: { background: "#303036", color: "#ed0e0eff", border: "1px solid #14532d" },
};

const PUBLIC_API_ROOT = "https://cloudcompliance.duckdns.org/api";
const API_ORIGIN = new URL(PUBLIC_API_ROOT).origin;

// ===== Documents API helpers =====
const DOCS_API = {
  list:     (id: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(id)}/documents`,
  upload:   (id: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(id)}/documents`,
  download: (docId: string) => `${PUBLIC_API_ROOT}/client-documents/${encodeURIComponent(docId)}/download`,
  text:     (docId: string) => `${PUBLIC_API_ROOT}/client-documents/${encodeURIComponent(docId)}/text`,
  remove:   (id: string, docId: string) => `${PUBLIC_API_ROOT}/clients/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
};

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
};

type DocumentDialog = {
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

  // ===== Active tab (controlled) =====
  const [activeTab, setActiveTab] = useState<
    "setup" | "knowledge" | "users" | "code" | "demo" | "analytics"
  >("setup");

  // ===== Widget settings UI (from WidgetConfig) =====
  const [settings, setSettings] = useState({
    widget_title: "AI Assistant",
    welcome_message: "Hi! How can I help you today?",
    primary_color: "#2927ea",
    background_color: "#0f0f0f",
    text_color: "#ffffff",
    border_color: "#2927ea",
    logo_url: null as string | null,
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    site_id: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
              widget_title:     cfg.widgetTitle      ?? "AI Assistant",
              welcome_message:  cfg.welcomeMessage   ?? "Hi! How can I help you today?",
              primary_color:    cfg.primaryColor     ?? "#2927ea",
              background_color: cfg.backgroundColor  ?? "#0f0f0f",
              text_color:       cfg.textColor        ?? "#ffffff",
              border_color:     cfg.borderColor      ?? "#2927ea",
              logo_url:         cfg.logoUrl ?? null,
              system_prompt:
                (cfg?.customSystemPrompt && String(cfg.customSystemPrompt).trim().length
                  ? cfg.customSystemPrompt
                  : DEFAULT_SYSTEM_PROMPT),
              site_id:          cfg.siteId ?? "",
            });
            setLogoPreview(null);
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
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };
  const handleRemoveLogo = () => setLogoPreview(null);

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
    try {
      const res = await fetch(DOCS_API.text(doc._id), { credentials: "omit" });
      if (res.ok) {
        const data = await res.json();
        const content = typeof data === "string" ? data : (data?.text ?? "");
        setViewingDocument({
          id: doc._id,
          title: doc.title || doc.fileName,
          file_name: doc.fileName,
          is_active: !!doc.isActive,
          created_at: doc.createdAt || new Date().toISOString(),
          file_size: doc.size || 0,
          content: content || "No preview available",
        });
        setIsViewDialogOpen(true);
        return;
      }
    } catch (_) {}
    setViewingDocument({
      id: doc._id,
      title: doc.title || doc.fileName,
      file_name: doc.fileName,
      is_active: !!doc.isActive,
      created_at: doc.createdAt || new Date().toISOString(),
      file_size: doc.size || 0,
      content: "Preview is not available for this file type. Use Download.",
    });
    setIsViewDialogOpen(true);
  }

  function handleDownloadDocumentById(doc: DocDTO) {
    const url = DOCS_API.download(doc._id);
    window.open(url, "_blank");
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
      const payload: any = {
        widgetTitle:        settings.widget_title,
        welcomeMessage:     settings.welcome_message,
        primaryColor:       settings.primary_color,
        backgroundColor:    settings.background_color,
        textColor:          settings.text_color,
        borderColor:        settings.border_color,
        customSystemPrompt: settings.system_prompt,
        logoUrl:            logoPreview ?? settings.logo_url ?? null,
        isActive:           true,
      };
      if (settings.site_id && settings.site_id.trim()) payload.siteId = settings.site_id.trim();

      const res = await fetch(WIDGET_CFG_API.put(clientId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const { config } = await res.json();

      setSettings((prev) => ({
        ...prev,
        widget_title:     config?.widgetTitle      ?? prev.widget_title,
        welcome_message:  config?.welcomeMessage   ?? prev.welcome_message,
        primary_color:    config?.primaryColor     ?? prev.primary_color,
        background_color: config?.backgroundColor  ?? prev.background_color,
        text_color:       config?.textColor        ?? prev.text_color,
        border_color:     config?.borderColor      ?? prev.border_color,
        logo_url:         config?.logoUrl ?? prev.logo_url,
        site_id:          config?.siteId ?? prev.site_id,
        system_prompt:
          (config?.customSystemPrompt && String(config.customSystemPrompt).trim().length
            ? config.customSystemPrompt
            : prev.system_prompt),
      }));
      setLogoPreview(null);

      toast.success("Saved", { description: "Widget settings were updated successfully.", ...TOAST_SUCCESS });
    } catch (e: any) {
      setError(e?.message || "Failed to save settings");
      toast.warning("Save failed", { description: e?.message || "Please try again.", ...TOAST_WARNING });
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

    // 1) Minimal shell (без <style> внутри)
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
                <div class="messages" id="messages">
                  <div class="row ai"><div class="bubble" id="welcome"></div></div>
                </div>
                <div class="input">
                  <input id="inp" placeholder="Type a message…" aria-label="Type a message…"/>
                  <button id="send">Send</button>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>`;
    doc.open(); doc.write(shell); doc.close();

    // 2) Styles as a node
    const style = doc.createElement("style");
    style.textContent = `
      :root { color-scheme: dark; }
      html,body { height:100%; margin:0; background:#0a0a0a; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }

      .host { height:100%; width:100%; display:flex; }
      .card {
        flex:1; display:flex; flex-direction:column;
        background: var(--bg, #111);
        border: 1px solid rgba(255,255,255,.06);
        border-radius: 10px;
      }
        .body, .messages { background: var(--bg, #111); }
.body { min-height: 0; }          /* flex fix, чтобы scroll работал корректно */
     .head {
  padding:12px 16px; display:flex; align-items:center; gap:10px;
  border-bottom:1px solid rgba(255,255,255,.07);
  background: var(--pill, #2b2f36);   /* новый фон */
}
.title { font-weight:700; font-size:14px; color:#ffffff; } /* белый текст */
.logo  { width:28px; height:28px; border-radius:8px; background:#222; object-fit:contain; }

      .body { flex:1; padding:16px; display:flex; flex-direction:column; gap:10px; }
      .messages { flex:1; overflow:auto; display:flex; flex-direction:column; gap:8px; }
      .messages::-webkit-scrollbar { width: 8px; }
.messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 8px; }
.messages::-webkit-scrollbar-track { background: transparent; }
      .row { display:flex; }
      .me { justify-content:flex-end; }
.bubble {
  padding:10px 12px; border-radius:14px; max-width:85%;
  white-space:pre-wrap; word-break:break-word; line-height:1.5;
  border:1px solid transparent;
  box-shadow: 0 1px 0 rgba(0,0,0,.2);
  color:#fff;
  background: var(--pill, #2b2f36); /* один и тот же стиль */
}
.me .bubble { background: var(--pill, #2b2f36); color:#fff; }
.ai .bubble { background: var(--pill, #2b2f36); color:#fff; }
      /* typing dots */
      .typing .bubble { display:inline-flex; align-items:center; gap:6px; min-height:18px; }
      .dot { width:6px; height:6px; border-radius:50%; background: currentColor; opacity:.4; animation: blink 1.2s infinite; }
      .dot:nth-child(2) { animation-delay:.2s; }
      .dot:nth-child(3) { animation-delay:.4s; }
      @keyframes blink { 0%,80%,100%{opacity:.2} 40%{opacity:1} }

      /* нижняя панель ввода */
.input {
  display:flex; gap:8px; padding:12px;
  border-top:1px solid rgba(255,255,255,.08);
  /* отдельный фон, чтобы не сливался с body/messages */
  background: #0e0e10;              /* можно #121417, если темнее нравится */
}

/* само поле ввода */
.input input{
  flex:1; height:40px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,.16);
  background:#101317;               /* НЕ прозрачный */
  color:#e5e7eb; padding:10px 12px;
  outline:none;
}
.input input::placeholder{ color:rgba(229,231,235,.55); }

/* кнопка отправки — тот же «пилюльный» цвет */
.input button{
  border:0; border-radius:10px; padding:10px 14px;
  color:#fff; cursor:pointer;
  background: var(--pill, #2b2f36);
}
.input button:disabled{ opacity:.6; cursor:default; }

    `;
    (doc.head || doc.getElementsByTagName("head")[0]).appendChild(style);

    // 3) Chat logic script
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
        document.getElementById('welcome').textContent = cfg.welcome;

        var messages = document.getElementById('messages');
        var inp = document.getElementById('inp');
        var btn = document.getElementById('send');
        function scrollToBottom(){ messages.scrollTop = messages.scrollHeight; }

        function append(role, text) {
          var row = document.createElement('div');
          row.className = 'row ' + (role === 'user' ? 'me' : 'ai');
          var bubble = document.createElement('div');
          bubble.className = 'bubble';
          if (role === 'user') { bubble.style.background = '#2b2f36'; bubble.style.color = '#fff'; bubble.style.borderColor='transparent'; }
          else { bubble.style.background='rgba(255,255,255,.06)'; bubble.style.color='#e5e7eb'; bubble.style.borderColor='rgba(255,255,255,.08)'; }
          bubble.textContent = text || '';
          row.appendChild(bubble); messages.appendChild(row); scrollToBottom();
          return bubble;
        }

        function showTyping(){
          var row = document.createElement('div'); row.className='row ai typing';
          var bubble = document.createElement('div'); bubble.className='bubble'; bubble.style.color='#e5e7eb';
          for (var i=0;i<3;i++){ var d=document.createElement('span'); d.className='dot'; bubble.appendChild(d); }
          row.appendChild(bubble); messages.appendChild(row); scrollToBottom(); return row;
        }

        async function sendMessage(){
          var text = (inp.value || '').trim(); if (!text) return;
          append('user', text); inp.value=''; btn.disabled = true;
          var typingRow = showTyping(); var typingBubble = typingRow.querySelector('.bubble');

          try {
            const res = await fetch(cfg.endpoint, {
              method: 'POST',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream, application/json' },
              body: JSON.stringify({ messages: [{ role: 'user', content: text }], siteId: cfg.siteId || null, clientId: cfg.clientId || null, source: 'admin-preview', stream: false })
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
                const msg = data.reply || data.answer || data.message || data.text ||
                  (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'No response';
                typingBubble.textContent = String(msg);
              }
            }
          } catch (e) {
            typingBubble.textContent = 'Network error: ' + (e && e.message ? e.message : 'request failed');
          } finally {
            typingRow.classList.remove('typing'); btn.disabled = false; scrollToBottom();
          }
        }

        btn.addEventListener('click', sendMessage);
        inp.addEventListener('keydown', function(ev){ if (ev.key === 'Enter') sendMessage(); });
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
                    <iframe
                      ref={previewRef}
                      title="Widget Demo"
                      src="about:blank"
                      className="w-full h-full"
                      onLoad={injectPreview}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox"
                    />
                  </div>
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
                <Button variant="outline" onClick={() => viewingDocument && window.open(DOCS_API.download(viewingDocument.id), "_blank")}>
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
