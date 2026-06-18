// Data-driven color ramps — color encodes the climate value, not decoration.

type Stop = [value: number, hex: string];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function ramp(stops: Stop[], v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "#c8d0cd"; // neutral "no data"
  if (v <= stops[0][0]) return stops[0][1];
  if (v >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i];
    const [v1, c1] = stops[i + 1];
    if (v >= v0 && v <= v1) {
      const t = (v - v0) / (v1 - v0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      return rgbToHex(
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      );
    }
  }
  return stops[stops.length - 1][1];
}

/** Heat ramp keyed on mean daily-max temperature (°C). */
export const heatColor = (tmaxC: number | null | undefined): string =>
  ramp(
    [
      [2, "#2c6fb0"],
      [12, "#7fb2d6"],
      [20, "#e7cf72"],
      [28, "#e0853a"],
      [36, "#cc2e3c"],
    ],
    tmaxC,
  );

/** Rain ramp keyed on number of rainy days in the month. */
export const rainColor = (rainyDays: number | null | undefined): string =>
  ramp(
    [
      [0, "#eef3f6"],
      [4, "#a9cbe1"],
      [10, "#3f86bd"],
      [18, "#123b66"],
    ],
    rainyDays,
  );

export const RISK_COLORS: Record<string, string> = {
  "very low": "#2f9e6f",
  low: "#4f9e72",
  moderate: "#e0853a",
  high: "#cc2e3c",
};
export const riskColor = (label: string | null | undefined): string =>
  (label && RISK_COLORS[label]) || "#5c6c66";
