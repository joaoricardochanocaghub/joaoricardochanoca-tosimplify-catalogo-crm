// Formatação e datas (pt-PT). Datas em ISO local "AAAA-MM-DD".

const currency = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always" as unknown as boolean,
});

export function formatMoney(value: number): string {
  return currency.format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** "2026-10-05" → "05/10/2026"; outros valores ficam iguais. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Soma dias a uma data ISO (em UTC, sem efeitos de hora de verão). */
export function addDaysIso(iso: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + Math.round(days));
  return date.toISOString().slice(0, 10);
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function newId(prefix = "id"): string {
  const c = globalThis.crypto;
  const raw =
    c && typeof c.randomUUID === "function"
      ? c.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `${prefix}-${raw.replace(/-/g, "").slice(0, 10)}`;
}
