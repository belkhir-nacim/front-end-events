// Server-side Google Maps Platform helpers — uses the server key GOOGLE_MAPS_API_KEY
// (never exposed to the browser; matches the platform/ convention).
import "server-only";

const KEY = process.env.GOOGLE_MAPS_API_KEY;

export function googleConfigured(): boolean {
  return Boolean(KEY);
}

export interface GeoResult {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

/** Forward-geocode a free-text address/place to up to 6 candidates. */
export async function geocode(q: string): Promise<GeoResult[]> {
  if (!KEY) return [];
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    q,
  )}&key=${KEY}`;
  const r = await fetch(url, { next: { revalidate: 86_400 } });
  if (!r.ok) throw new Error(`geocode http ${r.status}`);
  const j = await r.json();
  if (j.status !== "OK" && j.status !== "ZERO_RESULTS") {
    throw new Error(`geocode: ${j.status} ${j.error_message ?? ""}`.trim());
  }
  return (j.results ?? []).slice(0, 6).map(
    (x: {
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      place_id?: string;
    }): GeoResult => ({
      address: x.formatted_address,
      lat: x.geometry.location.lat,
      lng: x.geometry.location.lng,
      placeId: x.place_id,
    }),
  );
}

/** Google Static Maps URL with a brand-colored pin (proxied, key stays server-side). */
export function staticMapUrl(
  lat: number,
  lng: number,
  { zoom = 11, w = 640, h = 360 }: { zoom?: number; w?: number; h?: number } = {},
): string {
  const marker = `markers=${encodeURIComponent(`color:0x0e6b63|${lat},${lng}`)}`;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&scale=2&${marker}&key=${KEY}`;
}
