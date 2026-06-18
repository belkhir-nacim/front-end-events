import type { NextRequest } from "next/server";
import { fetchProjection } from "@/lib/projection";

export const maxDuration = 60;

// CMIP6 climate projection for a location + month. /api/projection?lat&lon&month&model
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const month = Number(sp.get("month"));
  const model = sp.get("model") ?? undefined;
  if (Number.isNaN(lat) || Number.isNaN(lon) || !(month >= 1 && month <= 12)) {
    return Response.json({ error: "lat, lon, month (1-12) required" }, { status: 400 });
  }
  try {
    return Response.json(await fetchProjection(lat, lon, month, model));
  } catch (e) {
    return Response.json(
      { error: "projection_unavailable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
