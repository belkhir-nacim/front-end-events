import type { NextRequest } from "next/server";
import { bestDates } from "@/lib/optimizer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  const start = sp.get("start");
  const end = sp.get("end");
  const step = Number(sp.get("step")) || 7;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !start || !end) {
    return Response.json({ error: "lat, lon, start, end required" }, { status: 400 });
  }
  try {
    return Response.json({ dates: await bestDates(lat, lon, start, end, step) });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
