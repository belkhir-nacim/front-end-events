import { MessageSquare, ShieldCheck } from "lucide-react";
import type { HeatRisk, RainRisk } from "@/lib/types";

type Tone = "rain" | "heat" | "good";
interface Tip {
  tone: Tone;
  text: string;
}

const DOT: Record<Tone, string> = {
  rain: "var(--color-rain)",
  heat: "var(--color-heat)",
  good: "var(--color-good)",
};

function tips(rain: RainRisk | null, heat: HeatRisk | null): Tip[] {
  const out: Tip[] = [];
  const heavy = rain?.prob_heavy_rain_day ?? 0;
  const wet = rain?.expected_rainy_days ?? 0;
  if (heavy >= 0.33 || wet >= 10) {
    out.push({ tone: "rain", text: "High washout exposure — secure covered space or a marquee, and hold a rain date." });
  } else if (heavy >= 0.15 || wet >= 5) {
    out.push({ tone: "rain", text: "Some rain exposure — keep a wet-weather plan (cover, solid flooring) ready." });
  } else {
    out.push({ tone: "good", text: "Low rain risk — open-air should hold up in most years." });
  }

  const over35 = heat?.prob_any_day_over_35c ?? 0;
  const hot = heat?.expected_hot_days ?? 0;
  if (over35 >= 0.2 || hot >= 8) {
    out.push({ tone: "heat", text: "Real heat exposure — plan shade and water, and put key moments before noon or after 5pm." });
  } else if (hot >= 2) {
    out.push({ tone: "heat", text: "Warm spell likely — offer shade and water and watch the midday window." });
  } else {
    out.push({ tone: "good", text: "Comfortable heat profile for an outdoor plan." });
  }
  return out;
}

export function Recommendation({
  rain,
  heat,
  monthName,
  onAsk,
}: {
  rain: RainRisk | null;
  heat: HeatRisk | null;
  monthName: string;
  onAsk?: () => void;
}) {
  if (!rain && !heat) return null;
  const list = tips(rain, heat);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-brand" />
        <h3 className="text-sm font-medium text-ink">Plan for {monthName}</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {list.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink">
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: DOT[t.tone] }}
            />
            {t.text}
          </li>
        ))}
      </ul>
      {onAsk && (
        <button
          onClick={onAsk}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-ink transition-colors"
        >
          <MessageSquare size={15} /> Ask the assistant for a tailored plan
        </button>
      )}
    </div>
  );
}
