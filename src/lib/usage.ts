// Usage metering. Pattern adapted from platform/src/lib/llm/usage.ts (org-scoped there →
// own-row here). Meters EVENTS (chat messages/day) — what a planner reasons about — not raw
// tokens. Enforcement is a static FREE_LIMITS const now; S4 swaps it for plan entitlements.
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TABLE = "usage_events";

export const FREE_LIMITS = { chatPerDay: 40 };

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfUtcMonth(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Chat events recorded for the current user since UTC midnight (RLS-scoped). */
export async function chatUsedToday(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from(TABLE)
    .select("*", { count: "exact", head: true })
    .eq("kind", "chat")
    .gte("created_at", startOfUtcDay());
  return count ?? 0;
}

export interface RecordArgs {
  kind: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

/** Best-effort insert (RLS insert-own). Caller passes its request-scoped client + user id. */
export async function recordUsage(supabase: SupabaseClient, userId: string, a: RecordArgs): Promise<void> {
  try {
    await supabase.from(TABLE).insert({
      user_id: userId,
      kind: a.kind,
      model: a.model ?? null,
      prompt_tokens: a.promptTokens ?? null,
      completion_tokens: a.completionTokens ?? null,
      total_tokens: a.totalTokens ?? null,
    });
  } catch {
    /* metering must never break the request */
  }
}

export interface UsageSnapshot {
  chatToday: number;
  chatMonth: number;
  tokensMonth: number;
  limitChatPerDay: number;
}

/** Per-user aggregates for GET /api/usage. Null when unauthenticated. */
export async function getUsageSnapshot(): Promise<UsageSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const day = startOfUtcDay();
  const month = startOfUtcMonth();
  const [today, monthCount, monthRows] = await Promise.all([
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("kind", "chat").gte("created_at", day),
    supabase.from(TABLE).select("*", { count: "exact", head: true }).eq("kind", "chat").gte("created_at", month),
    supabase.from(TABLE).select("total_tokens").gte("created_at", month),
  ]);
  const tokensMonth = (monthRows.data ?? []).reduce(
    (s: number, r: { total_tokens: number | null }) => s + (r.total_tokens ?? 0),
    0,
  );
  return {
    chatToday: today.count ?? 0,
    chatMonth: monthCount.count ?? 0,
    tokensMonth,
    limitChatPerDay: FREE_LIMITS.chatPerDay,
  };
}
