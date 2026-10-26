import { useState } from "react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend as RLegend, ReferenceLine } from "recharts";
import { r2, shortDate, catStatus } from "./calc.js";
import { fmt, STATUS_TXT } from "./format.js";
import { Chip, Card, Note } from "./ui.jsx";

/* ================= Weekly review ================= */
export function buildSuggestions(C, w) {
  const out = [];
  const st = C.ed;
  const lines = C.varL;
  const blank = lines.filter((x) => x.missing);
  if (blank.length) out.push({ tone: "info", text: `Set budgets for ${blank.map((x) => x.line.name).join(", ")} so this review has something to compare against.` });
  const frac = st.dim > 0 ? st.elapsed / st.dim : 0;
  lines.forEach((x) => {
    const s = catStatus(x.B, x.P, frac, st.state);
    if (s === "over") out.push({ tone: "bad", text: `${x.line.name} is ${fmt(x.P - x.B)} over its ${fmt(x.B)} budget this month. Pause it for the rest of the month, or deliberately move that amount from another category.` });
    else if (s === "near") out.push({ tone: "warn", text: `${x.line.name} has used ${Math.round((x.P / x.B) * 100)}% of its budget with ${fmt(x.B - x.P)} left. Keep an eye on it.` });
    else if (s === "ahead") out.push({ tone: "warn", text: `${x.line.name} is running ahead of pace: ${fmt(x.P)} spent against about ${fmt(x.B * frac)} expected by now.` });
    else if (s === "unbudgeted") out.push({ tone: "warn", text: `You've spent ${fmt(x.P)} on ${x.line.name} but have no budget for it. Give it one in Plan.` });
  });
  if (w.budget > 0 && w.spent > w.budget + 0.005) out.push({ tone: "warn", text: `Week ${w.n} spending was ${fmt(w.spent - w.budget)} over its share. Next week, aim to bring fun and flexible spending down to make it up.` });
  else if (w.budget > 0 && w.spent > 0 && w.spent < w.budget - 0.005) out.push({ tone: "good", text: `Week ${w.n} came in ${fmt(w.budget - w.spent)} under its share. Leave it unspent, or move it into savings if safe-to-spend stays positive.` });
  if (w.lines.every((l) => l.spent === 0) && w.fixedPaid === 0) out.push({ tone: "info", text: `No paid transactions are logged in week ${w.n}. Add them in the Log tab so this review is accurate.` });
  if (st.state !== "before" && C.safe < 0) out.push({ tone: "bad", text: `Safe-to-spend is ${fmt(C.safe)}. Avoid non-essential spending until income lands, and check your fun budgets in Plan.` });
  if (C.efGap > 0 && C.efPlanned <= 0) out.push({ tone: "info", text: "No emergency fund contribution is planned yet. The Scenarios tab shows what is realistic after your essentials." });
  if (out.length === 0) out.push({ tone: "good", text: "Nothing to flag. Spending is on track against your budgets." });
  return out;
}

