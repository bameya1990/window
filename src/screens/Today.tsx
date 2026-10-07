import { useState } from "react";
import { Barbell, CaretLeft, CaretRight, Fire, Footprints, Moon, Scales } from "@phosphor-icons/react";
import { Dial } from "../components/Dial";
import { NumberField } from "../components/NumberField";
import { STAGES, activeFast, fastHit, needsWeighIn, phase, reviewRamp, type State } from "../lib/plan";
import { useNow, useStore } from "../lib/store";
import {
  HOUR, addDays, atClock, dateKey, fmtClock, fmtDay, fmtDuration, fmtElapsed, fromLocalInput, toLocalInput,
} from "../lib/time";

export function Today() {
  const { state } = useStore();
  const now = useNow(1000);
  const today = dateKey(now);

  return (
    <div className="screen">
      <header className="top">
        <div>
          <h1 className="h-date">{fmtDay(today, { weekday: "long", month: "long" })}</h1>
        </div>
        <span className="chip mono" aria-label="Current stage">
          {STAGES[state.ramp.stage].fast}:{STAGES[state.ramp.stage].eat}
        </span>
      </header>

      <FastPanel now={now} />
      <Notices now={now} />
      <DayLogPanel today={today} />
    </div>
  );
}

function FastPanel({ now }: { now: number }) {
  const { state, dispatch } = useStore();
  const stage = STAGES[state.ramp.stage];
  const active = activeFast(state);
  const [editing, setEditing] = useState(false);
  const [when, setWhen] = useState("");
  const d = new Date(now);
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const today = dateKey(now);

  const lastEnded = [...state.fasts].filter((f) => f.end !== null).sort((a, b) => b.end! - a.end!)[0];

  let ring = 0;
  let center: React.ReactNode;
  let status: React.ReactNode;
  let label: string;

  if (active) {
    const elapsed = now - active.start;
    const target = active.targetH * HOUR;
    ring = elapsed / target;
    const ph = phase(elapsed / HOUR);
    const done = elapsed >= target;
    // next opening of the eating window at or after the target
    let openAt = atClock(today, stage.open);
    if (openAt < now) openAt = atClock(addDays(today, 1), stage.open);
    center = (
      <>
        <span className="dial-label">{done ? "Target reached" : ph.label}</span>
        <span className="dial-big mono">{fmtElapsed(elapsed)}</span>
        <span className="dial-sub">of {active.targetH}h fast</span>
      </>
    );
    status = done ? (
      <p className="status">
        <strong>{fmtDuration(elapsed - target)}</strong> past your target. Break the fast when you're ready.
      </p>
    ) : (
      <p className="status">
        Target at <strong className="mono">{fmtClock(active.start + target)}</strong>, in {fmtDuration(target - elapsed)}.
        {" "}Window opens {dateKey(openAt) === today ? "" : "tomorrow "}at {fmtClock(openAt)}.
      </p>
    );
    label = `Fasting for ${fmtDuration(elapsed)} of a ${active.targetH} hour target`;
  } else {
    const openT = atClock(today, stage.open);
    const closeT = atClock(today, stage.close);
    const inWindow = now >= openT && now < closeT;
    ring = inWindow ? (now - openT) / (closeT - openT) : 0;
    center = inWindow ? (
      <>
        <span className="dial-label">Eating window</span>
        <span className="dial-big mono">{fmtElapsed(closeT - now)}</span>
        <span className="dial-sub">left, closes {fmtClock(closeT)}</span>
      </>
    ) : (
      <>
        <span className="dial-label">Not fasting</span>
        <span className="dial-big mono">{lastEnded ? fmtElapsed(now - lastEnded.end!) : "0:00"}</span>
        <span className="dial-sub">since last fast</span>
      </>
    );
    status = inWindow ? (
      <p className="status">Eat to fullness, protein first. Start the fast after your last bite.</p>
    ) : now < openT ? (
      <p className="status">Window opens at {fmtClock(openT)}. Start a fast to begin timing.</p>
    ) : (
      <p className="status">Window closed at {fmtClock(closeT)}. Start your fast from your last bite.</p>
    );
    label = inWindow ? `Eating window, ${fmtDuration(closeT - now)} left` : "Not fasting";
  }

  const commit = () => {
    const at = when ? fromLocalInput(when) : Date.now();
    dispatch(active ? { type: "endFast", at } : { type: "startFast", at: Math.min(at, Date.now()) });
    setEditing(false);
    setWhen("");
  };

  const startMin = active ? (() => { const s = new Date(active.start); return s.getHours() * 60 + s.getMinutes(); })() : undefined;

  return (
    <section className="fast-panel">
      <Dial
        open={stage.open}
        close={stage.close}
        progress={ring}
        fasting={!!active}
        nowMin={nowMin}
        startMin={startMin}
        label={label}
      >
        {center}
      </Dial>
      <div className="legend-row" aria-hidden="true">
        <span><i className="key key-window" /> Window {fmtClock(stage.open)} to {fmtClock(stage.close)}</span>
        <span><i className="key key-now" /> Now</span>
      </div>
      {status}

      <div className="fast-actions">
        <button className="btn btn-primary" onClick={commit}>
          {active ? "Break fast" : "Start fast"}
        </button>
        <button
          className="btn btn-quiet"
          onClick={() => {
            setEditing((e) => !e);
            setWhen(toLocalInput(Date.now()));
          }}
          aria-expanded={editing}
        >
          {editing ? "Use now" : "Different time"}
        </button>
      </div>
      {editing && (
        <div className="field inline-time">
          <label htmlFor="when">{active ? "Last fast ended at" : "Last bite was at"}</label>
          <input id="when" type="datetime-local" value={when} max={toLocalInput(Date.now())} onChange={(e) => setWhen(e.target.value)} />
        </div>
      )}
      {lastEnded && !active && (
        <p className="fine">
          Last fast: <span className="mono">{fmtDuration(lastEnded.end! - lastEnded.start)}</span>
          {fastHit(lastEnded) ? `, hit the ${lastEnded.targetH}h target.` : `, short of ${lastEnded.targetH}h.`}
        </p>
      )}
    </section>
  );
}

