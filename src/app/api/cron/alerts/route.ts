import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { evaluateAlerts } from "@/lib/alerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily Vercel cron. Vercel attaches `Authorization: Bearer ${CRON_SECRET}` automatically
// when CRON_SECRET is set. Never browser-callable.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) return Response.json({ error: "supabase not configured" }, { status: 503 });
  try {
    const supabase = await createServiceClient();
    const result = await evaluateAlerts(supabase);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
