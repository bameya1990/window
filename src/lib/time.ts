export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Local-calendar date key, YYYY-MM-DD. */
export function dateKey(d: Date | number = new Date()): string {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${x.getFullYear()}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / DAY);
}

/** "13:30" -> minutes after midnight */
export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

/** Timestamp for a "HH:MM" clock time on the given local date. */
export function atClock(key: string, hhmm: string): number {
  const d = fromKey(key);
  d.setMinutes(hhmmToMin(hhmm));
  return d.getTime();
}

/** 1h 05m, or 42m */
export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h\u00a0${String(m).padStart(2, "0")}m`;
}

/** 14:07 style clock of elapsed time (hours can exceed 24) */
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MIN));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function fmtClock(t: number | string): string {
  const d =
    typeof t === "string" ? new Date(atClock(dateKey(), t)) : new Date(t);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtDay(key: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return fromKey(key).toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  });
}

/** Value for <input type="datetime-local"> */
export function toLocalInput(t: number): string {
  const d = new Date(t);
  const off = d.getTimezoneOffset() * MIN;
  return new Date(t - off).toISOString().slice(0, 16);
}

export function fromLocalInput(s: string): number {
  return new Date(s).getTime();
}
