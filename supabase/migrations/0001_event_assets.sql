-- front-end-events: saved event locations ("assets").
-- Distinct from platform's public.assets (which lives in the same local DB) to
-- avoid collision. Own-row RLS keyed on the authenticated user.

create table if not exists public.event_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  lat double precision not null,
  lon double precision not null,
  event_type text,
  event_date date,
  created_at timestamptz not null default now()
);

alter table public.event_assets enable row level security;

create policy "event_assets_select_own" on public.event_assets
  for select using ((select auth.uid()) = user_id);
create policy "event_assets_insert_own" on public.event_assets
  for insert with check ((select auth.uid()) = user_id);
create policy "event_assets_update_own" on public.event_assets
  for update using ((select auth.uid()) = user_id);
create policy "event_assets_delete_own" on public.event_assets
  for delete using ((select auth.uid()) = user_id);

create index if not exists event_assets_user_id_idx on public.event_assets (user_id);
