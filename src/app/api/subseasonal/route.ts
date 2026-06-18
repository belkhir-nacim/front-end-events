import type { NextRequest } from "next/server";
import { fetchSubseasonal } from "@/lib/subseasonal";

// 45-day rain/heat outlook for a point. GET /api/subseasonal?lat=43.7&lon=7.26
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return Response.json({ error: "lat and lon required" }, { status: 400 });
  }
  try {
    return Response.json(await fetchSubseasonal(lat, lon));
  } catch (e) {
    return Response.json(
      { error: "subseasonal_unavailable", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
