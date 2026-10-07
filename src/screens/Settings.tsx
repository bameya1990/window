import { useRef, useState } from "react";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react";
import { set } from "idb-keyval";
import { NumberField } from "../components/NumberField";
import { STAGES, initialState, type Settings as S, type State } from "../lib/plan";
import { STORAGE_KEY, useStore } from "../lib/store";
import { enableNudges } from "../lib/notify";
import { dateKey, fmtClock } from "../lib/time";

export function Settings() {
  const { state, dispatch } = useStore();
  const st = state.settings;
  const put = (patch: Partial<S>) => dispatch({ type: "settings", patch });
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `window-backup-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as State;
      if (data.version !== 1 || !data.settings || !Array.isArray(data.fasts)) throw new Error("bad");
      dispatch({ type: "load", state: { ...initialState(), ...data } });
      setMsg("Backup restored.");
    } catch {
      setMsg("That file isn't a Window backup.");
    }
  };

  return (
    <div className="screen">
      <header className="top"><h1>Settings</h1></header>

      <section className="group" aria-labelledby="g-plan">
        <h2 id="g-plan" className="section-h">Fasting stage</h2>
        <div className="seg" role="radiogroup" aria-label="Current stage">
          {STAGES.map((s, i) => (
            <button
              key={s.fast}
              role="radio"
              aria-checked={state.ramp.stage === i}
              className={`seg-btn mono ${state.ramp.stage === i ? "on" : ""}`}
              onClick={() => state.ramp.stage !== i && dispatch({ type: "setStage", stage: i })}
            >
              {s.fast}:{s.eat}
            </button>
          ))}
        </div>
        <p className="help">
          Window {fmtClock(STAGES[state.ramp.stage].open)} to {fmtClock(STAGES[state.ramp.stage].close)}. Changing stage restarts the 7-day review.
        </p>
      </section>

      <section className="group" aria-labelledby="g-goal">
        <h2 id="g-goal" className="section-h">Goal</h2>
        <div className="grid-2">
          <NumberField id="startKg" label="Start weight" unit="kg" value={st.startKg} onChange={(v) => v && put({ startKg: v })} />
          <NumberField id="goalKg" label="Goal weight" unit="kg" value={st.goalKg} onChange={(v) => v && put({ goalKg: v })} />
          <NumberField id="rate" label="Pace" unit="kg/wk" value={st.ratePerWeek} onChange={(v) => v && put({ ratePerWeek: Math.min(1.2, v) })} help="0.5 to 1% of body weight per week is the usual safe range." />
          <div className="field">
            <label htmlFor="startDate">Start date</label>
            <input id="startDate" type="date" value={st.startDate} onChange={(e) => e.target.value && put({ startDate: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="g-body">
        <h2 id="g-body" className="section-h">Body (for energy estimates)</h2>
        <div className="grid-2">
          <NumberField id="height" label="Height" unit="cm" value={st.heightCm} onChange={(v) => v && put({ heightCm: v })} help="5 ft 5 in is 165 cm." />
          <NumberField id="age" label="Age" unit="yrs" value={st.age} onChange={(v) => v && put({ age: Math.round(v) })} />
        </div>
      </section>

      <section className="group" aria-labelledby="g-targets">
        <h2 id="g-targets" className="section-h">Daily targets</h2>
        <div className="grid-2">
          <NumberField id="stepT" label="Steps" value={st.stepTarget} onChange={(v) => v && put({ stepTarget: Math.round(v) })} />
          <NumberField id="sleepT" label="Sleep" unit="h" value={st.sleepTarget} onChange={(v) => v && put({ sleepTarget: v })} />
          <NumberField id="strT" label="Strength sessions" unit="/wk" value={st.strengthPerWeek} onChange={(v) => v && put({ strengthPerWeek: Math.round(v) })} />
          <div className="field">
            <label htmlFor="weighDay">Weigh-in day</label>
            <select id="weighDay" value={st.weighDay} onChange={(e) => put({ weighDay: Number(e.target.value) })}>
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="group" aria-labelledby="g-rem">
        <h2 id="g-rem" className="section-h">Evening reminder</h2>
        <div className="grid-2">
          <div className="field">
            <span className="label" id="nudge-l">Log reminder</span>
            <button
              role="switch"
              aria-checked={st.nudge}
              aria-labelledby="nudge-l"
              className={`toggle ${st.nudge ? "on" : ""}`}
              onClick={async () => {
                if (!st.nudge) setMsg(await enableNudges());
                put({ nudge: !st.nudge });
              }}
            >
              <span>{st.nudge ? "On" : "Off"}</span>
            </button>
          </div>
          <div className="field">
            <label htmlFor="nudgeH">After</label>
            <select id="nudgeH" value={st.nudgeHour} onChange={(e) => put({ nudgeHour: Number(e.target.value) })}>
              {[18, 19, 20, 21, 22].map((h) => <option key={h} value={h}>{fmtClock(`${h}:00`)}</option>)}
            </select>
          </div>
        </div>
        <p className="help">
          Shows in the app after this time if today's log is empty. With the app installed, Android may also send a
          notification; Chrome decides exactly when, so it can arrive a little late.
        </p>
      </section>

      <section className="group" aria-labelledby="g-theme">
        <h2 id="g-theme" className="section-h">Appearance</h2>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {(["system", "light", "dark"] as const).map((t) => (
            <button key={t} role="radio" aria-checked={st.theme === t} className={`seg-btn ${st.theme === t ? "on" : ""}`} onClick={() => put({ theme: t })}>
              {t === "system" ? "Auto" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="group" aria-labelledby="g-data">
        <h2 id="g-data" className="section-h">Your data</h2>
        <p className="help">Everything stays on this device. Export a backup now and then, especially before changing phones.</p>
        <div className="row-start">
          <button className="btn btn-quiet" onClick={exportData}><DownloadSimple size={18} /> Export backup</button>
          <button className="btn btn-quiet" onClick={() => file.current?.click()}><UploadSimple size={18} /> Restore</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </div>
        <button
          className="btn btn-danger"
          onClick={async () => {
            if (!confirm("Erase all fasts, logs and weigh-ins on this device?")) return;
            const fresh = initialState();
            await set(STORAGE_KEY, fresh);
            dispatch({ type: "load", state: fresh });
            setMsg("Reset to a fresh start.");
          }}
        >
          Erase everything
        </button>
        {msg && <p className="status" role="status">{msg}</p>}
      </section>
    </div>
  );
}
