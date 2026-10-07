import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { get, set } from "idb-keyval";
import { STAGES, initialState, type DayLog, type Settings, type State } from "./plan";
import { dateKey } from "./time";

export const STORAGE_KEY = "window-state";

type Action =
  | { type: "load"; state: State }
  | { type: "startFast"; at: number }
  | { type: "endFast"; at: number }
  | { type: "editFast"; id: string; start: number; end: number | null }
  | { type: "deleteFast"; id: string }
  | { type: "logDay"; date: string; patch: Partial<DayLog> }
  | { type: "weigh"; date: string; kg: number }
  | { type: "deleteWeigh"; date: string }
  | { type: "setStage"; stage: number }
  | { type: "restartStage" }
  | { type: "settings"; patch: Partial<Settings> };

const uid = () => Math.random().toString(36).slice(2, 10);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "load":
      return a.state;
    case "startFast":
      if (s.fasts.some((f) => f.end === null)) return s;
      return {
        ...s,
        fasts: [...s.fasts, { id: uid(), start: a.at, end: null, targetH: STAGES[s.ramp.stage].fast }],
      };
    case "endFast":
      // Under a minute is a mis-tap: discard rather than record a 0m fast.
      return {
        ...s,
        fasts: s.fasts
          .filter((f) => f.end !== null || a.at - f.start >= 60_000)
          .map((f) => (f.end === null ? { ...f, end: Math.max(a.at, f.start) } : f)),
      };
    case "editFast":
      return { ...s, fasts: s.fasts.map((f) => (f.id === a.id ? { ...f, start: a.start, end: a.end } : f)) };
    case "deleteFast":
      return { ...s, fasts: s.fasts.filter((f) => f.id !== a.id) };
    case "logDay": {
      const prev = s.days[a.date] ?? {};
      return { ...s, days: { ...s.days, [a.date]: { ...prev, ...a.patch } } };
    }
    case "weigh": {
      const rest = s.weighIns.filter((w) => w.date !== a.date);
      const weighIns = [...rest, { date: a.date, kg: a.kg }].sort((x, y) => x.date.localeCompare(y.date));
      return { ...s, weighIns };
    }
    case "deleteWeigh":
      return { ...s, weighIns: s.weighIns.filter((w) => w.date !== a.date) };
    case "setStage": {
      const since = dateKey();
      return { ...s, ramp: { stage: a.stage, since, log: [...s.ramp.log, { stage: a.stage, since }] } };
    }
    case "restartStage":
      return { ...s, ramp: { ...s.ramp, since: dateKey() } };
    case "settings":
      return { ...s, settings: { ...s.settings, ...a.patch } };
  }
}

type Ctx = { state: State; dispatch: (a: Action) => void };
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    get<State>(STORAGE_KEY)
      .then((saved) => {
        if (saved?.version === 1) {
          const base = initialState();
          dispatch({ type: "load", state: { ...base, ...saved, settings: { ...base.settings, ...saved.settings } } });
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    set(STORAGE_KEY, state).catch(() => {});
  }, [state]);

  if (!ready) return <div className="boot" aria-busy="true" />;
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

/** Re-render on an interval so timers stay live. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    const vis = () => setNow(Date.now());
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [ms]);
  return now;
}
