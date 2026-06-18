import type { NextRequest } from "next/server";
import { geocode, googleConfigured } from "@/lib/google";

// Address search (server-side geocoding). GET /api/geo?q=Aix-en-Provence
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!googleConfigured()) {
    return Response.json({ configured: false, results: [] });
  }
  if (q.length < 3) {
    return Response.json({ configured: true, results: [] });
  }
  try {
    return Response.json({ configured: true, results: await geocode(q) });
  } catch (e) {
    return Response.json(
      { configured: true, error: e instanceof Error ? e.message : String(e), results: [] },
      { status: 502 },
    );
  }
}
