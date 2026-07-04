alter table public.google_calendars
  add column if not exists watch_channel_id text,
  add column if not exists watch_resource_id text,
  add column if not exists watch_token text,
  add column if not exists watch_expires_at timestamptz;

create index if not exists idx_google_calendars_watch_channel
  on public.google_calendars(watch_channel_id)
  where watch_channel_id is not null;

create index if not exists idx_google_calendars_watch_expiring
  on public.google_calendars(watch_expires_at)
  where watch_channel_id is not null;
