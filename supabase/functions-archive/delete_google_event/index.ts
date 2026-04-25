import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { companie_id, event_id } = await req.json()

    if (!companie_id || !event_id) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: companie_id e event_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: company, error } = await supabase
      .from('companies')
      .select('gg_access_token')
      .eq('id', companie_id)
      .single()

    if (error || !company?.gg_access_token) {
      return new Response(JSON.stringify({ error: 'Token de acesso não encontrado para esta empresa.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deletar evento no Google Calendar
    const googleRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${company.gg_access_token}`,
      },
    })

    if (googleRes.status !== 204) {
      const err = await googleRes.json()
      return new Response(JSON.stringify({ error: err }), {
        status: googleRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deletar também do Supabase
    const { error: deleteError } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', event_id)
      .eq('companie_id', companie_id)

    if (deleteError) {
      return new Response(JSON.stringify({ error: 'Erro ao deletar no Supabase.', detail: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Evento deletado do Google Calendar e Supabase.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
