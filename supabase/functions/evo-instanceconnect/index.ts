// /supabase/functions/evo-instanceconnect/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const EVOGO_BASE_URL =
  Deno.env.get("EVOGO_BASE_URL") ?? "https://evogo.valeapps.com.br";
const EVOGO_ADMIN_TOKEN =
  Deno.env.get("EVOGO_ADMIN_TOKEN") ?? Deno.env.get("EVO_API_KEY") ?? "";
const WHATS_API_WEBHOOK_URL =
  Deno.env.get("WHATS_API_WEBHOOK_URL") ??
  "https://whats.zapifine.com/webhook/evolution";
const WHATS_API_WEBHOOK_SECRET = Deno.env.get("WHATS_API_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildWebhookUrl(base: string): string {
  if (!WHATS_API_WEBHOOK_SECRET) return base;
  // Evolution Go strippa query string ao salvar webhook — usar path segment.
  const cleanBase = base.replace(/\/+$/, "");
  return `${cleanBase}/${encodeURIComponent(WHATS_API_WEBHOOK_SECRET)}`;
}

function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function pickQr(data: unknown): string | null {
  if (!data) return null;
  const seen = new Set<unknown>();
  function walk(v: unknown): string | null {
    if (!v || seen.has(v)) return null;
    if (typeof v === "string") {
      if (v.length > 40 && (v.startsWith("data:image") || /^[A-Za-z0-9+/=]+$/.test(v.slice(0, 60))))
        return v;
      return null;
    }
    if (typeof v !== "object") return null;
    seen.add(v);
    const obj = v as Record<string, unknown>;
    const keys = ["qrcode", "QRCode", "qr", "base64", "code", "image", "data"];
    for (const k of keys) {
      if (k in obj) {
        const found = walk(obj[k]);
        if (found) return found;
      }
    }
    for (const val of Object.values(obj)) {
      const found = walk(val);
      if (found) return found;
    }
    return null;
  }
  return walk(data);
}

