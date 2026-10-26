import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { n0, uid, isISO, monthStart, monthEnd, monthLabel, shortDate, catStatus } from "../lib/calc.js";
import { fmt, STATUS_TXT } from "../lib/format.js";
import { Chip, Meter, Card, Field, Note, MoneyInput, StackBar } from "../components/ui.jsx";

/* ================= Plan ================= */

export function LineRow({ group, line, S, C, dim, setLine, remove, markPaid }) {
  const isVar = group === "variable";
  const verb = group === "income" ? "received" : group === "savings" ? "moved" : "paid";
  const showMark = !isVar && S.remaining > 0 && (S.B > 0 || S.S > 0);
  let chip = null;
  if (S.missing && group !== "income") chip = <Chip tone="need">Enter an amount</Chip>;
  else if (group === "income") {
    if (S.P > 0) chip = line.counted && S.remaining > 0 ? <Chip tone="warn">Received {fmt(S.P)} · {fmt(S.remaining)} to come</Chip> : <Chip tone="good">Received {fmt(S.P)}</Chip>;
    else if (S.B > 0) chip = <Chip>{line.counted ? "Not received yet" : "Possible, not counted"}</Chip>;
  } else if (group === "fixed") {
    if (S.B > 0 && S.over > 0) chip = <Chip tone="bad">Paid {fmt(S.P)} · {fmt(S.over)} over</Chip>;
    else if (S.P > 0 && S.remaining === 0) chip = <Chip tone="good">Paid {fmt(S.P)}</Chip>;
    else if (S.P > 0) chip = <Chip tone="warn">Part paid {fmt(S.P)}</Chip>;
    else if (S.B > 0 || S.S > 0) chip = <Chip>Unpaid</Chip>;
  } else if (group === "savings") {
    if (S.P > 0 && S.remaining === 0) chip = <Chip tone="good">Moved {fmt(S.P)}</Chip>;
    else if (S.P > 0) chip = <Chip tone="warn">Moved {fmt(S.P)} of {fmt(S.B)}</Chip>;
    else if (S.B > 0) chip = <Chip>Not moved yet</Chip>;
  }
  const elapsed = C.ed.dim > 0 ? C.ed.elapsed / C.ed.dim : 0;
  const vs = isVar ? catStatus(S.B, S.P, elapsed, C.ed.state) : "none";
  const sav = group === "savings" ? C.savL.find((x) => x.line.id === line.id) : null;
  return (
    <div className={`line${S.missing && group !== "income" ? " missing" : ""}`}>
      <div className="line-main">
        <input aria-label="Name" value={line.name} maxLength={40} onChange={(e) => setLine({ name: e.target.value })} />
        <MoneyInput label={`${line.name} monthly amount`} nullable={group !== "income"} value={line.amount} placeholder="Enter £" onChange={(v) => setLine({ amount: v })} />
      </div>
      <div className="line-extra">
        {group === "income" && line.kind !== "salary" && (
          <label className="toggle"><input type="checkbox" checked={line.counted} onChange={(e) => setLine({ counted: e.target.checked })} />Treat as guaranteed (counts in my plan)</label>
        )}
        {group === "income" && line.kind === "salary" && <Chip tone="good">Guaranteed</Chip>}
        {group === "fixed" && (
          <label className="mini">Due on day
            <input type="number" min={1} max={dim} aria-label={`${line.name} due day`} value={line.due || ""} placeholder="–"
              onChange={(e) => { const n = parseInt(e.target.value, 10); setLine({ due: Number.isInteger(n) && n >= 1 && n <= 31 ? n : null }); }} />
          </label>
        )}
        {isVar && <label className="toggle"><input type="checkbox" checked={line.essential} onChange={(e) => setLine({ essential: e.target.checked })} />Essential (held back in safe-to-spend)</label>}
        {group === "savings" && (
          <>
            <label className="mini">Saved so far
              <MoneyInput label={`${line.name} saved so far`} nullable value={line.balance} placeholder="Enter £" onChange={(v) => setLine({ balance: v })} />
            </label>
            {line.kind !== "invest" && (
              <label className="mini">Target
                <MoneyInput label={`${line.name} target`} nullable value={line.target} placeholder="Optional" onChange={(v) => setLine({ target: v })} />
              </label>
            )}
          </>
        )}
      </div>
      {isVar && S.B > 0 && (
        <div>
          <Meter value={S.P / S.B} color={vs === "over" ? "var(--bad)" : vs === "near" || vs === "ahead" ? "#D9822B" : "var(--safe)"} label={`${line.name} spent against budget`} />
          <span className="small muted">Spent {fmt(S.P)} of {fmt(S.B)}{S.S > 0 ? ` · ${fmt(S.S)} scheduled` : ""}</span>
        </div>
      )}
      {sav && line.target > 0 && (
        <div>
          <Meter value={sav.balanceNow / line.target} color="var(--c-save)" label={`${line.name} progress`} />
          <span className="small muted">{fmt(sav.balanceNow)} of {fmt(line.target)}</span>
        </div>
      )}
      <div className="line-foot">
        {isVar && vs !== "none" && vs !== "ok" && <Chip tone={STATUS_TXT[vs][0]}>{STATUS_TXT[vs][1]}</Chip>}
        {chip}
        {showMark && <button className="btn small" onClick={markPaid}><Check size={14} />Mark {verb} ({fmt(S.remaining)})</button>}
        <button className="icon" aria-label={`Delete ${line.name}`} onClick={remove}><Trash2 size={16} /></button>
      </div>
    </div>
  );
}

