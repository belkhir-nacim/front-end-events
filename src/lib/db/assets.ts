// Server-side CRUD for saved event locations ("assets" in the UI).
// Uses the authenticated Supabase client so RLS scopes rows to the owner.
import "server-only";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const TABLE = "event_assets";

export const assetInput = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).nullish(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  event_type: z.string().max(60).nullish(),
  event_date: z.string().max(20).nullish(), // ISO yyyy-mm-dd
});
export type AssetInput = z.infer<typeof assetInput>;

export interface Asset extends AssetInput {
  id: string;
  user_id: string;
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

export async function listAssets(): Promise<Asset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Asset[];
}

export async function createAsset(input: AssetInput): Promise<Asset> {
  const userId = await currentUserId();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Asset;
}

export async function getAsset(id: string): Promise<Asset | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Asset) ?? null;
}

export async function deleteAsset(id: string): Promise<void> {
  await currentUserId();
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
