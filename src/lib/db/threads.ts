// Durable chat threads: load/save the Assistant conversation per (user, thread_key).
// RLS scopes rows to the owner.
import "server-only";

import { createClient } from "@/lib/supabase/server";

const TABLE = "chat_threads";

export class Unauthenticated extends Error {}

export async function getThreadMessages(key: string): Promise<unknown[]> {
  const supabase = await createClient();
  const { data } = await supabase.from(TABLE).select("messages").eq("thread_key", key).maybeSingle();
  const messages = (data as { messages?: unknown[] } | null)?.messages;
  return Array.isArray(messages) ? messages : [];
}

export async function saveThreadMessages(key: string, messages: unknown): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Unauthenticated("not signed in");
  await supabase
    .from(TABLE)
    .upsert(
      { user_id: user.id, thread_key: key, messages: messages ?? [], updated_at: new Date().toISOString() },
      { onConflict: "user_id,thread_key" },
    );
}
