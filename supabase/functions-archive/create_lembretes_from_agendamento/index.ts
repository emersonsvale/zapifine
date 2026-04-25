// File: create_lembretes_from_agendamento.ts
// Deno Deploy / Supabase Edge Function

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ENV
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type Agendamento = {
  id: string;
  companie_id: string | null;
  gg_start: string | null;
  lead_id: number | null;
};

type LembretesConfig = {
  id: number;
  companies_id: string | null;
  envio_whatsapp: boolean | null;
  envio_email: boolean | null;
  cancelamento: boolean | null;
  primeiro_lote_tempo: string | null;
  primeiro_lote_tipo: string | null;
  segundo_lote_tempo: string | null;
  segundo_lote_tipo: string | null;
  ativo: boolean | null;
};

type LembreteTemplate = {
  id: number;
  companies_id: string | null;
  lembretes_config_id: number | null;
  titulo: string | null;
  mensagem: string | null;
  ativo: boolean | null;
  tipo_lembrete: "Agendamento" | "Confirmação";
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function badRequest(msg: string) {
  return json({ error: msg }, 400);
}

function parseHHMMToMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return 0;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function tipoToMinutes(totalMinutes: number, tipo: string | null | undefined) {
  if (!tipo) return totalMinutes;
  const t = tipo.toLowerCase();
  if (t.startsWith("hora")) return totalMinutes;
  if (t.startsWith("min"))  return totalMinutes;
  return totalMinutes;
}

function subMinutes(dateIso: string, minutes: number): string {
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) throw new Error("gg_start inválido/inesperado.");
  const ms = d.getTime() - minutes * 60_000;
  return new Date(ms).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return badRequest("Use POST.");

  try {
    const { agendamentos_id } = await req.json().catch(() => ({}));
    if (!agendamentos_id) {
      return badRequest("Parâmetro obrigatório: agendamentos_id");
    }

    const { data: ag, error: eAg } = await supabase
      .from("agendamentos")
      .select("id, companie_id, gg_start, lead_id")
      .eq("id", agendamentos_id)
      .single<Agendamento>();

    if (eAg || !ag) {
      return json({ error: "Agendamento não encontrado.", details: eAg?.message }, 404);
    }
    if (!ag.companie_id) return badRequest("agendamentos.companie_id ausente.");
    if (!ag.gg_start) return badRequest("agendamentos.gg_start ausente.");

    const { data: cfg, error: eCfg } = await supabase
      .from("lembretes_config")
      .select(
        "id, companies_id, envio_whatsapp, envio_email, cancelamento, primeiro_lote_tempo, primeiro_lote_tipo, segundo_lote_tempo, segundo_lote_tipo, ativo, created_at"
      )
      .eq("companies_id", ag.companie_id)
      .eq("ativo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<LembretesConfig>();

    if (eCfg || !cfg) {
      return json({
        error: "Nenhuma configuração de lembretes ativa encontrada para a empresa.",
        details: eCfg?.message,
      }, 404);
    }

    const { data: templates, error: eTpl } = await supabase
      .from("lembretes_templates")
      .select("id, companies_id, lembretes_config_id, titulo, mensagem, ativo, tipo_lembrete")
      .eq("companies_id", ag.companie_id)
      .eq("lembretes_config_id", cfg.id)
      .eq("ativo", true);

    if (eTpl) {
      return json({ error: "Erro ao buscar templates.", details: eTpl.message }, 500);
    }

    const tplAgendamento = (templates || []).find((t) => t.tipo_lembrete === "Agendamento") as LembreteTemplate | undefined;
    const tplConfirmacao = (templates || []).find((t) => t.tipo_lembrete === "Confirmação") as LembreteTemplate | undefined;

    if (!tplAgendamento || !tplConfirmacao) {
      return json({ error: "Templates ativos necessários não encontrados (Agendamento e/ou Confirmação)." }, 409);
    }

    const pMin = parseHHMMToMinutes(cfg.primeiro_lote_tempo);
    const pOff = tipoToMinutes(pMin, cfg.primeiro_lote_tipo);
    const sMin = parseHHMMToMinutes(cfg.segundo_lote_tempo);
    const sOff = tipoToMinutes(sMin, cfg.segundo_lote_tipo);

    const horaEnvio1 = subMinutes(ag.gg_start, pOff);
    const horaEnvio2 = subMinutes(ag.gg_start, sOff);

    const rows = [
      {
        companies_id: ag.companie_id,
        lembrete_config_id: cfg.id,
        lembrete_template_id: tplAgendamento.id,
        mensagem: tplAgendamento.mensagem ?? null,
        leads_id: ag.lead_id ?? null,
        hora_envio: horaEnvio1,
      },
      {
        companies_id: ag.companie_id,
        lembrete_config_id: cfg.id,
        lembrete_template_id: tplConfirmacao.id,
        mensagem: tplConfirmacao.mensagem ?? null,
        leads_id: ag.lead_id ?? null,
        hora_envio: horaEnvio2,
      },
    ];

    const { data: inserted, error: eIns } = await supabase
      .from("lembretes")
      .insert(rows)
      .select("id, hora_envio, mensagem, leads_id, lembrete_template_id");

    if (eIns) {
      return json({ error: "Falha ao inserir lembretes.", details: eIns.message }, 500);
    }

    return json({
      ok: true,
      agendamento_id: ag.id,
      companies_id: ag.companie_id,
      lembrete_config_id: cfg.id,
      created: inserted,
    }, 201);
  } catch (err) {
    return json({ error: "Erro inesperado.", details: (err as Error)?.message }, 500);
  }
});
