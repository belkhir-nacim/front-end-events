-- front-end-events: durable chat threads. Persists the Assistant conversation per
-- (user, thread_key) so it survives reloads. thread_key is stable per place (or assessment).
-- Own-row RLS.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_key text not null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, thread_key)
);

alter table public.chat_threads enable row level security;

create policy "chat_threads_select_own" on public.chat_threads
  for select using ((select auth.uid()) = user_id);
create policy "chat_threads_insert_own" on public.chat_threads
  for insert with check ((select auth.uid()) = user_id);
create policy "chat_threads_update_own" on public.chat_threads
  for update using ((select auth.uid()) = user_id);
create policy "chat_threads_delete_own" on public.chat_threads
  for delete using ((select auth.uid()) = user_id);

create index if not exists chat_threads_user_idx on public.chat_threads (user_id);
