import type { NextRequest } from "next/server";
import { googleConfigured, staticMapUrl } from "@/lib/google";

// Proxies a Google Static Map image so the API key stays server-side.
// GET /api/geo/staticmap?lat=43.5&lon=5.4&zoom=11
export async function GET(req: NextRequest) {
  if (!googleConfigured()) return new Response("maps key not set", { status: 404 });
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return new Response("bad coordinates", { status: 400 });
  }
  const zoom = Number(sp.get("zoom")) || 11;
  const upstream = await fetch(staticMapUrl(lat, lon, { zoom }), {
    next: { revalidate: 86_400 },
  });
  if (!upstream.ok) return new Response("static map error", { status: 502 });
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=86400",
    },
  });
}
