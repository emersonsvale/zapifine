// /supabase/functions/evo-createinstance/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EVOGO_BASE_URL =
  Deno.env.get("EVOGO_BASE_URL") ?? "https://evogo.valeapps.com.br";
const EVOGO_ADMIN_TOKEN =
  Deno.env.get("EVOGO_ADMIN_TOKEN") ?? Deno.env.get("EVO_API_KEY") ?? "";
const WHATS_API_WEBHOOK_URL =
  Deno.env.get("WHATS_API_WEBHOOK_URL") ??
  "https://whats.zapifine.com/webhook/evolution";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function sanitizeInstanceName(name: string) {
  const norm = name.toLowerCase().trim().replace(/\s+/g, "-");
  if (!/^[a-z0-9_-]{3,50}$/.test(norm))
    throw new Error("instanceName inválido. Use 3-50 chars em [a-z0-9_-].");
  return norm;
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

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return cors({ error: "Use POST" }, 405);
    if (!EVOGO_ADMIN_TOKEN)
      return cors({ error: "EVOGO_ADMIN_TOKEN não configurada" }, 500);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { instanceName, number, companyId, webhook = {} } = body as {
      instanceName?: string;
      number?: string | number;
      companyId?: string;
      webhook?: { url?: string; events?: string[]; subscribe?: string[] };
    };
    if (!instanceName) return cors({ error: "instanceName é obrigatório" }, 400);
    if (!companyId) return cors({ error: "companyId é obrigatório" }, 400);

    const name = sanitizeInstanceName(instanceName);
    let token = randomToken();
    const subscribe =
      webhook.subscribe ?? webhook.events ?? ["Message", "ReadReceipt", "ChatPresence"];

    const debug: Record<string, unknown> = {};
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: existing } = await supabase
      .from("whatsapp_connections")
      .select("id, instance_name, instance_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // STEP 0: cleanup Go
    debug.cleanupGo = await deleteGoInstanceByName(name);
    if (existing?.instance_name && existing.instance_name !== name) {
      debug.cleanupGoOld = await deleteGoInstanceByName(existing.instance_name);
    }

    const webhookUrl = webhook.url ?? WHATS_API_WEBHOOK_URL;

    // STEP 1: criar instância Go
    const createRes = await fetch(`${EVOGO_BASE_URL}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": EVOGO_ADMIN_TOKEN },
      body: JSON.stringify({ name, token }),
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

    // STEP 2: connect (webhook → whats-api)
    const connectPayload: Record<string, unknown> = {
      immediate: true,
      webhookUrl,
      subscribe,
    };
    if (number !== undefined && number !== null) connectPayload.phone = String(number).trim();

    const connectRes = await fetch(`${EVOGO_BASE_URL}/instance/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": token },
      body: JSON.stringify(connectPayload),
    });
    debug.connect = await safeJson(connectRes);

    // STEP 3: poll QR
    let qrBase64: string | null = pickQr((debug.connect as any)?.json);
    const qrAttempts: unknown[] = [];
    const deadline = Date.now() + 12000;
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

    // STEP 4: persiste
    if (existing?.id) {
      await supabase
        .from("whatsapp_connections")
        .update({
          instance_name: name,
          instance_id: returnedInstanceId ?? null,
          apikey_evo: token,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", existing.id);
    }

    return cors({
      instance: {
        instanceName: name,
        instanceId: returnedInstanceId ?? name,
        status: qrBase64 ? "connecting" : "created",
      },
      hash: { apikey: token },
      qrcode: qrBase64 ? { base64: qrBase64 } : undefined,
      webhookUrl,
      debug,
    });
  } catch (e) {
    return cors({ error: String(e) }, 500);
  }
});
