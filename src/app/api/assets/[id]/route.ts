import type { NextRequest } from "next/server";
import { deleteAsset, getAsset, Unauthenticated } from "@/lib/db/assets";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: "auth not configured" }, { status: 503 });
  const { id } = await ctx.params;
  try {
    const asset = await getAsset(id);
    return asset ? Response.json({ asset }) : Response.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: "auth not configured" }, { status: 503 });
  const { id } = await ctx.params;
  try {
    await deleteAsset(id);
    return Response.json({ ok: true });
  } catch (e) {
    const status = e instanceof Unauthenticated ? 401 : 500;
    return Response.json({ error: String(e) }, { status });
  }
}
