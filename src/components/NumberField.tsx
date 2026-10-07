import { useEffect, useState } from "react";

type Props = {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit?: string;
  step?: number;
  help?: string;
  /** 0..1+, draws a thin progress line under the input */
  meter?: number;
};

export function NumberField({ id, label, value, onChange, unit, step = 1, help, meter }: Props) {
  const [text, setText] = useState(value?.toString() ?? "");
  useEffect(() => setText(value?.toString() ?? ""), [value]);

  const commit = () => {
    const t = text.trim().replace(",", ".");
    if (t === "") return value !== undefined && onChange(undefined);
    const n = Number(t);
    if (Number.isFinite(n) && n >= 0 && n !== value) onChange(n);
    else setText(value?.toString() ?? "");
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          inputMode="decimal"
          type="text"
          autoComplete="off"
          value={text}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-describedby={help ? `${id}-help` : undefined}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {meter != null && (
        <span className={`meter ${meter >= 1 ? "full" : ""}`} aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.min(1, meter)})` }} />
        </span>
      )}
      {help && <span className="help" id={`${id}-help`}>{help}</span>}
    </div>
  );
}
