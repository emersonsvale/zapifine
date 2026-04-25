import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  }

  try {
    const { companie_id, mes, ano } = await req.json()

    if (!companie_id || !mes || !ano) {
      return new Response(JSON.stringify({ error: 'Parâmetros ausentes' }), { status: 400, headers })
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

    if (error || !company) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada ou token ausente' }), { status: 404, headers })
    }

    const access_token = company.gg_access_token
    const month = String(mes).padStart(2, '0')
    const start = `${ano}-${month}-01T00:00:00Z`
    const end = `${ano}-${month}-31T23:59:59Z`

    const calendarRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    )

    const calendarData = await calendarRes.json()

    const eventos = Array.isArray(calendarData.items)
      ? calendarData.items.map((e: any) => ({
          id: e.id,
          gg_title: e.summary,
          gg_start: e.start?.dateTime || e.start?.date,
          gg_end: e.end?.dateTime || e.end?.date,
          gg_link: e?.hangoutLink || e?.htmlLink,
          companie_id: companie_id,
        }))
      : []

    if (eventos.length > 0) {
      await Promise.all(
        eventos.map(async (evento) => {
          await supabase.from('agendamentos').upsert(evento, { onConflict: 'id' })
        })
      )
    }

    const retorno = eventos.map((e) => ({
      id: e.id,
      title: e.gg_title,
      start: e.gg_start,
      end: e.gg_end,
      link: e.gg_link,
    }))

    return new Response(JSON.stringify({ message: 'Eventos sincronizados', eventos: retorno }), { status: 200, headers })
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Erro no processamento', error: `${err}` }), { status: 500, headers })
  }
})
