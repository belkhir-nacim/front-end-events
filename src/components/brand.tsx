import Link from "next/link";

/** Brand glyph — a 12-tick climate ring echoing the Annual Climate Dial. */
export function Mark({ size = 26 }: { size?: number }) {
  const cx = 12;
  const cy = 12;
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  // a few ticks carry the data palette (rain blue, heat amber/vermilion)
  const colored: Record<number, string> = {
    6: "#e0853a",
    7: "#cc2e3c",
    0: "#1f6fb2",
    11: "#1f6fb2",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {ticks.map((i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180;
        const r0 = 6.5;
        const r1 = 10.5;
        return (
          <line
            key={i}
            x1={cx + r0 * Math.cos(a)}
            y1={cy + r0 * Math.sin(a)}
            x2={cx + r1 * Math.cos(a)}
            y2={cy + r1 * Math.sin(a)}
            stroke={colored[i] ?? "#0e6b63"}
            strokeWidth={i in colored ? 2.4 : 1.6}
            strokeLinecap="round"
            opacity={i in colored ? 1 : 0.55}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={3} fill="none" stroke="#0e6b63" strokeWidth={1.6} />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 group">
      <Mark />
      <span className="font-display text-[1.15rem] font-bold tracking-tight text-ink">
        Serenia
      </span>
      <span className="eyebrow text-subtle hidden sm:inline-block mt-0.5">
        climate
      </span>
    </Link>
  );
}
