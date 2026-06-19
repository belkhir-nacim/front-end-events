import { getUsageSnapshot } from "@/lib/usage";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) return Response.json({ configured: false, usage: null });
  try {
    return Response.json({ configured: true, usage: await getUsageSnapshot() });
  } catch (e) {
    return Response.json({ configured: true, usage: null, error: String(e) }, { status: 500 });
  }
}
