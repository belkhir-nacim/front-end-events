// Event-segment taxonomy + segment-aware, deterministic recommendation copy.
// Same numeric thresholds for every segment; only the phrasing/advice differs,
// so there is zero added LLM cost and no hallucination/liability risk.
import type { HeatRisk, RainRisk } from "./types";

export type Segment = "wedding" | "festival" | "shoot" | "venue" | "field_ops" | "other";

export const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "festival", label: "Festival" },
  { value: "shoot", label: "Film / photo shoot" },
  { value: "venue", label: "Venue / hospitality" },
  { value: "field_ops", label: "Field ops / construction" },
  { value: "other", label: "Other event" },
];

const SEGMENT_VALUES = new Set(SEGMENTS.map((s) => s.value));

/** Map a free-text event_type (or anything) onto the closed enum; default "other". */
export function toSegment(v: string | null | undefined): Segment {
  const s = (v ?? "").toLowerCase().trim();
  if (SEGMENT_VALUES.has(s as Segment)) return s as Segment;
  if (/wed|bride|groom|marriage/.test(s)) return "wedding";
  if (/festiv|concert|fair|market|parade/.test(s)) return "festival";
  if (/shoot|film|photo|video|production/.test(s)) return "shoot";
  if (/venue|hotel|resort|restaurant|hospitality|terrace/.test(s)) return "venue";
  if (/construc|field|crew|site|ops|infrastructure|agri/.test(s)) return "field_ops";
  return "other";
}

export function segmentLabel(seg: Segment): string {
  return SEGMENTS.find((s) => s.value === seg)?.label ?? "Event";
}

export type Tone = "rain" | "heat" | "good";
export interface Tip {
  tone: Tone;
  text: string;
}

type Sev = "high" | "mid" | "low";

function rainSev(rain: RainRisk | null): Sev {
  const heavy = rain?.prob_heavy_rain_day ?? 0;
  const wet = rain?.expected_rainy_days ?? 0;
  if (heavy >= 0.33 || wet >= 10) return "high";
  if (heavy >= 0.15 || wet >= 5) return "mid";
  return "low";
}
function heatSev(heat: HeatRisk | null): Sev {
  const over35 = heat?.prob_any_day_over_35c ?? 0;
  const hot = heat?.expected_hot_days ?? 0;
  if (over35 >= 0.2 || hot >= 8) return "high";
  if (hot >= 2) return "mid";
  return "low";
}

const RAIN_COPY: Record<Segment, Record<Sev, string>> = {
  wedding: {
    high: "High washout risk — secure a marquee or indoor backup and hold a rain date; brief the photographer on a wet-weather shot list.",
    mid: "Some rain exposure — line up a covered cocktail area and solid flooring so heels and hems stay dry.",
    low: "Low rain risk — an open-air ceremony should hold up most years; keep a few umbrellas as a courtesy.",
  },
  festival: {
    high: "High washout risk — plan covered stages, trackway/matting over grass to prevent mud, and a published wet-weather contingency for crowd safety.",
    mid: "Some rain exposure — protect stage electrics and FOH, and have ground matting on standby for high-traffic areas.",
    low: "Low rain risk — open-ground layout should be fine most years; keep tarps for kit.",
  },
  shoot: {
    high: "High washout risk — budget a cover set or weather day, protect camera/grip gear, and watch continuity across days.",
    mid: "Some rain exposure — keep rain covers and a backup interior location ready to avoid losing the day.",
    low: "Low rain risk — exteriors should hold most years; still rig gear rain protection.",
  },
  venue: {
    high: "High washout risk — steer bookings to covered/indoor space this month and set a clear rain-move policy for guests.",
    mid: "Some rain exposure — keep a covered overflow option and brief staff on the move-indoors trigger.",
    low: "Low rain risk — outdoor service should hold up most years.",
  },
  field_ops: {
    high: "High rain exposure — expect lost working days; sequence weather-sensitive tasks for drier windows and protect materials.",
    mid: "Some rain exposure — build slack into the schedule and cover stored materials.",
    low: "Low rain risk — outdoor work should proceed most years.",
  },
  other: {
    high: "High washout exposure — secure covered space or a marquee, and hold a rain date.",
    mid: "Some rain exposure — keep a wet-weather plan (cover, solid flooring) ready.",
    low: "Low rain risk — open-air should hold up in most years.",
  },
};

const HEAT_COPY: Record<Segment, Record<Sev, string>> = {
  wedding: {
    high: "Real heat exposure — provide shade, water stations and fans, and put the ceremony before noon or after 5pm so guests (and the cake) stay comfortable.",
    mid: "Warm spell likely — offer shade and water and avoid a midday outdoor ceremony.",
    low: "Comfortable heat profile for an outdoor celebration.",
  },
  festival: {
    high: "Real heat exposure — mandate free water points, shade structures and a medical/heat plan for the crowd; schedule headline sets for the cooler evening.",
    mid: "Warm spell likely — provide shade and water access and watch the midday peak for crowd welfare.",
    low: "Comfortable heat profile for a crowd outdoors.",
  },
  shoot: {
    high: "Real heat exposure — schedule around the midday peak, shade talent and gear, and watch overheating cameras/batteries; keep water on set.",
    mid: "Warm spell likely — provide shade for cast/crew and plan the heaviest setups outside midday.",
    low: "Comfortable heat profile for an outdoor shoot.",
  },
  venue: {
    high: "Real heat exposure — prioritise shaded/AC seating, push lunch service earlier or later, and keep water visible for guests.",
    mid: "Warm spell likely — offer shaded tables and water and watch the midday service window.",
    low: "Comfortable heat profile for outdoor service.",
  },
  field_ops: {
    high: "Real heat exposure — enforce heat-stress breaks, shade and hydration, and shift strenuous work to early morning per safety guidance.",
    mid: "Warm spell likely — schedule heavy work earlier and ensure shade and water for the crew.",
    low: "Comfortable heat profile for crew working outdoors.",
  },
  other: {
    high: "Real heat exposure — plan shade and water, and put key moments before noon or after 5pm.",
    mid: "Warm spell likely — offer shade and water and watch the midday window.",
    low: "Comfortable heat profile for an outdoor plan.",
  },
};

export function segmentTips(rain: RainRisk | null, heat: HeatRisk | null, segment: Segment = "other"): Tip[] {
  const out: Tip[] = [];
  const rs = rainSev(rain);
  out.push({ tone: rs === "low" ? "good" : "rain", text: RAIN_COPY[segment][rs] });
  const hs = heatSev(heat);
  out.push({ tone: hs === "low" ? "good" : "heat", text: HEAT_COPY[segment][hs] });
  return out;
}
