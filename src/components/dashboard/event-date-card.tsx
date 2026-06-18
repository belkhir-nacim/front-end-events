import { CalendarCheck } from "lucide-react";
import { days, deg, mm } from "@/lib/format";
import type { HeatRisk, RainRisk, SubDay, Subseasonal } from "@/lib/types";

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <span className="eyebrow text-subtle">{label}</span>
      </div>
      <p className="mt-1 tnum text-2xl text-ink">{value}</p>
    </div>
  );
}

const fmt = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export function EventDateCard({
  date,
  end,
  subseasonal,
  rain,
  heat,
  monthName,
}: {
  date: string;
  end?: string | null;
  subseasonal: Subseasonal | null;
  rain: RainRisk | null;
  heat: HeatRisk | null;
  monthName: string;
}) {
  const start = date;
  const isRange = Boolean(end && end !== start);
  const last = isRange ? end! : start;

  const startDate = new Date(`${start}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAway = Math.round((startDate.getTime() - today.getTime()) / 86_400_000);
  const away =
    daysAway < 0 ? "in the past"
    : daysAway === 0 ? "starts today"
    : daysAway <= 45 ? `in ${daysAway} days`
    : `in ~${Math.round(daysAway / 30)} months`;

  const inWindow: SubDay[] = (subseasonal?.days ?? []).filter((d) => d.date >= start && d.date <= last);
  const hasForecast = inWindow.length > 0 && daysAway >= 0 && daysAway <= 45;

  const precipVals = inWindow.map((d) => d.precip).filter((x): x is number => x != null);
  const tmaxVals = inWindow.map((d) => d.tmax).filter((x): x is number => x != null);
  const wetDays = precipVals.filter((p) => p >= 1).length;
  const totalRain = precipVals.reduce((a, b) => a + b, 0);
  const peakHigh = tmaxVals.length ? Math.max(...tmaxVals) : null;
  const singleDay = inWindow[0];

  return (
    <section
      className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-5"
      style={{ borderLeft: "3px solid var(--color-brand)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <CalendarCheck size={18} className="text-brand" /> Your event ·{" "}
          {isRange ? `${fmt(start)} → ${fmt(last)}` : fmt(start)}
        </span>
        <span className="eyebrow text-subtle">{away}</span>
      </div>

      {hasForecast ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {isRange ? (
              <>
                <Stat label="wet days" value={String(wetDays)} accent="var(--color-rain)" />
                <Stat label="peak high" value={deg(peakHigh)} accent="var(--color-heat)" />
                <Stat label="total rain" value={mm(totalRain)} accent="var(--color-rain)" />
              </>
            ) : (
              <>
                <Stat label="forecast high" value={deg(singleDay?.tmax)} accent="var(--color-heat)" />
                <Stat label="forecast rain" value={mm(singleDay?.precip)} accent="var(--color-rain)" />
                <Stat label="outlook" value={(singleDay?.precip ?? 0) >= 1 ? "wet" : "dry"} accent="var(--color-brand)" />
              </>
            )}
          </div>
          <p className="mt-2 font-pixel text-[0.6rem] uppercase tracking-wide text-subtle">
            forecast {isRange ? `over ${inWindow.length} days` : "for the day"} · within the 45-day outlook
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-subtle">
          {daysAway > 45
            ? "Beyond the 45-day forecast — here's the typical climate for the month."
            : daysAway < 0
              ? "This date has passed; showing the typical climate for the month."
              : "No daily forecast available; showing the typical climate for the month."}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <span className="eyebrow text-subtle">historical typical · {monthName}</span>
        <p className="mt-1.5 text-sm text-ink">
          About <span className="tnum">{days(rain?.expected_rainy_days)}</span> rainy days, peaks
          near <span className="tnum">{deg(heat?.expected_hottest_day_c)}</span>
          {rain?.risk_label_heavy_rain ? `, heavy-rain risk ${rain.risk_label_heavy_rain}.` : "."}
        </p>
      </div>
    </section>
  );
}
