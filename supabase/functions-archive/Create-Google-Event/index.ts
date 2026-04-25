// /functions/create_gg_event/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { companie_id, title, start, end, guest_email, lead_id } = body;

    if (!companie_id || !title || !start || !end) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios ausentes.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Converte de "dd/MM/yyyy HH:mm" para ISO
    function parseDate(dateStr: string): string {
      const [dia, mes, resto] = dateStr.split('/');
      const [ano, horaMinuto] = resto.split(' ');
      return `${ano}-${mes}-${dia}T${horaMinuto}:00-03:00`;
    }

    const startIso = parseDate(start);
    const endIso = parseDate(end);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const tokenRes = await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${companie_id}&select=gg_access_token`, {
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    const tokenData = await tokenRes.json();
    const access_token = tokenData?.[0]?.gg_access_token;

    if (!access_token) {
      return new Response(JSON.stringify({ error: 'Token não encontrado para a empresa.' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        start: {
          dateTime: startIso,
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: endIso,
          timeZone: 'America/Sao_Paulo'
        },
        attendees: guest_email ? [{ email: guest_email }] : [],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      })
    });

    const result = await calendarRes.json();

    if (!calendarRes.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: calendarRes.status,
        headers: corsHeaders
      });
    }

    // Salvar no Supabase
    const evento = {
      id: result.id,
      gg_title: title,
      gg_start: startIso,
      gg_end: endIso,
      gg_link: result?.hangoutLink || result?.htmlLink || null,
      companie_id,
      lead_id,
      status_agenda: 'Pendente'
    };

    await fetch(`${supabaseUrl}/rest/v1/agendamentos`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey!,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(evento)
    });

    return new Response(JSON.stringify({
      message: 'Evento criado com sucesso',
      eventId: result.id,
      link: result?.hangoutLink || result?.htmlLink
    }), {
      headers: corsHeaders
    });
  } catch (e) {
    return new Response(JSON.stringify({
      message: 'Erro ao criar evento',
      error: e.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
