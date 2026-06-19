-- front-end-events: saved climate assessments — the durable "verdict" the dashboard
-- computes (a frozen snapshot re-viewed with zero recompute). Own-row RLS keyed on the
-- authenticated user (mirrors event_assets / 0001). Immutable/append-only by convention:
-- "Re-run" creates a new row rather than mutating one.

create table if not exists public.event_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  address text,
  lat double precision not null,
  lon double precision not null,
  segment text,
  event_date date,
  month int not null,
  snapshot jsonb not null,
  snapshot_version int not null default 1,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.event_assessments enable row level security;

create policy "event_assessments_select_own" on public.event_assessments
  for select using ((select auth.uid()) = user_id);
create policy "event_assessments_insert_own" on public.event_assessments
  for insert with check ((select auth.uid()) = user_id);
create policy "event_assessments_update_own" on public.event_assessments
  for update using ((select auth.uid()) = user_id);
create policy "event_assessments_delete_own" on public.event_assessments
  for delete using ((select auth.uid()) = user_id);

create index if not exists event_assessments_user_id_idx on public.event_assessments (user_id);
create index if not exists event_assessments_user_created_idx
  on public.event_assessments (user_id, created_at desc);
