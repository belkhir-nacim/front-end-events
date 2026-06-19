import type { NextRequest } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const TABLE = "event_alerts";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ alert: null });
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase
    .from(TABLE)
    .select("active, last_message, last_triggered_at")
    .eq("assessment_id", id)
    .maybeSingle();
  return Response.json({ alert: data ?? null });
}

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: "auth not configured" }, { status: 503 });
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: user.id, assessment_id: id, active: true }, { onConflict: "user_id,assessment_id" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ active: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: "auth not configured" }, { status: 503 });
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });
  await supabase.from(TABLE).update({ active: false }).eq("assessment_id", id);
  return Response.json({ active: false });
}
