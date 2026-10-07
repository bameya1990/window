import { Check } from "@phosphor-icons/react";
import { ADVANCE_HITS, REVIEW_DAYS, STAGES, hitDays, reviewRamp } from "../lib/plan";
import { useStore } from "../lib/store";
import { addDays, dateKey, fmtClock, fmtDay, fromKey } from "../lib/time";

export function Plan() {
  const { state } = useStore();
  const today = dateKey();
  const { stage, since } = state.ramp;
  const review = reviewRamp(state, today);
  const hits = hitDays(state);

  return (
    <div className="screen">
      <header className="top">
        <h1>The ramp</h1>
      </header>
      <p className="lede">
        One hour longer each week, from 16:8 to 20:4. You step up after hitting the target on {ADVANCE_HITS} of {REVIEW_DAYS} days;
        otherwise you repeat the week. No penalty, no streak to break.
      </p>

      <ol className="ladder">
        {STAGES.map((s, i) => {
          const state_ = i < stage ? "done" : i === stage ? "current" : "next";
          const firstReview = addDays(since, REVIEW_DAYS) > today ? addDays(since, REVIEW_DAYS) : today;
          const eta = i > stage ? addDays(firstReview, REVIEW_DAYS * (i - stage - 1)) : null;
          return (
            <li key={s.fast} className={`rung rung-${state_}`} aria-current={i === stage ? "step" : undefined}>
              <span className="rung-ratio mono">
                {s.fast}:{s.eat}
              </span>
              <div className="rung-body">
                <span className="rung-window">
                  Eat {fmtClock(s.open)} to {fmtClock(s.close)}
                </span>
                <span className="rung-meta">
                  {state_ === "done" && "Completed"}
                  {state_ === "current" && (review.kind === "pending" ? `Day ${review.day} of ${REVIEW_DAYS}` : "Review ready on Today")}
                  {eta && `Earliest ${fmtDay(eta)}`}
                </span>
                {state_ === "current" && (
                  <div className="week-cells" aria-label={`${review.hits} target days so far this stage`}>
                    {Array.from({ length: REVIEW_DAYS }, (_, d) => {
                      const k = addDays(since, d);
                      const hit = hits.has(k);
                      const future = k > today;
                      return (
                        <span key={k} className={`cell ${hit ? "hit" : ""} ${future ? "future" : ""} ${k === today ? "today" : ""}`}>
                          <span className="cell-day">{fromKey(k).toLocaleDateString([], { weekday: "narrow" })}</span>
                          <span className="cell-mark">{hit && <Check size={12} weight="bold" />}</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {state_ === "done" && <Check size={18} weight="bold" className="rung-check" />}
            </li>
          );
        })}
      </ol>

      <section className="notes" aria-labelledby="notes-h">
        <h2 id="notes-h">What the research says</h2>
        <dl>
          <dt>A shorter window works by helping you eat less</dt>
          <dd>
            In an 8-week trial, 4-hour and 6-hour windows both cut about 550 kcal a day and produced the same ~3% weight
            loss. 20:4 is a tool for eating less, not a separate fat-burning switch. Your Monday weigh-in is the real test.
          </dd>
          <dt>Protein first, every window</dt>
          <dd>
            Aim for about 1.6 g per kg of goal weight, roughly 115 g a day. In a 4-hour window that means two protein-heavy
            meals, not one big one.
          </dd>
          <dt>Lift to keep the muscle</dt>
          <dd>
            One 16:8 trial without resistance training saw a noticeable share of the weight lost come from lean mass. Strength
            sessions and protein are what make the loss fat.
          </dd>
          <dt>Sleep is part of the plan</dt>
          <dd>
            On the same calorie deficit, people sleeping 5.5 hours lost far less fat than at 8.5 hours, and were hungrier.
          </dd>
          <dt>Fasting basics</dt>
          <dd>
            Water, black coffee and plain tea are fine. On 18h+ fasts a pinch of salt in water helps with headaches and
            light-headedness.
          </dd>
          <dt>When to step back a stage</dt>
          <dd>
            Dizziness, fainting, sleep falling apart, or food dominating your thoughts. Use Settings to drop a stage; the plan
            is meant to bend.
          </dd>
        </dl>
        <ul className="sources">
          <li><a href="https://doi.org/10.1016/j.cmet.2020.06.018" target="_blank" rel="noreferrer">Cienfuegos et al., Cell Metabolism 2020</a></li>
          <li><a href="https://doi.org/10.1001/jamainternmed.2020.4153" target="_blank" rel="noreferrer">Lowe et al. (TREAT), JAMA Intern Med 2020</a></li>
          <li><a href="https://doi.org/10.1136/bjsports-2017-097608" target="_blank" rel="noreferrer">Morton et al., Br J Sports Med 2018</a></li>
          <li><a href="https://doi.org/10.7326/0003-4819-153-7-201010050-00006" target="_blank" rel="noreferrer">Nedeltcheva et al., Ann Intern Med 2010</a></li>
          <li><a href="https://doi.org/10.1126/scitranslmed.adv6787" target="_blank" rel="noreferrer">ChronoFast, Sci Transl Med 2025</a></li>
        </ul>
        <p className="fine">General guidance, not medical advice. Check with your doctor before extended fasting if anything changes in your health or medication.</p>
      </section>
    </div>
  );
}
