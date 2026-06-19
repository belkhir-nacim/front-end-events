-- front-end-events: usage metering spine. Records each metered interaction (chat, report,
-- …) per user so plans can be enforced later (S4). Own-row RLS like the other tables.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  model text,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  created_at timestamptz not null default now()
);

alter table public.usage_events enable row level security;

create policy "usage_events_select_own" on public.usage_events
  for select using ((select auth.uid()) = user_id);
create policy "usage_events_insert_own" on public.usage_events
  for insert with check ((select auth.uid()) = user_id);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);