function cors(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function safeJson(r: Response | null) {
  if (!r) return { ok: false };
  try {
    const t = await r.text();
    try { return { ok: r.ok, status: r.status, json: JSON.parse(t) }; }
    catch { return { ok: r.ok, status: r.status, text: t }; }
  } catch { return { ok: r.ok, status: r.status }; }
}

async function findGoInstanceIdByName(name: string): Promise<string | null> {
  if (!EVOGO_ADMIN_TOKEN) return null;
  const r = await fetch(`${EVOGO_BASE_URL}/instance/all`, {
    headers: { "apikey": EVOGO_ADMIN_TOKEN },
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const data = await r.json().catch(() => null);
  if (!data) return null;
  const list: any[] = Array.isArray(data)
    ? data
    : (data.instances ?? data.data ?? data.result ?? []);
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const iname = item.name ?? item.Name ?? item.instanceName;
    if (iname === name) return item.id ?? item.ID ?? item.instanceId ?? null;
  }
  return null;
}

async function deleteGoInstanceByName(name: string) {
  const id = await findGoInstanceIdByName(name);
  if (!id) return { skipped: true, reason: "id not found" };
  const r = await fetch(`${EVOGO_BASE_URL}/instance/delete/${id}`, {
    method: "DELETE",
    headers: { "apikey": EVOGO_ADMIN_TOKEN },
  }).catch(() => null);
  const parsed = await safeJson(r);
  return { ...parsed, usedId: id };
}

async function persistWebhook(
  instance: string,
  apikey: string,
  url: string,
  subscribe: string[],
) {
  const instanceId = await findGoInstanceIdByName(instance);
  const idents = instanceId ? [instanceId, instance] : [instance];

  const attempts: Array<{ method: "POST" | "PUT"; path: string; body: unknown }> = [];
  for (const ident of idents) {
    attempts.push(
      { method: "POST", path: `/webhook/${ident}`, body: { url, subscriptions: subscribe, enabled: true } },
      { method: "PUT", path: `/webhook/${ident}`, body: { url, subscriptions: subscribe, enabled: true } },
      { method: "POST", path: `/webhook/set/${ident}`, body: { url, subscriptions: subscribe, enabled: true } },
      { method: "POST", path: `/webhook/set/${ident}`, body: { webhook: { url, subscriptions: subscribe, enabled: true } } },
      { method: "POST", path: `/subscribe/${ident}`, body: { events: subscribe } },
      { method: "POST", path: `/instance/subscribe/${ident}`, body: { events: subscribe } },
      { method: "POST", path: `/instance/${ident}/subscribe`, body: { events: subscribe } },
      { method: "POST", path: `/webhook/set/${ident}`, body: { webhook: { enabled: true, url, byEvents: false, base64: true, events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CHATS_UPSERT", "PRESENCE_UPDATE"] } } },
    );
  }

  const tried: Array<Record<string, unknown>> = [];
  let success: { method: string; path: string } | null = null;
  for (const a of attempts) {
    const res = await fetch(`${EVOGO_BASE_URL}${a.path}`, {
      method: a.method,
      headers: { "Content-Type": "application/json", apikey },
      body: JSON.stringify(a.body),
    }).catch(() => null);
    const parsed = await safeJson(res);
    tried.push({ method: a.method, path: a.path, body: a.body, ...parsed });
    if (parsed.ok && !success) success = { method: a.method, path: a.path };
  }
  return { ok: !!success, used: success, tried, instanceId };
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "GET") return cors({ error: "Use GET" }, 405);

    const url = new URL(req.url);
    let instance = url.searchParams.get("instance") ?? "";
    if (!instance) {
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "evo-instanceconnect");
      if (idx >= 0 && parts.length > idx + 1) instance = parts[idx + 1];
    }
    if (!instance) return cors({ error: "Parâmetro 'instance' é obrigatório" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: row } = await supabase
      .from("whatsapp_connections")
      .select("id, apikey_evo, company_id, instance_name, instance_id")
      .eq("instance_name", instance)
      .maybeSingle();
    if (!row) return cors({ error: "Conexão não encontrada no DB" }, 404);

    const debug: Record<string, unknown> = {};
    const subscribe = ["Message", "ReadReceipt", "ChatPresence"];
    const webhookUrl = buildWebhookUrl(WHATS_API_WEBHOOK_URL);

    // STEP 0: cleanup Go (reset sessao caso ja exista)
    debug.cleanupGo = await deleteGoInstanceByName(instance);

    // STEP 1: criar instancia Go
    let token = randomToken();
    const createRes = await fetch(`${EVOGO_BASE_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVOGO_ADMIN_TOKEN },
      body: JSON.stringify({ name: instance, token }),
    });
    debug.create = await safeJson(createRes);
    if (!createRes.ok) {
      return cors({ error: "instance/create falhou", debug }, createRes.status);
    }
    const createJson = (debug.create as any)?.json;
    const returnedToken =
      createJson?.token ?? createJson?.data?.token ?? createJson?.instance?.token;
    if (typeof returnedToken === "string" && returnedToken.length > 0) token = returnedToken;
    const returnedInstanceId: string | null =
      createJson?.id ?? createJson?.ID ?? createJson?.instanceId ?? createJson?.data?.id ?? null;

    // STEP 2: connect (webhookUrl no body, apenas pra eventos imediatos)
    const connectRes = await fetch(`${EVOGO_BASE_URL}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": token },
      body: JSON.stringify({
        immediate: true,
        webhookUrl,
        subscribe,
      }),
    });
    debug.connect = await safeJson(connectRes);

    // STEP 2.5: persiste webhook em endpoint dedicado
    debug.webhook = await persistWebhook(instance, token, webhookUrl, subscribe);

    // STEP 3: poll QR
    let qrBase64: string | null = pickQr((debug.connect as any)?.json);
    const qrAttempts: unknown[] = [];
    const deadline = Date.now() + 15000;
    while (!qrBase64 && Date.now() < deadline) {
      const qrRes = await fetch(`${EVOGO_BASE_URL}/instance/qr`, {
        headers: { "apikey": token },
      });
      const parsed = await safeJson(qrRes);
      qrAttempts.push(parsed);
      qrBase64 = pickQr((parsed as any)?.json);
      if (!qrBase64) await new Promise((r) => setTimeout(r, 700));
    }
    debug.qr = { attempts: qrAttempts.length, lastSample: qrAttempts[qrAttempts.length - 1] };

    // STEP 4: persiste no DB (sem n8n_workflow_id)
    await supabase
      .from("whatsapp_connections")
      .update({
        apikey_evo: token,
        instance_id: returnedInstanceId ?? (row as any).instance_id ?? null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", row.id);

    return cors({
      base64: qrBase64,
      qrcode: qrBase64 ? { base64: qrBase64 } : undefined,
      webhookUrl,
      instanceId: returnedInstanceId,
      debug,
    });
  } catch (e) {
    return cors({ error: String(e) }, 500);
  }
});
