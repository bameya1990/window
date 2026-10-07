import { hhmmToMin } from "../lib/time";

const C = 160;

function pt(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
}

/** Clockwise arc from a1 to a2 (degrees, 0 = top). */
function arc(r: number, a1: number, a2: number): string {
  let sweep = (((a2 - a1) % 360) + 360) % 360;
  if (sweep === 0 && a2 !== a1) sweep = 360;
  if (sweep >= 359.99) {
    const [x1, y1] = pt(r, a1);
    const [x2, y2] = pt(r, a1 + 180);
    return `M${x1} ${y1} A${r} ${r} 0 1 1 ${x2} ${y2} A${r} ${r} 0 1 1 ${x1} ${y1}`;
  }
  const [x1, y1] = pt(r, a1);
  const [x2, y2] = pt(r, a1 + sweep);
  return `M${x1} ${y1} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

const minToDeg = (m: number) => (m / 1440) * 360;

type Props = {
  /** Eating window, "HH:MM" */
  open: string;
  close: string;
  /** 0..1+, progress of the main ring */
  progress: number;
  /** true when the main ring tracks a fast (accent), false for eating time (muted) */
  fasting: boolean;
  nowMin: number;
  /** minute-of-day the current fast started, to mark on the face */
  startMin?: number;
  children: React.ReactNode;
  label: string;
};

export function Dial({ open, close, progress, fasting, nowMin, startMin, children, label }: Props) {
  const o = minToDeg(hhmmToMin(open));
  const c = minToDeg(hhmmToMin(close));
  const p = Math.min(1, Math.max(0, progress));
  const [nx, ny] = pt(134, minToDeg(nowMin));

  return (
    <div className="dial" role="img" aria-label={label}>
      <svg viewBox="0 0 320 320">
        {/* hour ticks */}
        {Array.from({ length: 96 }, (_, i) => {
          const major = i % 24 === 0;
          const hour = i % 4 === 0;
          const deg = (i / 96) * 360;
          const [x1, y1] = pt(major ? 141 : hour ? 145 : 148, deg);
          const [x2, y2] = pt(152, deg);
          return (
            <line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              className={major ? "tick tick-major" : hour ? "tick tick-hour" : "tick"}
            />
          );
        })}
        {["00", "06", "12", "18"].map((t, i) => {
          const [x, y] = pt(124, i * 90);
          return (
            <text key={t} x={x} y={y} className="dial-num" textAnchor="middle" dominantBaseline="central">
              {t}
            </text>
          );
        })}

        {/* eating window band */}
        <path d={arc(134, 0, 360)} className="band-track" />
        <path d={arc(134, o, c)} className="band-window" />

        {/* fast start marker */}
        {startMin != null && (() => {
          const [a, b] = pt(127, minToDeg(startMin));
          const [d, e] = pt(141, minToDeg(startMin));
          return <line x1={a} y1={b} x2={d} y2={e} className="start-mark" />;
        })()}

        {/* main progress ring */}
        <path d={arc(104, 0, 360)} className="ring-track" />
        {p > 0.002 && (
          <path
            d={arc(104, 0, p * 360)}
            className={fasting ? "ring-fill" : "ring-fill ring-muted"}
            pathLength={1}
          />
        )}

        {/* now */}
        <circle cx={nx} cy={ny} r={7} className="now-dot" />
      </svg>
      <div className="dial-center">{children}</div>
    </div>
  );
}