function Notices({ now }: { now: number }) {
  const { state, dispatch } = useStore();
  const today = dateKey(now);
  const review = reviewRamp(state, today);
  const cur = STAGES[state.ramp.stage];
  const [kg, setKg] = useState<number | undefined>();
  const log = state.days[today];
  const hour = new Date(now).getHours();

  return (
    <>
      {needsWeighIn(state, today) && (
        <section className="notice">
          <div className="notice-head">
            <Scales size={20} weight="bold" />
            <h2>Monday weigh-in</h2>
          </div>
          <p>Before food or water, after the bathroom. Same scale, same spot.</p>
          <div className="row-end">
            <NumberField id="weigh" label="Weight" unit="kg" step={0.1} value={kg} onChange={setKg} />
            <button className="btn btn-primary" disabled={!kg} onClick={() => kg && dispatch({ type: "weigh", date: today, kg })}>
              Save
            </button>
          </div>
        </section>
      )}

      {review.kind === "advance" && (
        <section className="notice notice-accent">
          <h2>Ready for {review.next.fast}:{review.next.eat}</h2>
          <p>
            You hit {cur.fast}h on {review.hits} of 7 days. Next stage: eat {fmtClock(review.next.open)} to {fmtClock(review.next.close)}.
          </p>
          <div className="row-end">
            <button className="btn btn-quiet" onClick={() => dispatch({ type: "restartStage" })}>Another week</button>
            <button className="btn btn-primary" onClick={() => dispatch({ type: "setStage", stage: state.ramp.stage + 1 })}>
              Step up
            </button>
          </div>
        </section>
      )}
      {review.kind === "hold" && (
        <section className="notice">
          <h2>Hold at {cur.fast}:{cur.eat} one more week</h2>
          <p>
            {review.hits} of 7 days hit target; stepping up needs 5. That's normal. Most people need a repeat week at some stage.
          </p>
          <div className="row-end">
            <button className="btn btn-primary" onClick={() => dispatch({ type: "restartStage" })}>Start new week</button>
          </div>
        </section>
      )}

      {state.settings.nudge && hour >= state.settings.nudgeHour && !hasAny(log) && (
        <p className="nudge">Evening check-in: log today's burn, steps and sleep below.</p>
      )}
    </>
  );
}

const hasAny = (d?: State["days"][string]) => !!d && (d.burn != null || d.steps != null || d.sleep != null || d.strength);

function DayLogPanel({ today }: { today: string }) {
  const { state, dispatch } = useStore();
  const [day, setDay] = useState(today);
  const log = state.days[day] ?? {};
  const st = state.settings;
  const patch = (p: Partial<State["days"][string]>) => dispatch({ type: "logDay", date: day, patch: p });

  return (
    <section className="daylog" aria-labelledby="daylog-h">
      <div className="daylog-head">
        <h2 id="daylog-h">{day === today ? "Today's log" : fmtDay(day)}</h2>
        <div className="stepper">
          <button className="icon-btn" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))}>
            <CaretLeft size={18} weight="bold" />
          </button>
          <button className="icon-btn" aria-label="Next day" disabled={day >= today} onClick={() => setDay(addDays(day, 1))}>
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className="log-grid" key={day}>
        <div className="log-item">
          <Fire size={20} weight="duotone" className="log-icon" />
          <NumberField
            id="burn" label="Active calories burned" unit="kcal" step={10}
            value={log.burn} onChange={(v) => patch({ burn: v })}
            help="From your watch or fitness app (active, not total)."
          />
        </div>
        <div className="log-item">
          <Footprints size={20} weight="duotone" className="log-icon" />
          <NumberField
            id="steps" label="Steps" step={100} value={log.steps} onChange={(v) => patch({ steps: v })}
            meter={log.steps != null ? log.steps / st.stepTarget : undefined}
            help={`Target ${st.stepTarget.toLocaleString()}`}
          />
        </div>
        <div className="log-item">
          <Moon size={20} weight="duotone" className="log-icon" />
          <NumberField
            id="sleep" label="Sleep last night" unit="h" step={0.25} value={log.sleep} onChange={(v) => patch({ sleep: v })}
            meter={log.sleep != null ? log.sleep / st.sleepTarget : undefined}
            help={`Target ${st.sleepTarget}h`}
          />
        </div>
        <div className="log-item">
          <Barbell size={20} weight="duotone" className="log-icon" />
          <div className="field">
            <span className="label" id="str-l">Strength session</span>
            <button
              role="switch"
              aria-checked={!!log.strength}
              aria-labelledby="str-l"
              className={`toggle ${log.strength ? "on" : ""}`}
              onClick={() => patch({ strength: !log.strength })}
            >
              <span>{log.strength ? "Done" : "Not yet"}</span>
            </button>
            <span className="help">{st.strengthPerWeek} per week protects muscle while you lose fat.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
