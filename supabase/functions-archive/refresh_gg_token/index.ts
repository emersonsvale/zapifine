import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  const url = new URL(req.url);
  const companie_id = url.searchParams.get("companie_id");

  if (!companie_id) {
    return new Response(JSON.stringify({ error: "Parâmetro companie_id é obrigatório" }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GG_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GG_CLIENT_SECRET")!;

  const companyRes = await fetch(
    `${supabaseUrl}/rest/v1/companies?id=eq.${companie_id}&select=id,gg_refresh_token`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  );

  const [company] = await companyRes.json();

  if (!company || !company.gg_refresh_token) {
    return new Response(JSON.stringify({ error: "Refresh token não encontrado para a empresa." }), {
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: company.gg_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const token = await tokenRes.json();

  if (!token.access_token) {
    return new Response(JSON.stringify({ error: "Erro ao renovar token", detalhe: token }), {
      status: 400,
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  }

  await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${companie_id}`, {
    method: "PATCH",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gg_access_token: token.access_token }),
  });

  return new Response(JSON.stringify({
    message: "Token atualizado com sucesso.",
    access_token: token.access_token,
  }), {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" }
  });
});
