-- front-end-events: per-assessment date-window alerts. A daily cron compares the live
-- forecast for a saved assessment's date against its historical baseline and fires when
-- the outlook is materially worse. Own-row RLS; one alert per (user, assessment).

create table if not exists public.event_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  assessment_id uuid not null references public.event_assessments (id) on delete cascade,
  active boolean not null default true,
  last_triggered_at timestamptz,
  last_message text,
  created_at timestamptz not null default now(),
  unique (user_id, assessment_id)
);

alter table public.event_alerts enable row level security;

create policy "event_alerts_select_own" on public.event_alerts
  for select using ((select auth.uid()) = user_id);
create policy "event_alerts_insert_own" on public.event_alerts
  for insert with check ((select auth.uid()) = user_id);
create policy "event_alerts_update_own" on public.event_alerts
  for update using ((select auth.uid()) = user_id);
create policy "event_alerts_delete_own" on public.event_alerts
  for delete using ((select auth.uid()) = user_id);

create index if not exists event_alerts_user_idx on public.event_alerts (user_id);
create index if not exists event_alerts_active_idx on public.event_alerts (active) where active;
