import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { r2, sum } from "./calc.js";
import { fmt, showNum } from "./format.js";


export const Money = ({ v }) => {
  const n = r2(v);
  const [p, c] = Math.abs(n).toFixed(2).split(".");
  return (
    <span>
      {n < 0 ? "−" : ""}£{Number(p).toLocaleString("en-GB")}
      <small>.{c}</small>
    </span>
  );
};

export const Chip = ({ tone = "", children, ...rest }) => (
  <span className={`chip ${tone}`} {...rest}>
    {children}
  </span>
);

export const Meter = ({ value, color = "var(--safe)", label, tall }) => (
  <div className={`bar${tall ? " tall" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}>
    <span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
  </div>
);

export const Card = ({ title, aside, className = "", children }) => (
  <section className={`card ${className}`}>
    {(title || aside) && (
      <div className="card-h">
        {title && <h2>{title}</h2>}
        {aside}
      </div>
    )}
    {children}
  </section>
);

export const Field = ({ label, hint, children }) => (
  <div className="field">
    <span className="lab">{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </div>
);

export const Note = ({ tone = "info", children }) => (
  <div className={`note ${tone}`} role={tone === "bad" ? "alert" : undefined}>
    {tone === "info" ? <Info size={18} /> : <AlertTriangle size={18} />}
    <div>{children}</div>
  </div>
);

export function MoneyInput({ value, onChange, nullable = false, allowNegative = false, label, placeholder = "0.00" }) {
  const [txt, setTxt] = useState(showNum(value));
  const focus = useRef(false);
  useEffect(() => {
    if (!focus.current) setTxt(showNum(value));
  }, [value]);
  const re = allowNegative ? /^-?\d{0,9}(\.\d{0,2})?$/ : /^\d{0,9}(\.\d{0,2})?$/;
  return (
    <label className="money">
      <span className="pound" aria-hidden="true">£</span>
      <input
        inputMode="decimal"
        aria-label={label}
        placeholder={placeholder}
        value={txt}
        onFocus={() => (focus.current = true)}
        onBlur={() => {
          focus.current = false;
          setTxt(showNum(value));
        }}
        onChange={(e) => {
          const v = e.target.value.replace(/,/g, "");
          if (!re.test(v)) return;
          setTxt(v);
          if (v === "" || v === "-" || v === ".") {
            onChange(nullable ? null : 0);
            return;
          }
          const n = parseFloat(v);
          if (Number.isFinite(n)) onChange(r2(n));
        }}
      />
    </label>
  );
};

export function StackBar({ segments, label }) {
  const segs = segments.filter((s) => s.value > 0);
  const total = sum(segs, (s) => s.value);
  if (total <= 0) return <div className="strip empty">Nothing to show yet. Fill in figures to see this.</div>;
  return (
    <div className="strip" role="img" aria-label={`${label}: ${segs.map((s) => `${s.label} ${fmt(s.value)}`).join(", ")}`}>
      {segs.map((s) => (
        <span key={s.label} className="seg-b" style={{ flex: `${s.value} 1 0`, background: s.color }} title={`${s.label}: ${fmt(s.value)}`} />
      ))}
    </div>
  );
}

export const Swatches = ({ items }) => (
  <ul className="legend">
    {items
      .filter((i) => i.value !== 0 || i.always)
      .map((i) => (
        <li key={i.label}>
          <i style={{ background: i.color }} />
          <span>{i.label}</span>
          <b>{fmt(i.value)}</b>
        </li>
      ))}
  </ul>
);

export function CashStrip({ C }) {
  const segs = [
    { label: "Bills still to pay", value: C.fixedRemaining, color: "var(--c-bills)" },
    { label: "Savings still to move", value: C.savingsRemaining, color: "var(--c-save)" },
    { label: "Essential spending left", value: C.essentialRemaining, color: "var(--c-ess)" },
    { label: "Buffer", value: C.buffer, color: "var(--c-buf)" },
    { label: "Safe to spend", value: Math.max(C.safe, 0), color: "var(--c-safe)" },
  ];
  const total = sum(segs, (s) => s.value);
  const showMarker = total > 0 && C.cash < total - 0.005;
  const pos = total > 0 ? Math.max(0, Math.min(1, C.cash / total)) : 0;
  return (
    <div>
      <div className="stripwrap">
        {showMarker && (
          <div className={`marker${pos > 0.6 ? " flip" : ""}`} style={{ left: `${pos * 100}%` }}>
            <span>In your account {fmt(C.cash)}</span>
          </div>
        )}
        <StackBar segments={segs} label="Where your cash is allocated" />
      </div>
      <Swatches items={segs.map((s) => ({ ...s, always: s.label === "Safe to spend" }))} />
      <p className="small muted" style={{ marginTop: 8 }}>
        Cash in your account: <b>{fmt(C.cash)}</b>
        {C.expectedIncome > 0 && <> + {fmt(C.expectedIncome)} expected income you chose to count</>}. Reserved for commitments: <b>{fmt(C.reserved)}</b>.
      </p>
    </div>
  );
}

export function MonthRuler({ C }) {
  const { dim, day, state } = C.ed;
  const pos = (d) => ((Math.min(d, dim) - 0.5) / dim) * 100;
  return (
    <div className="ruler" aria-hidden="true">
      <div className="ruler-track">
        <span className="ruler-fill" style={{ width: `${state === "before" ? 0 : (day / dim) * 100}%` }} />
        {C.upcoming.filter((u) => u.due).map((u) => (
          <i key={u.id} className="due" style={{ left: `${pos(u.due)}%` }} title={`${u.name} due on the ${u.due}`} />
        ))}
      </div>
      <div className="ruler-lab">
        <span>1</span>
        <span>{state === "before" ? "Month hasn't started" : state === "after" ? "Month finished" : `Day ${day} of ${dim}`} · blue ticks are unpaid bills</span>
        <span>{dim}</span>
      </div>
    </div>
  );
}

