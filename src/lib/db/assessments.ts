// Server-side CRUD for saved climate assessments. Authenticated client → RLS scopes
// rows to the owner (clone of lib/db/assets.ts).
import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { AssessmentSnapshot } from "@/lib/snapshot";

const TABLE = "event_assessments";

export const assessmentInput = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).nullish(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  segment: z.string().max(40).nullish(),
  event_date: z.string().max(20).nullish(), // ISO yyyy-mm-dd
  month: z.number().int().min(1).max(12),
  snapshot: z.unknown(), // jsonb (validated on read via parseSnapshot)
  snapshot_version: z.number().int().default(1),
});
export type AssessmentInput = z.infer<typeof assessmentInput>;

export interface Assessment {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  segment: string | null;
  event_date: string | null;
  month: number;
  snapshot: AssessmentSnapshot | unknown;
  snapshot_version: number;
  computed_at: string;
  created_at: string;
}

export class Unauthenticated extends Error {}

async function currentUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Unauthenticated("not signed in");
  return user.id;
}

export async function listAssessments(): Promise<Assessment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Assessment[];
}

export async function createAssessment(input: AssessmentInput): Promise<Assessment> {
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Assessment;
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Assessment) ?? null;
}

export async function deleteAssessment(id: string): Promise<void> {
  await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
