-- front-end-events: shareable report links. A nullable, unguessable token on an
-- assessment; the public /report/[token] route resolves it via the service-role client
-- (bypassing RLS) and returns only display fields. Owner sets/clears the token under the
-- existing own-row update policy.

alter table public.event_assessments
  add column if not exists share_token uuid,
  add column if not exists share_token_created_at timestamptz;

-- Unique only among shared rows (NULLs are unconstrained).
create unique index if not exists event_assessments_share_token_idx
  on public.event_assessments (share_token)
  where share_token is not null;
