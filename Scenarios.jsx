import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend as RLegend, ReferenceLine } from "recharts";
import { MONTHS, r2, n0, parseISO, monthStart, addMonths } from "./calc.js";
import { fmt, pctTxt } from "./format.js";
import { Chip, Card, Note } from "./ui.jsx";

/* ================= Scenarios ================= */
const TRADE = {
  cautious: (s, C) => `Keeps more money for life now: about ${fmt(s.spendWeek)} a week of fun and flexible spending. The emergency fund builds slowly, so a surprise cost in the next few months would hit harder.`,
  balanced: (s, C) => `A middle path: about ${fmt(s.spendWeek)} a week for fun, and the fund grows at a steady pace. Gives some room for a bad week without derailing the plan.`,
  ambitious: (s, C) => `Fastest build: but only about ${fmt(s.spendWeek)} a week of fun and flexible spending. Works if your essentials are accurate and you can stick to it, but one unexpected cost may mean dipping into savings.`,
};

export function Scenarios({ data, C, update, notify }) {
  const st = data.settings;
  const apply = (s) => update((d) => {
    const ef = d.savings.find((l) => l.kind === "emergency");
    const goal = d.savings.find((l) => l.kind === "goal");
    const gap = Math.max(r2(n0(ef.target) - n0(ef.balance)), 0);
    const toEf = Math.min(s.save, gap);
    ef.amount = r2(toEf);
    if (goal) goal.amount = r2(s.save - toEf);
  });
  const applyAndSay = (s) => {
    apply(s);
    const gap = Math.max(r2(C.efTarget - C.efStart), 0);
    const toEf = Math.min(s.save, gap);
    notify(`${s.label} applied: ${fmt(toEf)} to the emergency fund${s.save - toEf > 0 ? `, ${fmt(s.save - toEf)} to other savings` : ""}. Investing is never changed automatically.`);
  };
  const chart = Array.from({ length: 13 }, (_, m) => ({ m: m === 0 ? "Start" : `${MONTHS[parseISO(monthStart(addMonths(st.month, m - 1))).m - 1]}`, Cautious: C.scenarios[0].proj[m].bal, Balanced: C.scenarios[1].proj[m].bal, Ambitious: C.scenarios[2].proj[m].bal }));
  const colour = { cautious: "#7B8B97", balanced: "#2F54A4", ambitious: "#0E7C66" };
  return (
    <>
      <Card title="What can realistically move">
        <p className="small muted" style={{ marginBottom: 8 }}>Essential costs are treated as untouchable. Only what's left after them, and your buffer, can be split between saving and spending.</p>
        <table className="tbl">
          <tbody>
            <tr><td>Guaranteed income</td><td className="r">{fmt(C.incomePlanned)}</td></tr>
            <tr><td>− Fixed payments (rent, bills, council tax, phone…)</td><td className="r">{fmt(C.fixedPlanned)}</td></tr>
            <tr><td>− Essential spending (e.g. groceries)</td><td className="r">{fmt(C.essentialPlanned)}</td></tr>
            <tr><td>− Buffer</td><td className="r">{fmt(C.buffer)}</td></tr>
          </tbody>
          <tfoot><tr><td>Money that can be split</td><td className={`r ${C.poolRaw < 0 ? "neg" : ""}`}>{fmt(C.poolRaw)}</td></tr></tfoot>
        </table>
        {C.budgetMissing > 0 && <Note tone="warn">{C.budgetMissing} budget line{C.budgetMissing > 1 ? "s are" : " is"} still blank, so essentials may be understated and these savings figures too optimistic. Fill them in under Plan first.</Note>}
        {C.poolRaw <= 0 && <Note tone="bad">After essentials and your buffer there's nothing left to save from this income. The scenarios below show £0 until that changes.</Note>}
        {C.efStart === 0 && data.savings.find((l) => l.kind === "emergency").balance === null && <Note tone="info">Your emergency savings balance isn't entered, so these timelines start from £0.</Note>}
      </Card>

      <div className="grid">
        {C.scenarios.map((s) => (
          <div className="sc" key={s.key}>
            <div className="row-between"><b>{s.label}</b><Chip>{s.pct}% of the pool</Chip></div>
            <div className="big2">{fmt(s.save)}<span className="muted small"> saved / month</span></div>
            <dl>
              <dt>Fun & flexible money</dt><dd>{fmt(s.spend)} / month</dd>
              <dt>…per week</dt><dd>{fmt(s.spendWeek)}</dd>
              <dt>Emergency fund target</dt><dd>{s.months === null ? "not reached" : s.months === 0 ? "already there" : `~${s.months} mo (${s.reachLabel})`}</dd>
              <dt>Saved over 12 months</dt><dd>{fmt(s.yearSaved)}</dd>
              <dt>Savings rate</dt><dd>{pctTxt(s.rate)}</dd>
            </dl>
            <p className="small muted">{TRADE[s.key](s, C)}</p>
            <label className="small muted">Share of pool saved: {s.pct}%
              <input type="range" min={0} max={100} step={5} value={s.pct} aria-label={`${s.label} share saved`} onChange={(e) => update((d) => { d.settings.scenarioPct[s.key] = Number(e.target.value); })} />
            </label>
            <button className="btn" disabled={s.save <= 0} onClick={() => applyAndSay(s)}>Use this plan</button>
          </div>
        ))}
      </div>

      <Card title="Emergency fund over the next 12 months">
        <div role="img" aria-label="Line chart of emergency fund balance under each scenario">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chart} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid stroke="#E3E9EC" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => "£" + v} tick={{ fontSize: 12 }} width={56} />
              <Tooltip formatter={(v) => fmt(v)} />
              <RLegend />
              {C.efTarget > 0 && <ReferenceLine y={C.efTarget} stroke="#B3261E" strokeDasharray="4 4" label={{ value: "Target", fontSize: 12, fill: "#B3261E", position: "insideTopRight" }} />}
              {C.scenarios.map((s) => <Line key={s.key} type="monotone" dataKey={s.label} stroke={colour[s.key]} strokeWidth={2.5} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="small muted">"Use this plan" fills your emergency fund line first (up to the gap to your target) and puts anything extra into "Other savings goal". It never touches investing. Once the fund is full, extra money has somewhere sensible to go. Unspent fun money simply stays in your account.</p>
      </Card>
    </>
  );
}
