// Share-link lifecycle for saved assessments. Owner sets/clears a token under RLS;
// the PUBLIC report read uses the service-role client and returns ONLY display fields
// (never user_id / email). Pattern adapted from platform/src/lib/reports/resolve-share-token.ts
// (org-scoped there → own-row here).
import "server-only";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { Unauthenticated } from "@/lib/db/assessments";
import { parseSnapshot, type AssessmentSnapshot } from "@/lib/snapshot";

const TABLE = "event_assessments";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Unauthenticated("not signed in");
  return supabase;
}

/** Owner-only. Mints (or rotates) a share token; returns it, or null if not owner/not found. */
export async function setShareToken(id: string): Promise<string | null> {
  const supabase = await requireUser();
  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ share_token: token, share_token_created_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle(); // RLS update-own → no row when not the owner
  if (error) throw new Error(error.message);
  return data ? token : null;
}

/** Owner-only. Revokes sharing. */
export async function clearShareToken(id: string): Promise<void> {
  const supabase = await requireUser();
  const { error } = await supabase
    .from(TABLE)
    .update({ share_token: null, share_token_created_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export interface SharedReport {
  name: string;
  segment: string | null;
  snapshot: AssessmentSnapshot;
}

/** Public resolver (service-role). Returns only display fields; null on bad token / not found. */
export async function resolveShareToken(token: string): Promise<SharedReport | null> {
  if (!UUID_RE.test(token)) return null;
  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("name, segment, snapshot") // NEVER select user_id / email
    .eq("share_token", token)
    .maybeSingle();
  if (error || !data) return null;
  const snap = parseSnapshot((data as { snapshot: unknown }).snapshot);
  if (!snap) return null;
  return { name: (data as { name: string }).name, segment: (data as { segment: string | null }).segment, snapshot: snap };
}
