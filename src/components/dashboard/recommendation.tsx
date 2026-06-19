import { MessageSquare, ShieldCheck } from "lucide-react";
import type { HeatRisk, RainRisk } from "@/lib/types";
import { type Segment, type Tone, segmentLabel, segmentTips } from "@/lib/segments";

const DOT: Record<Tone, string> = {
  rain: "var(--color-rain)",
  heat: "var(--color-heat)",
  good: "var(--color-good)",
};

export function Recommendation({
  rain,
  heat,
  monthName,
  segment = "other",
  onAsk,
}: {
  rain: RainRisk | null;
  heat: HeatRisk | null;
  monthName: string;
  segment?: Segment;
  onAsk?: () => void;
}) {
  if (!rain && !heat) return null;
  const list = segmentTips(rain, heat, segment);
  const label = segmentLabel(segment);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-brand" />
        <h3 className="text-sm font-medium text-ink">
          {segment === "other" ? `Plan for ${monthName}` : `${label} plan · ${monthName}`}
        </h3>
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
