import type { NextRequest } from "next/server";
import { clearShareToken, setShareToken } from "@/lib/db/share";
import { Unauthenticated } from "@/lib/db/assessments";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: "auth not configured" }, { status: 503 });
  const { id } = await ctx.params;
  try {
    const token = await setShareToken(id);
    return token
      ? Response.json({ token })
      : Response.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    const status = e instanceof Unauthenticated ? 401 : 500;
    return Response.json({ error: String(e) }, { status });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: "auth not configured" }, { status: 503 });
  const { id } = await ctx.params;
  try {
    await clearShareToken(id);
    return Response.json({ ok: true });
  } catch (e) {
    const status = e instanceof Unauthenticated ? 401 : 500;
    return Response.json({ error: String(e) }, { status });
  }
}
