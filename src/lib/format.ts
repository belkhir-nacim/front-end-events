export const MONTHS_SHORT = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTHS_LONG = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DASH = "—";

export const pct = (p: number | null | undefined): string =>
  p == null ? DASH : `${Math.round(p * 100)}%`;

export const deg = (n: number | null | undefined): string =>
  n == null ? DASH : `${n.toFixed(1)}°`;

export const mm = (n: number | null | undefined): string =>
  n == null ? DASH : `${Math.round(n)} mm`;

export const days = (n: number | null | undefined): string =>
  n == null ? DASH : `${(+n).toFixed(1)}`;

export const oneDp = (n: number | null | undefined): string =>
  n == null ? DASH : (+n).toFixed(1);

/** A historical "1-in-N years" return phrasing for a probability. */
export const returnPeriod = (p: number | null | undefined): string => {
  if (p == null || p <= 0) return "rare on record";
  const n = Math.round(1 / p);
  return n <= 1 ? "most years" : `~1 in ${n} years`;
};
