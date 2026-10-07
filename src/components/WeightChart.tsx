import { useEffect, useRef, useState } from "react";
import { goalDate, targetWeightOn, type State } from "../lib/plan";
import { daysBetween, dateKey, fmtDay, fromKey } from "../lib/time";

const H = 220;
const PAD = { l: 34, r: 14, t: 14, b: 26 };

export function WeightChart({ state }: { state: State }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(340);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const st = state.settings;
  const pts = state.weighIns;
  const end = goalDate(st) ?? dateKey();
  const lastData = pts.length ? pts[pts.length - 1].date : st.startDate;
  const spanDays = Math.max(daysBetween(st.startDate, end), daysBetween(st.startDate, lastData), 14);

  const yMax = Math.ceil(Math.max(st.startKg, ...pts.map((p) => p.kg)) + 1);
  const yMin = Math.floor(Math.min(st.goalKg, ...pts.map((p) => p.kg)) - 1);
  const iw = w - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;
  const x = (key: string) => PAD.l + (daysBetween(st.startDate, key) / spanDays) * iw;
  const y = (kg: number) => PAD.t + ((yMax - kg) / (yMax - yMin)) * ih;

  const yTicks: number[] = [];
  const step = yMax - yMin > 12 ? 4 : 2;
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yTicks.push(v);

  // month ticks
  const xTicks: { key: string; label: string }[] = [];
  const s = fromKey(st.startDate);
  const cur = new Date(s.getFullYear(), s.getMonth() + 1, 1);
  while (daysBetween(st.startDate, dateKey(cur)) <= spanDays) {
    xTicks.push({ key: dateKey(cur), label: cur.toLocaleDateString([], { month: "short" }) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(" ");
  const h = hover != null ? pts[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pts.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < bd) { bd = d; best = i; }
    });
    setHover(best);
  };

  return (
    <figure className="chart" ref={wrap}>
      <figcaption className="chart-title">Weight, kg</figcaption>
      <svg
        width={w}
        height={H}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Weight from ${st.startKg} kg toward ${st.goalKg} kg. ${pts.length} weigh-ins.`}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={PAD.l - 8} y={y(v)} className="axis" textAnchor="end" dominantBaseline="central">{v}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.key} x={x(t.key)} y={H - 8} className="axis" textAnchor="middle">{t.label}</text>
        ))}

        {/* goal */}
        <line x1={PAD.l} x2={w - PAD.r} y1={y(st.goalKg)} y2={y(st.goalKg)} className="goal-line" />
        <text x={w - PAD.r} y={y(st.goalKg) - 6} className="axis axis-strong" textAnchor="end">Goal {st.goalKg}</text>

        {/* plan */}
        <line
          x1={x(st.startDate)} y1={y(st.startKg)}
          x2={x(end)} y2={y(targetWeightOn(st, end))}
          className="plan-line"
        />

        {/* actual */}
        {pts.length > 1 && <path d={line} className="data-line" />}
        {pts.map((p, i) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={i === hover ? 6 : 4} className="data-dot" />
        ))}

        {h && (
          <line x1={x(h.date)} x2={x(h.date)} y1={PAD.t} y2={PAD.t + ih} className="crosshair" />
        )}
      </svg>
      {h && (
        <div
          className="tooltip"
          style={{ left: Math.min(Math.max(x(h.date), 70), w - 70), top: Math.max(y(h.kg) - 12, 0) }}
          role="status"
        >
          <span className="tt-date">{fmtDay(h.date)}</span>
          <span className="mono tt-val">{h.kg.toFixed(1)} kg</span>
          <span className="tt-sub">plan {targetWeightOn(st, h.date).toFixed(1)}</span>
        </div>
      )}
      <div className="chart-legend" aria-hidden="true">
        <span><i className="key key-line" /> Weigh-ins</span>
        <span><i className="key key-dash" /> Plan, {st.ratePerWeek} kg/week</span>
      </div>
    </figure>
  );
}
