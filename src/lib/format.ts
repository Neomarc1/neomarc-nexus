export const LAGOS_TZ = "Africa/Lagos";

export function formatNaira(value: number | null | undefined, compact = false): string {
  const n = Number(value ?? 0);
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `₦${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  }
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", {
    timeZone: LAGOS_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    timeZone: LAGOS_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayLagos(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: LAGOS_TZ });
}

export function addMonths(dateISO: string, months: number): string {
  const d = new Date(dateISO + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-CA");
}

export function titleCase(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
