import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(req.url);
  const companie_id = url.searchParams.get("companie_id");
  const mes = url.searchParams.get("mes");
  const ano = url.searchParams.get("ano");

  if (!companie_id || !mes || !ano) {
    return new Response(JSON.stringify({ error: "Parâmetros companie_id, mes e ano são obrigatórios." }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const companyRes = await fetch(
    `${supabaseUrl}/rest/v1/companies?id=eq.${companie_id}&select=gg_access_token`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );

  const [company] = await companyRes.json();

  if (!company?.gg_access_token) {
    return new Response(JSON.stringify({ error: "Token de acesso não encontrado." }), {
      status: 401,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const mesInt = parseInt(mes.padStart(2, "0"));
  const anoInt = parseInt(ano);
  const startDate = new Date(anoInt, mesInt - 1, 1);
  const endDate = new Date(anoInt, mesInt, 0);

  const timeMin = startDate.toISOString();
  const timeMax = new Date(endDate.setHours(23, 59, 59, 999)).toISOString();

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${company.gg_access_token}` } }
  );

  const events = await eventsRes.json();

  if (!eventsRes.ok) {
    return new Response(JSON.stringify({ error: "Erro ao buscar eventos", detalhe: events }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const customEvents = (events.items || []).map((item: any) => ({
    id: item.id,
    title: item.summary,
    start: item.start?.dateTime || item.start?.date,
    end: item.end?.dateTime || item.end?.date,
    link: item.hangoutLink || item.htmlLink,
  }));

  return new Response(JSON.stringify(customEvents), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
});
