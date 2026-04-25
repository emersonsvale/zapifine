# Edge Functions Archive

Edge functions Supabase aposentadas pela migração para Nitro routes (`server/api/...`).
Mantidas aqui para histórico e referência.

## Mapping (legacy → Nitro)

| Edge function legacy                  | Substituído por                              |
|---------------------------------------|----------------------------------------------|
| `Create-Google-Event`                 | `POST /api/agendamentos`                     |
| `delete_google_event`                 | `DELETE /api/agendamentos/[id]`              |
| `create_lembretes_from_agendamento`   | `POST /api/agendamentos/[id]/confirm`        |
| `refresh_gg_token`                    | `server/utils/google-token.ts`               |
| `get_gg_agenda`                       | `POST /api/google/sync` + `useAsyncData`     |
| `sync_google_agenda`                  | `POST /api/google/sync` (incremental)        |
| `get_agendamentos`                    | Leitura RLS direta no front (`useAgendamentos`) |

## Removido em
2026-04-24 (commit pós-deploy app prod com nova stack).

## Como deletar do Supabase

Via Supabase CLI:
```bash
supabase functions delete Create-Google-Event delete_google_event create_lembretes_from_agendamento refresh_gg_token get_gg_agenda sync_google_agenda get_agendamentos --project-ref wpyxqtqlppsvuiwquigu
```

Ou via Dashboard: Edge Functions → cada função → ⋯ → Delete.