export function PlanBalance({ C }) {
  const segs = [
    { label: "Bills & fixed", value: C.fixedPlanned, color: "var(--bills)" },
    { label: "Spending budgets", value: C.variablePlanned, color: "#C0504D" },
    { label: "Savings", value: C.savingsPlanned, color: "var(--c-save)" },
    { label: "Buffer", value: C.buffer, color: "var(--c-buf)" },
    { label: "Unallocated", value: Math.max(C.planUnallocated, 0), color: "var(--safe)" },
  ];
  return (
    <Card title="Plan balance">
      <p className="small muted" style={{ marginBottom: 8 }}>
        Guaranteed income {fmt(C.incomePlanned)} − fixed {fmt(C.fixedPlanned)} − spending {fmt(C.variablePlanned)} − savings {fmt(C.savingsPlanned)} − buffer {fmt(C.buffer)} ={" "}
        <b className={C.planUnallocated < 0 ? "neg" : "pos"}>{fmt(C.planUnallocated)}</b>
      </p>
      <StackBar segments={segs} label="Plan balance" />
      {C.planUnallocated < 0 && <Note tone="bad">Your plan spends {fmt(-C.planUnallocated)} more than your guaranteed income. Trim a budget or savings line.</Note>}
    </Card>
  );
}

export function SettingsPanel({ data, update, C }) {
  const st = data.settings;
  const [pending, setPending] = useState(null);
  const pick = (v) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v) || v === st.month) return;
    if (data.txns.length === 0) update((d) => { d.settings.month = v; d.settings.asOf = ""; d.paydayChecks = {}; });
    else setPending(v);
  };
  const confirmPick = () => { const v = pending; setPending(null); update((d) => { d.settings.month = v; d.settings.asOf = ""; d.txns = []; d.paydayChecks = {}; }); };
  return (
    <Card title="Month settings">
      <div className="fields">
        <Field label="Budget month" hint={`${shortDate(monthStart(st.month))} to ${shortDate(monthEnd(st.month))} ${st.month.slice(0, 4)}. To move on at month end, use Data → Start next month (it carries balances forward).`}>
          <input type="month" aria-label="Budget month" placeholder="YYYY-MM" value={st.month} onChange={(e) => pick(e.target.value)} />
        </Field>
        <Field label="Current account balance at start" hint="Your balance on the 1st of the month, or today's balance if you only log new transactions from now on.">
          <MoneyInput label="Current account balance at start" nullable allowNegative value={st.openingCash} placeholder="Enter £" onChange={(v) => update((d) => { d.settings.openingCash = v; })} />
        </Field>
        <Field label="Pretend today is" hint={st.asOf ? "Rehearsing a different date. Clear it to use the real date." : "Using the real date. Pick a date in the month to rehearse payday or check mid-month."}>
          <div className="actions">
            <input type="date" aria-label="Pretend today is" min={monthStart(st.month)} max={monthEnd(st.month)} value={st.asOf} onChange={(e) => update((d) => { d.settings.asOf = isISO(e.target.value) ? e.target.value : ""; })} style={{ flex: 1 }} />
            {st.asOf && <button className="btn small" onClick={() => update((d) => { d.settings.asOf = ""; })}>Use today</button>}
          </div>
        </Field>
      </div>
      {pending && (
        <Note tone="warn">
          <p>Switching to <b>{monthLabel(pending)}</b> clears this month's {data.txns.length} transaction{data.txns.length > 1 ? "s" : ""} (they're dated in {monthLabel(st.month)}). Your plan and balances stay as they are. Export from the Data tab first if you want to keep them.</p>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={confirmPick}>Switch to {monthLabel(pending)}</button>
            <button className="btn" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </Note>
      )}
      <div className="fields" style={{ marginTop: 6 }}>
        <Field label="Buffer to keep back" hint="A cushion for surprises. Held back from safe-to-spend, and shown in the payday plan. Edit freely.">
          <div className="actions" style={{ alignItems: "center", flexWrap: "nowrap" }}>
            <MoneyInput label="Buffer amount" value={st.buffer} onChange={(v) => update((d) => { d.settings.buffer = v ?? 0; })} />
            <label className="toggle"><input type="checkbox" checked={st.holdBuffer} onChange={(e) => update((d) => { d.settings.holdBuffer = e.target.checked; })} />Hold back</label>
          </div>
        </Field>
        <Field label="Count expected income" hint="Off by default: salary that hasn't arrived isn't treated as cash. Turn on to count guaranteed income still to come this month.">
          <label className="toggle"><input type="checkbox" checked={st.countExpected} onChange={(e) => update((d) => { d.settings.countExpected = e.target.checked; })} />Include guaranteed income not yet received</label>
        </Field>
      </div>
    </Card>
  );
}

