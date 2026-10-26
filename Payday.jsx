import { Check } from "lucide-react";
import { r2, shortDate } from "./calc.js";
import { fmt } from "./format.js";
import { Chip, Card, StackBar } from "./ui.jsx";

/* ================= Payday ================= */
export function Payday({ data, C, update, markPaid }) {
  const p = C.payday;
  const salary = data.income.find((l) => l.kind === "salary") || data.income[0];
  const salS = salary ? C.stats[salary.id] : null;
  const checks = data.paydayChecks || {};
  const setCheck = (k, v) => update((d) => { d.paydayChecks = { ...(d.paydayChecks || {}), [k]: v }; });
  const names = (arr, f) => arr.filter(f).map((x) => `${x.line.name} ${fmt(x.B)}`).join(" · ");
  const rows = [
    { k: "bills", color: "var(--bills)", t: "Reserve for bills", amt: p.bills, sub: names(C.fixedL, (x) => x.B > 0) || "No fixed payments with an amount yet." },
    { k: "savings", color: "var(--c-save)", t: "Move to savings", amt: p.savings, sub: names(C.savL, (x) => x.B > 0) || "No savings planned yet. See Scenarios." },
    { k: "weekly", color: "#C0504D", t: "Weekly spending pot", amt: p.monthSpend, sub: p.monthSpend > 0 ? `About ${fmt(p.perWeek)} a week (${fmt(p.essentialPerWeek)} essentials + ${fmt(p.funPerWeek)} fun & flexible), over ${(C.ed.dim / 7).toFixed(1)} weeks.` : "Set your spending budgets in Plan → Variable spending." },
    { k: "buffer", color: "var(--c-buf)", t: "Buffer", amt: p.buffer, sub: p.buffer > 0 ? "Left untouched for surprises. If unspent it stays in your account." : "No buffer set (Plan → Settings)." },
  ];
  const segs = [...rows.map((r) => ({ label: r.t, value: r.amt, color: r.color })), { label: "Unallocated", value: Math.max(p.unallocated, 0), color: "var(--safe)" }];
  const wk = C.weeks;
  return (
    <>
      <Card title="When your salary arrives" aside={salS && salS.remaining > 0 ? <button className="btn primary small" onClick={() => markPaid("income", salary.id)}><Check size={14} />Log salary as received ({fmt(salS.remaining)})</button> : <Chip tone="good">Salary logged</Chip>}>
        <p className="muted small" style={{ marginBottom: 8 }}>
          Based on your guaranteed income of <b>{fmt(p.income)}</b>. Move each amount out of your main account on payday, so what's left in it is close to what you can actually spend. Tick each step as you do it.
        </p>
        <StackBar segments={segs} label="Payday allocation" />
        {rows.map((r) => (
          <div className="alloc" key={r.k}>
            <input type="checkbox" aria-label={`${r.t} done`} checked={!!checks[r.k]} onChange={(e) => setCheck(r.k, e.target.checked)} />
            <span className="t"><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: r.color, marginRight: 8 }} />{r.t} <span className="muted small">{p.income > 0 ? `(${Math.round((r.amt / p.income) * 100)}%)` : ""}</span></span>
            <span className="amt">{fmt(r.amt)}</span>
            <small>{r.sub}</small>
          </div>
        ))}
        <div className="alloc">
          <span />
          <span className="t">{p.unallocated < 0 ? "Over-allocated" : "Left unallocated"}</span>
          <span className={`amt ${p.unallocated < 0 ? "neg" : "pos"}`}>{fmt(p.unallocated)}</span>
          <small>{p.unallocated < 0 ? "Your plan needs more than your income. Trim a budget or savings line before payday." : p.unallocated > 0 ? "Not given a job yet. Add it to savings (Scenarios shows the options) or a spending budget." : "Every pound has a job."}</small>
        </div>
      </Card>
      <Card title="Weekly spending pots">
        <p className="small muted" style={{ marginBottom: 8 }}>Variable budgets split across the month's 7-day blocks by number of days.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Week</th><th>Dates</th><th className="r">Days</th><th className="r">Spending pot</th></tr></thead>
            <tbody>
              {wk.map((w) => (
                <tr key={w.n}><td>Week {w.n}</td><td>{shortDate(w.start)} – {shortDate(w.end)}</td><td className="r">{w.days}</td><td className="r">{fmt(r2((p.monthSpend * w.days) / C.ed.dim))}</td></tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={3}>Month</td><td className="r">{fmt(p.monthSpend)}</td></tr></tfoot>
          </table>
        </div>
      </Card>
    </>
  );
}

