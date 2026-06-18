"use client";

import { useState } from "react";
import { heatColor, rainColor } from "@/lib/colors";
import { MONTHS_SHORT } from "@/lib/format";

export interface DialDatum {
  month: number; // 1..12
  heat: number | null; // mean daily max °C  -> outer ring
  rain: number | null; // rainy days         -> inner ring
}

interface Props {
  data: DialDatum[];
  selected?: number | null;
  onSelect?: (month: number) => void;
  size?: number;
  className?: string;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
}

const TAU = Math.PI / 180;
function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg - 90) * TAU;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function sector(
  cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number,
): string {
  const [x0o, y0o] = polar(cx, cy, rOut, a0);
  const [x1o, y1o] = polar(cx, cy, rOut, a1);
  const [x1i, y1i] = polar(cx, cy, rIn, a1);
  const [x0i, y0i] = polar(cx, cy, rIn, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

/**
 * Annual Climate Dial — the signature. Outer arc = typical heat, inner band =
 * rainfall; click a month to select. The year is a cycle, so the selector is too.
 */
export function ClimateDial({
  data, selected, onSelect, size = 320, className,
  centerTop, centerMain, centerSub,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 18; // leave room for labels
  const gap = 2.2; // degrees between wedges
  const interactive = Boolean(onSelect);

  const byMonth = new Map(data.map((d) => [d.month, d]));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role={interactive ? "group" : "img"}
      aria-label="Annual climate dial: typical heat (outer) and rainfall (inner) by month"
    >
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const a0 = (m - 1) * 30 + gap / 2;
        const a1 = m * 30 - gap / 2;
        const d = byMonth.get(m);
        const isSel = selected === m;
        const isHover = hover === m;
        const lift = isSel || isHover ? 1.04 : 1;
        const heatR1 = R * 0.99 * lift;
        const heatR0 = R * 0.74;
        const rainR1 = R * 0.7;
        const rainR0 = R * 0.46;
        const [lx, ly] = polar(cx, cy, R * 1.06, (a0 + a1) / 2);
        return (
          <g
            key={m}
            onMouseEnter={() => setHover(m)}
            onMouseLeave={() => setHover(null)}
            onClick={interactive ? () => onSelect!(m) : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect!(m);
                  }
                : undefined
            }
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `Select ${MONTHS_SHORT[m]}` : undefined}
            aria-pressed={interactive ? isSel : undefined}
            style={{ cursor: interactive ? "pointer" : "default", transition: "all .18s ease" }}
          >
            {/* heat ring */}
            <path
              d={sector(cx, cy, heatR0, heatR1, a0, a1)}
              fill={heatColor(d?.heat)}
              opacity={isSel || isHover ? 1 : 0.92}
              stroke={isSel ? "#14211d" : "transparent"}
              strokeWidth={isSel ? 1.5 : 0}
            />
            {/* rain band */}
            <path
              d={sector(cx, cy, rainR0, rainR1, a0, a1)}
              fill={rainColor(d?.rain)}
              opacity={isSel || isHover ? 1 : 0.9}
            />
            {/* month label */}
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="tnum"
              fontSize={size > 260 ? 10 : 8}
              fill={isSel ? "#14211d" : "#5c6c66"}
              fontWeight={isSel ? 600 : 400}
            >
              {MONTHS_SHORT[m]}
            </text>
          </g>
        );
      })}

      {/* center label */}
      {(centerTop || centerMain || centerSub) && (
        <g>
          {centerTop && (
            <text x={cx} y={cy - 22} textAnchor="middle" className="eyebrow" fill="#5c6c66" fontSize={9}>
              {centerTop}
            </text>
          )}
          {centerMain && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              className="font-display"
              fontSize={size > 260 ? 30 : 22}
              fontWeight={700}
              fill="#14211d"
            >
              {centerMain}
            </text>
          )}
          {centerSub && (
            <text x={cx} y={cy + 26} textAnchor="middle" className="tnum" fill="#5c6c66" fontSize={11}>
              {centerSub}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