export function Plan({ data, C, update, sub, setSub, markPaid, removeLine }) {
  const dim = C.ed.dim;
  const setLine = (group, id) => (patch) => update((d) => { const l = d[group].find((x) => x.id === id); if (l) Object.assign(l, patch); });
  const add = (group) => update((d) => {
    const id = uid();
    if (group === "income") d.income.push({ id, kind: "other", name: "New income", amount: 0, counted: false });
    if (group === "fixed") d.fixed.push({ id, name: "New payment", amount: null, due: null });
    if (group === "variable") d.variable.push({ id, name: "New category", amount: null, essential: false });
    if (group === "savings") d.savings.push({ id, kind: "goal", name: "New savings goal", amount: 0, balance: null, target: null });
  });
  const stats = { income: C.incomeL, fixed: C.fixedL, variable: C.varL, savings: C.savL };
  const intro = {
    income: "Salary is treated as guaranteed. Side income, bonuses and other income are NOT assumed: they only join your plan if you tick 'guaranteed', and always count once logged as received.",
    fixed: "Rent and bills are your contributions. If your bills contribution already covers council tax, utilities or similar, enter £0 on those lines so nothing is counted twice. Set a due day to see bills on the month ruler.",
    variable: "Set a monthly budget for each category. Spending logged in the Log tab uses up its category budget, it never adds on top. Mark essentials (like groceries) so safe-to-spend keeps that money back.",
    savings: "Emergency fund first. Money you might need within the next few years should stay in easy-access cash savings, not investments. The investing line is optional, so only put money there that you won't need soon.",
  };
  const subs = [["settings", "Settings"], ["income", "Income"], ["fixed", "Fixed expenses"], ["variable", "Variable spending"], ["savings", "Savings"]];
  const ef = C.efGap > 0;
  const invest = data.savings.find((l) => l.kind === "invest");
  return (
    <>
      <PlanBalance C={C} />
      <div className="seg" role="group" aria-label="Plan sections">
        {subs.map(([k, l]) => <button key={k} aria-pressed={sub === k} onClick={() => setSub(k)}>{l}</button>)}
      </div>
      {sub === "settings" && <SettingsPanel data={data} update={update} C={C} />}
      {sub !== "settings" && (
        <Card title={subs.find((s) => s[0] === sub)[1]} aside={<button className="btn small" onClick={() => add(sub)}><Plus size={14} />Add {sub === "income" ? "income" : sub === "fixed" ? "payment" : sub === "variable" ? "category" : "goal"}</button>}>
          <Note tone="info">{intro[sub]}</Note>
          {sub === "savings" && ef && invest && n0(invest.amount) > 0 && (
            <Note tone="warn">Your emergency fund is {fmt(C.efGap)} below its target while {fmt(invest.amount)} a month is planned for investing. Money you could need in an emergency is better kept in cash savings until the fund is complete. This is general information, not financial advice.</Note>
          )}
          {stats[sub].map((S) => (
            <LineRow key={S.line.id} group={sub} line={S.line} S={S} C={C} dim={dim} setLine={setLine(sub, S.line.id)} remove={() => removeLine(sub, S.line.id)} markPaid={() => markPaid(sub, S.line.id)} />
          ))}
          <p className="small muted">
            {sub === "income" && `Guaranteed: ${fmt(C.incomePlanned)} · possible extras not counted: ${fmt(C.incomePossible)} · received so far: ${fmt(C.incomeReceived)}`}
            {sub === "fixed" && `Planned: ${fmt(C.fixedPlanned)} · paid: ${fmt(C.fixedPaid)} · still to pay: ${fmt(C.fixedRemaining)}`}
            {sub === "variable" && `Budgeted: ${fmt(C.variablePlanned)} · spent: ${fmt(C.variablePaid)} · essential still to spend: ${fmt(C.essentialRemaining)}`}
            {sub === "savings" && `Planned: ${fmt(C.savingsPlanned)} · moved so far: ${fmt(C.savingsActual)}`}
          </p>
        </Card>
      )}
    </>
  );
}