export function Weekly({ data, C }) {
  const [wn, setWn] = useState(C.curWeek);
  const w = C.weeks[Math.min(wn, C.weeks.length) - 1] || C.weeks[0];
  const next = C.weeks[w.n]; // week n+1
  const st = C.ed;
  const sugg = buildSuggestions(C, w);
  const nextGuide = next && C.daily > 0 ? r2(C.daily * next.days) : null;
  const frac = st.dim > 0 ? st.elapsed / st.dim : 0;
  const scheduledNext = next ? C.varL.flatMap((x) => data.txns.filter((t) => t.catId === x.line.id && t.status === "planned" && t.date >= next.start && t.date <= next.end).map((t) => ({ ...t, name: x.line.name }))) : [];
  return (
    <>
      <div className="seg" role="group" aria-label="Choose week">
        {C.weeks.map((x) => <button key={x.n} aria-pressed={wn === x.n} onClick={() => setWn(x.n)}>Week {x.n} · {x.startDay}–{x.endDay}</button>)}
      </div>
      <Card title={`Week ${w.n}: planned vs actual (${shortDate(w.start)} – ${shortDate(w.end)})`}>
        <p className="small muted" style={{ marginBottom: 8 }}>"Planned" is each category's monthly budget shared across the month by days ({w.days} of {st.dim} days this week). "Spent" counts paid transactions only. Scheduled items are planned-status transactions dated this week.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Category</th><th className="r">Planned</th><th className="r">Spent</th><th className="r">Scheduled</th><th className="r">Left</th><th>Month so far</th></tr></thead>
            <tbody>
              {w.lines.map((l) => {
                const S = C.stats[l.id];
                const s = catStatus(S.B, S.P, frac, st.state);
                return (
                  <tr key={l.id}>
                    <td>{l.name}{l.essential && <span className="muted small"> · essential</span>}</td>
                    <td className="r">{fmt(l.budget)}</td>
                    <td className="r">{fmt(l.spent)}</td>
                    <td className="r">{fmt(l.scheduled)}</td>
                    <td className={`r ${l.diff < 0 ? "neg" : ""}`}>{fmt(l.diff)}</td>
                    <td>{s === "none" ? <span className="muted small">–</span> : <Chip tone={STATUS_TXT[s][0]}>{STATUS_TXT[s][1]}</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td>Total</td><td className="r">{fmt(w.budget)}</td><td className="r">{fmt(w.spent)}</td><td className="r">{fmt(w.scheduled)}</td><td className={`r ${w.budget - w.spent < 0 ? "neg" : ""}`}>{fmt(w.budget - w.spent)}</td><td /></tr></tfoot>
          </table>
        </div>
        {w.fixedPaid > 0 && <p className="small muted" style={{ marginTop: 8 }}>Bills and fixed payments paid this week (not part of the weekly spending pot): {fmt(w.fixedPaid)}.</p>}
      </Card>

      <div className="grid2">
        <Card title="Warnings and suggestions">
          {sugg.map((s, i) => <Note key={i} tone={s.tone === "bad" ? "bad" : s.tone === "warn" ? "warn" : s.tone === "good" ? "good" : "info"}>{s.text}</Note>)}
        </Card>
        <Card title={next ? `Looking ahead: week ${next.n} (${shortDate(next.start)} – ${shortDate(next.end)})` : "Looking ahead"}>
          {!next ? <p className="muted small">That's the last week of the month. Start a new month from the Data tab when you're ready.</p> : (
            <ul className="list">
              <li>Spending pot for the week: <b>{fmt(r2(C.variablePlanned * next.days / st.dim))}</b> ({next.days} days of your variable budgets).</li>
              <li>{nextGuide !== null ? <>Safe-to-spend daily guide: <b>{fmt(C.daily)}</b> a day, so about <b>{fmt(nextGuide)}</b> for the week on top of essentials.</> : "No safe-to-spend headroom right now, so aim to keep non-essential spending at £0 until that changes."}</li>
              <li>{scheduledNext.length ? <>Already planned: {scheduledNext.map((t) => `${t.name} ${fmt(t.amount)} (${shortDate(t.date)})`).join(", ")}.</> : "Nothing planned yet. Add known upcoming costs as 'Planned' in the Log."}</li>
              {C.upcoming.length > 0 && <li>Bills still unpaid: {C.upcoming.map((u) => `${u.name} ${fmt(u.remaining)}`).join(", ")}.</li>}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Variable spending against an even pace">
        {C.variablePlanned <= 0 ? <p className="muted small">Set variable budgets to see the pace line.</p> : (
          <div role="img" aria-label="Line chart of cumulative variable spending against an even budget pace">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={C.cumulative} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
                <CartesianGrid stroke="#E3E9EC" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => "£" + v} tick={{ fontSize: 12 }} width={52} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(d) => `Day ${d}`} />
                <RLegend />
                <Line type="monotone" dataKey="pace" name="Even pace of budget" stroke="#9AA9B3" strokeDasharray="5 4" dot={false} />
                <Line type="monotone" dataKey="actual" name="Spent so far" stroke="#0E7C66" strokeWidth={2.5} dot={false} connectNulls={false} />
                {st.state === "during" && <ReferenceLine x={st.day} stroke="#2F54A4" strokeDasharray="2 3" />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </>
  );
}

