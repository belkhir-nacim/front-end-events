import type { NextRequest } from "next/server";
import { Unauthenticated, getThreadMessages, saveThreadMessages } from "@/lib/db/threads";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) return Response.json({ messages: [] });
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return Response.json({ messages: [] });
  try {
    return Response.json({ messages: await getThreadMessages(key) });
  } catch {
    return Response.json({ messages: [] });
  }
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseConfigured()) return Response.json({ ok: false }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { key?: string; messages?: unknown } | null;
  if (!body?.key) return Response.json({ error: "key required" }, { status: 400 });
  try {
    await saveThreadMessages(body.key, body.messages ?? []);
    return Response.json({ ok: true });
  } catch (e) {
    const status = e instanceof Unauthenticated ? 401 : 500;
    return Response.json({ error: String(e) }, { status });
  }
}
