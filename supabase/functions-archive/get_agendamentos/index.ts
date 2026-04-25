// File: index.ts

import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  try {
    const { companie_id } = await req.json()

    if (!companie_id) {
      return new Response(JSON.stringify({ error: "companie_id é obrigatório" }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    )

    const { data, error } = await supabase
      .from("agendamentos")
      .select("id, gg_title, gg_start, gg_end, gg_link, status_agenda, created_at")
      .eq("companie_id", companie_id)
      .order("gg_start", { ascending: true })

    if (error) {
      return new Response(JSON.stringify({ message: "Erro ao buscar agendamentos", error }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ message: "Agendamentos encontrados", data }), {
      status: 200,
      headers: corsHeaders,
    })

  } catch (err) {
    return new Response(JSON.stringify({ message: "Erro interno", error: err.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
