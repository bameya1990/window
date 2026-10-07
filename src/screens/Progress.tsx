import { useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { WeightChart } from "../components/WeightChart";
import { NumberField } from "../components/NumberField";
import {
  KCAL_PER_KG, actualRate, avgBurn, bmr, fastHit, goalDate, hitDays, latestWeight, weekStart, weekSummary, type Fast,
} from "../lib/plan";
import { useStore } from "../lib/store";
import { addDays, dateKey, fmtClock, fmtDay, fmtDuration, fromKey, fromLocalInput, toLocalInput } from "../lib/time";

export function Progress() {
  const { state } = useStore();
  const st = state.settings;
  const today = dateKey();
  const kg = latestWeight(state);
  const lost = st.startKg - kg;
  const total = st.startKg - st.goalKg;
  const rate = actualRate(state, today);
  const burn = avgBurn(state, today);
  const maint = bmr(st, kg) * 1.2 + (burn ?? 0);
  const deficit = rate != null ? (rate * KCAL_PER_KG) / 7 : null;
  const lastW = state.weighIns[state.weighIns.length - 1];
  const proj = rate != null && rate > 0.05 ? goalDate(st, kg, lastW?.date ?? today, rate) : null;
  const planned = goalDate(st);

  return (
    <div className="screen">
      <header className="top">
        <h1>Progress</h1>
      </header>

      <section className="hero-stat">
        <div>
          <span className="big mono">{kg.toFixed(1)}</span>
          <span className="big-unit">kg</span>
        </div>
        <p>
          <strong className="mono">{lost >= 0 ? "-" : "+"}{Math.abs(lost).toFixed(1)} kg</strong> since {fmtDay(st.startDate, { weekday: undefined })}.{" "}
          {Math.max(0, kg - st.goalKg).toFixed(1)} kg to {st.goalKg}.
        </p>
        <span className="track" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.min(1, Math.max(0, lost / total))})` }} />
        </span>
      </section>

      <WeightChart state={state} />

      <section className="stats" aria-label="Estimates">
        <Stat
          label="Actual pace"
          value={rate != null ? `${rate.toFixed(2)} kg/wk` : "Not yet"}
          note={rate != null ? `Plan is ${st.ratePerWeek} kg/wk.` : "Needs two weigh-ins at least a week apart."}
        />
        <Stat
          label="Implied deficit"
          value={deficit != null ? `${Math.round(deficit)} kcal/day` : "Not yet"}
          note="What your weight change says you're actually averaging."
        />
        <Stat
          label="Est. maintenance"
          value={`${Math.round(maint / 10) * 10} kcal`}
          note={`BMR x1.2${burn != null ? " + your 7-day avg burn" : ". Log burn to refine"}.`}
        />
        <Stat
          label="Goal date"
          value={proj ? fmtDay(proj, { weekday: undefined, year: "numeric" }) : planned ? fmtDay(planned, { weekday: undefined, year: "numeric" }) : "n/a"}
          note={proj ? "At your actual pace." : "On plan pace. Updates after weigh-ins."}
        />
        {deficit != null && (
          <p className="fine stats-foot">
            Roughly, you're eating around <strong className="mono">{Math.round((maint - deficit) / 50) * 50} kcal</strong> a day. Treat this as a ballpark; water weight swings a few hundred grams week to week.
          </p>
        )}
      </section>

      <ThisWeek />
      <Heatmap />
      <WeighIns />
      <FastHistory />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value mono">{value}</span>
      <span className="help">{note}</span>
    </div>
  );
}

function ThisWeek() {
  const { state } = useStore();
  const st = state.settings;
  const w = weekSummary(state, dateKey());
  const rows: [string, string, string][] = [
    ["Fasts on target", `${w.hit}`, "of 7"],
    ["Strength", `${w.strength}`, `of ${st.strengthPerWeek}`],
    ["Avg steps", w.steps != null ? Math.round(w.steps).toLocaleString() : "n/a", `target ${(st.stepTarget / 1000).toFixed(0)}k`],
    ["Avg sleep", w.sleep != null ? `${w.sleep.toFixed(1)}h` : "n/a", `target ${st.sleepTarget}h`],
    ["Active burn", w.burn ? w.burn.toLocaleString() : "0", "kcal"],
  ];
  return (
    <section aria-labelledby="wk-h">
      <h2 id="wk-h" className="section-h">Week of {fmtDay(w.start, { weekday: undefined })}</h2>
      <div className="week-grid">
        {rows.map(([k, v, s]) => (
          <div key={k} className="wk">
            <span className="wk-k">{k}</span>
            <span className="wk-v mono">{v}</span>
            <span className="wk-s">{s}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Heatmap() {
  const { state } = useStore();
  const today = dateKey();
  const hits = hitDays(state);
  const start = addDays(weekStart(today), -28);
  const cells = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  const strength = (k: string) => !!state.days[k]?.strength;
  return (
    <section aria-labelledby="hm-h">
      <h2 id="hm-h" className="section-h">Last five weeks</h2>
      <div className="heatmap" role="grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="hm-head" aria-hidden="true">{d}</span>
        ))}
        {cells.map((k) => (
          <span
            key={k}
            role="gridcell"
            className={`hm ${hits.has(k) ? "hit" : ""} ${k > today ? "future" : ""} ${k === today ? "today" : ""}`}
            title={`${fmtDay(k)}${hits.has(k) ? ": fast on target" : ""}${strength(k) ? ", strength" : ""}`}
            aria-label={`${fmtDay(k)}${hits.has(k) ? ", fast on target" : ""}${strength(k) ? ", strength session" : ""}`}
          >
            {fromKey(k).getDate()}
            {strength(k) && <i className="hm-lift" />}
          </span>
        ))}
      </div>
      <div className="chart-legend">
        <span><i className="key key-hit" /> Fast on target</span>
        <span><i className="key key-lift" /> Strength</span>
      </div>
    </section>
  );
}

function WeighIns() {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(dateKey());
  const [kg, setKg] = useState<number | undefined>();
  const list = [...state.weighIns].reverse();
  return (
    <section aria-labelledby="wi-h">
      <div className="section-row">
        <h2 id="wi-h" className="section-h">Weigh-ins</h2>
        <button className="btn btn-quiet btn-sm" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
          <Plus size={16} weight="bold" /> Add
        </button>
      </div>
      {adding && (
        <div className="add-row">
          <div className="field">
            <label htmlFor="wi-date">Date</label>
            <input id="wi-date" type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <NumberField id="wi-kg" label="Weight" unit="kg" step={0.1} value={kg} onChange={setKg} />
          <button
            className="btn btn-primary"
            disabled={!kg || !date}
            onClick={() => { if (kg) { dispatch({ type: "weigh", date, kg }); setAdding(false); setKg(undefined); } }}
          >
            Save
          </button>
        </div>
      )}
      <ul className="rows">
        {list.map((w, i) => {
          const prev = list[i + 1];
          const diff = prev ? w.kg - prev.kg : null;
          return (
            <li key={w.date}>
              <span>{fmtDay(w.date)}</span>
              <span className="mono">{w.kg.toFixed(1)} kg</span>
              <span className="mono muted">{diff != null ? `${diff > 0 ? "+" : diff < 0 ? "-" : ""}${Math.abs(diff).toFixed(1)}` : "start"}</span>
              <button className="icon-btn" aria-label={`Delete weigh-in ${fmtDay(w.date)}`} onClick={() => dispatch({ type: "deleteWeigh", date: w.date })}>
                <Trash size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FastHistory() {
  const { state } = useStore();
  const list = [...state.fasts].sort((a, b) => b.start - a.start).slice(0, 21);
  return (
    <section aria-labelledby="fh-h">
      <h2 id="fh-h" className="section-h">Recent fasts</h2>
      {list.length === 0 ? (
        <p className="empty">No fasts logged yet. Tap Start fast on Today after your last meal; it'll show up here.</p>
      ) : (
        <ul className="rows">
          {list.map((f) => <FastRow key={f.id} f={f} />)}
        </ul>
      )}
    </section>
  );
}

function FastRow({ f }: { f: Fast }) {
  const { dispatch } = useStore();
  const [edit, setEdit] = useState(false);
  const [s, setS] = useState(toLocalInput(f.start));
  const [e, setE] = useState(f.end ? toLocalInput(f.end) : "");
  if (edit) {
    return (
      <li className="row-edit">
        <div className="field"><label htmlFor={`s-${f.id}`}>Started</label>
          <input id={`s-${f.id}`} type="datetime-local" value={s} onChange={(x) => setS(x.target.value)} /></div>
        <div className="field"><label htmlFor={`e-${f.id}`}>Ended</label>
          <input id={`e-${f.id}`} type="datetime-local" value={e} onChange={(x) => setE(x.target.value)} /></div>
        <div className="row-end">
          <button className="btn btn-quiet btn-sm" onClick={() => dispatch({ type: "deleteFast", id: f.id })}>Delete</button>
          <button className="btn btn-quiet btn-sm" onClick={() => setEdit(false)}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              const start = fromLocalInput(s);
              const end = e ? fromLocalInput(e) : null;
              if (Number.isNaN(start) || (end != null && (Number.isNaN(end) || end < start))) return;
              dispatch({ type: "editFast", id: f.id, start, end });
              setEdit(false);
            }}
          >Save</button>
        </div>
      </li>
    );
  }
  return (
    <li>
      <span>{fmtDay(dateKey(f.start))} {fmtClock(f.start)}</span>
      <span className="mono">{f.end ? fmtDuration(f.end - f.start) : "running"}</span>
      <span className={`mono ${f.end && fastHit(f) ? "ok" : "muted"}`}>{f.end ? (fastHit(f) ? `${f.targetH}h hit` : `${f.targetH}h`) : ""}</span>
      <button className="icon-btn" aria-label="Edit fast" onClick={() => setEdit(true)}><PencilSimple size={16} /></button>
    </li>
  );
}
