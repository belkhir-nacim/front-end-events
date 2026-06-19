import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand";
import { ClimateDial, type DialDatum } from "@/components/climate-dial";
import { InstantVerdict } from "@/components/landing/instant-verdict";

const HERO_YEAR: DialDatum[] = [
  { month: 1, heat: 7, rain: 11 }, { month: 2, heat: 8, rain: 9 },
  { month: 3, heat: 12, rain: 10 }, { month: 4, heat: 16, rain: 9 },
  { month: 5, heat: 20, rain: 10 }, { month: 6, heat: 23, rain: 8 },
  { month: 7, heat: 26, rain: 7 }, { month: 8, heat: 26, rain: 7 },
  { month: 9, heat: 22, rain: 7 }, { month: 10, heat: 16, rain: 9 },
  { month: 11, heat: 11, rain: 10 }, { month: 12, heat: 8, rain: 11 },
];

const STEPS = [
  { n: "01", t: "Pin the place", d: "Any address. We read the climate of that area." },
  { n: "02", t: "Pick the month", d: "Every year on record, lined up for that month." },
  { n: "03", t: "Read the odds", d: "Rain and heat risk, charts, and a plan." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-sm text-subtle hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90 transition-opacity"
            >
              Open the app <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-16 px-6 py-24 lg:flex-row lg:justify-between lg:py-32">
        <div className="max-w-xl">
          <p className="eyebrow text-subtle">Climate odds · not a forecast</p>
          <h1 className="mt-6 text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Know the weather odds, months&nbsp;out.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-subtle">
            Serenia reads 80+ years of climate record as plain probabilities — the historical
            risk of rain and heat for any address, any month.
          </p>
          <div className="mt-9 flex items-center gap-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-ink transition-colors"
            >
              Check a date <ArrowRight size={17} />
            </Link>
            <Link href="#how" className="text-base text-ink underline-offset-4 hover:underline">
              How it works
            </Link>
          </div>
          <p className="mt-10 font-pixel text-xs uppercase tracking-wide text-subtle">
            ERA5 reanalysis · 1940–present
          </p>
        </div>

        <div className="shrink-0">
          <ClimateDial
            data={HERO_YEAR}
            selected={8}
            size={380}
            centerTop="typical year"
            centerMain="Aug"
            centerSub="26° · 7 rain days"
          />
        </div>
      </section>

      {/* Try it — no-login instant verdict */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <InstantVerdict />
        </div>
      </section>

      {/* Thesis */}
      <section className="border-y border-line">
        <div className="mx-auto grid max-w-5xl gap-px overflow-hidden px-6 py-16 sm:grid-cols-2">
          <div className="sm:pr-12">
            <p className="font-pixel text-xs uppercase tracking-wide text-subtle">The forecast</p>
            <p className="mt-3 text-2xl leading-snug tracking-tight text-ink">
              Sees about 16 days. Silent on the date you&apos;re actually booking.
            </p>
          </div>
          <div className="mt-10 border-t border-line pt-10 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-12 sm:pt-0">
            <p className="font-pixel text-xs uppercase tracking-wide text-brand-ink">Serenia</p>
            <p className="mt-3 text-2xl leading-snug tracking-tight text-ink">
              Reads decades of record — the odds it rains, pours, or scorches that month.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="grid gap-12 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n}>
              <span className="font-pixel text-sm text-brand-ink">{s.n}</span>
              <h3 className="mt-4 text-lg font-medium tracking-tight text-ink">{s.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-subtle">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col items-start gap-5 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Put in an address and a date.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-medium text-white hover:bg-brand-ink transition-colors"
          >
            Open the dashboard <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-8 text-sm text-subtle sm:flex-row sm:items-center">
          <Logo />
          <p className="max-w-sm font-pixel text-[0.65rem] uppercase leading-relaxed tracking-wide">
            Climate odds from ERA5 (Copernicus/ECMWF) · forecasts via Open-Meteo · area-level, not
            street-level
          </p>
        </div>
      </footer>
    </div>
  );
}
