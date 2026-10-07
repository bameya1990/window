import { HOUR, MIN, addDays, dateKey, daysBetween, fromKey } from "./time";

export type Stage = { fast: number; eat: number; open: string; close: string };

/**
 * 16:8 -> 20:4, one hour per stage. The window closes progressively earlier
 * (8pm -> 7pm) while opening later, so it lands on 3-7pm: the same 4h window
 * used in the Cienfuegos 2020 trial.
 */
export const STAGES: Stage[] = [
  { fast: 16, eat: 8, open: "12:00", close: "20:00" },
  { fast: 17, eat: 7, open: "13:00", close: "20:00" },
  { fast: 18, eat: 6, open: "13:30", close: "19:30" },
  { fast: 19, eat: 5, open: "14:00", close: "19:00" },
  { fast: 20, eat: 4, open: "15:00", close: "19:00" },
];

export const REVIEW_DAYS = 7;
export const ADVANCE_HITS = 5;
/** A fast within 15 minutes of target still counts. */
export const GRACE_MS = 15 * MIN;
export const KCAL_PER_KG = 7700;

export type Fast = { id: string; start: number; end: number | null; targetH: number };
export type DayLog = { burn?: number; steps?: number; sleep?: number; strength?: boolean };
export type WeighIn = { date: string; kg: number };

export type Settings = {
  heightCm: number;
  age: number;
  sex: "m" | "f";
  startKg: number;
  goalKg: number;
  ratePerWeek: number;
  startDate: string;
  stepTarget: number;
  sleepTarget: number;
  strengthPerWeek: number;
  /** 0 = Sunday ... 1 = Monday */
  weighDay: number;
  theme: "system" | "light" | "dark";
  nudge: boolean;
  nudgeHour: number;
};

export type Ramp = { stage: number; since: string; log: { stage: number; since: string }[] };

export type State = {
  version: 1;
  settings: Settings;
  fasts: Fast[];
  days: Record<string, DayLog>;
  weighIns: WeighIn[];
  ramp: Ramp;
};

export function initialState(): State {
  const today = dateKey();
  return {
    version: 1,
    settings: {
      heightCm: 165,
      age: 35,
      sex: "m",
      startKg: 88,
      goalKg: 72,
      ratePerWeek: 0.75,
      startDate: today,
      stepTarget: 10000,
      sleepTarget: 8,
      strengthPerWeek: 4,
      weighDay: 1,
      theme: "system",
      nudge: true,
      nudgeHour: 21,
    },
    fasts: [],
    days: {},
    weighIns: [{ date: today, kg: 88 }],
    // Already comfortable on 16:8, so the ramp opens at 17:7.
    ramp: { stage: 1, since: today, log: [{ stage: 1, since: today }] },
  };
}

/* ---------- fasting ---------- */

export const activeFast = (s: State) => s.fasts.find((f) => f.end === null) ?? null;

export function fastHit(f: Fast): boolean {
  return f.end !== null && f.end - f.start >= f.targetH * HOUR - GRACE_MS;
}

/** Days (by end date) on which at least one fast hit its target. */
export function hitDays(s: State): Set<string> {
  const out = new Set<string>();
  for (const f of s.fasts) if (fastHit(f)) out.add(dateKey(f.end!));
  return out;
}

export type Review =
  | { kind: "pending"; day: number; hits: number; reviewOn: string }
  | { kind: "advance"; hits: number; next: Stage }
  | { kind: "hold"; hits: number }
  | { kind: "final"; hits: number };

export function reviewRamp(s: State, today = dateKey()): Review {
  const { stage, since } = s.ramp;
  const hits = hitDays(s);
  let n = 0;
  for (let i = 0; i < REVIEW_DAYS; i++) if (hits.has(addDays(since, i))) n++;
  const elapsed = daysBetween(since, today);
  if (elapsed < REVIEW_DAYS)
    return { kind: "pending", day: elapsed + 1, hits: n, reviewOn: addDays(since, REVIEW_DAYS) };
  if (stage >= STAGES.length - 1) return { kind: "final", hits: n };
  if (n >= ADVANCE_HITS) return { kind: "advance", hits: n, next: STAGES[stage + 1] };
  return { kind: "hold", hits: n };
}

/** Fasting phase labels. Kept deliberately modest; timings vary person to person. */
export function phase(hours: number): { label: string; note: string } {
  if (hours < 4) return { label: "Digesting", note: "Blood sugar and insulin settling after your last meal." };
  if (hours < 12) return { label: "Post-absorptive", note: "Running on stored glycogen. Water, black coffee and tea are fine." };
  if (hours < 18) return { label: "Glycogen running low", note: "Fat use climbing. Hunger comes in waves and usually passes in 20 minutes." };
  return { label: "Extended fast", note: "Add a pinch of salt to water if you feel light-headed." };
}

/* ---------- energy & weight ---------- */

export function bmr(st: Settings, kg: number): number {
  return 10 * kg + 6.25 * st.heightCm - 5 * st.age + (st.sex === "m" ? 5 : -161);
}

export function latestWeight(s: State): number {
  const w = [...s.weighIns].sort((a, b) => a.date.localeCompare(b.date));
  return w.length ? w[w.length - 1].kg : s.settings.startKg;
}

/** Kg per week from a least-squares fit over the last 5 weeks of weigh-ins. */
export function actualRate(s: State, today = dateKey()): number | null {
  const pts = s.weighIns
    .filter((w) => daysBetween(w.date, today) <= 35)
    .map((w) => ({ x: daysBetween(s.settings.startDate, w.date), y: w.kg }));
  if (pts.length < 2) return null;
  const xs = pts.map((p) => p.x);
  if (Math.max(...xs) - Math.min(...xs) < 6) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  let num = 0, den = 0;
  for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2; }
  return -(num / den) * 7;
}

export function targetWeightOn(st: Settings, key: string): number {
  const weeks = daysBetween(st.startDate, key) / 7;
  return Math.max(st.goalKg, st.startKg - st.ratePerWeek * weeks);
}

export function goalDate(st: Settings, fromKg = st.startKg, fromKey = st.startDate, rate = st.ratePerWeek): string | null {
  if (rate <= 0) return null;
  const days = Math.ceil(((fromKg - st.goalKg) / rate) * 7);
  return addDays(fromKey, Math.max(0, days));
}

export function avgBurn(s: State, today = dateKey(), span = 7): number | null {
  const vals: number[] = [];
  for (let i = 0; i < span; i++) {
    const b = s.days[addDays(today, -i)]?.burn;
    if (b != null) vals.push(b);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** Monday-start week containing `key`. */
export function weekStart(key: string): string {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7;
  return addDays(key, -dow);
}

export function weekSummary(s: State, anyDay: string) {
  const start = weekStart(anyDay);
  const hits = hitDays(s);
  let hit = 0, strength = 0, burn = 0;
  const steps: number[] = [], sleep: number[] = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(start, i);
    if (hits.has(k)) hit++;
    const d = s.days[k];
    if (!d) continue;
    if (d.strength) strength++;
    if (d.burn) burn += d.burn;
    if (d.steps != null) steps.push(d.steps);
    if (d.sleep != null) sleep.push(d.sleep);
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return { start, hit, strength, burn, steps: avg(steps), sleep: avg(sleep) };
}

export function needsWeighIn(s: State, today = dateKey()): boolean {
  if (fromKey(today).getDay() !== s.settings.weighDay) return false;
  return !s.weighIns.some((w) => w.date === today);
}
