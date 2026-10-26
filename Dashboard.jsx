import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend as RLegend } from "recharts";
import { todayISO, nextMonth, addMonths, periodName, shortDate } from "./calc.js";
import { fmt, pctTxt } from "./format.js";
import { PayCard } from "./PayCard.jsx";
import { Money, Chip, Meter, Card, Field, Note, MoneyInput, StackBar, Swatches, CashStrip, MonthRuler } from "./ui.jsx";

/* ================= Dashboard ================= */
export function SetupCard({ data, C, update, go }) {
  const st = data.settings;
  const efLine = data.savings.find((l) => l.kind === "emergency");
  const rest = C.missing.filter((m) => m.key !== "cash" && m.key !== "efbal" && m.key !== "pay");
  return (
    <Card title={`Fill in your figures (${C.missing.filter((m) => m.key !== "pay").length} to go)`}>
      <p className="small muted">Nothing here is guessed. Anything blank counts as £0 until you enter it, so the numbers below are provisional until you do.</p>
      <p className="small" style={{ marginBottom: 6 }}>Budgeting for <b>{periodName(st.month, st.payday || 1)}</b>. <button className="chip btn-chip" onClick={() => go("plan", "settings")}>Change period or payday</button></p>
      <div className="setup-grid">
        {(st.openingCash === null || st.openingCash === undefined) && (
          <Field label="Current account balance" hint="Your balance on the 1st of the month, or today's balance if you will only log new transactions from now on. Enter 0 if empty.">
            <MoneyInput label="Current account balance" nullable allowNegative value={st.openingCash} onChange={(v) => update((d) => { d.settings.openingCash = v; })} />
          </Field>
        )}
        {efLine && (efLine.balance === null || efLine.balance === undefined) && (
          <Field label="Emergency savings balance" hint="What is in your emergency savings today. Enter 0 if you're starting from scratch.">
            <MoneyInput label="Emergency savings balance" nullable value={efLine.balance} onChange={(v) => update((d) => { d.savings.find((l) => l.kind === "emergency").balance = v; })} />
          </Field>
        )}
      </div>
      {rest.length > 0 && (
        <>
          <p className="small" style={{ marginBottom: 6 }}>Budget lines still blank (tap one to enter it, or type £0 if it doesn't apply):</p>
          <div className="chips">
            {rest.map((m) => (
              <button key={m.key} className="chip need btn-chip" onClick={() => go("plan", m.sub)}>{m.label}</button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export function Dashboard({ data, C, update, go, markPaid, backupAt, notify }) {
  const st = data.settings;
  const ready = st.openingCash !== null && st.openingCash !== undefined;
  const short = C.safe < 0;
  const monthName = periodName(st.month, st.payday || 1);
  let heroLine;
  if (!ready) heroLine = "Enter your current account balance to switch this on.";
  else if (C.ed.state === "after") heroLine = `${monthName} is over. Start the next period from the Data tab.`;
  else if (short) heroLine = `You're ${fmt(-C.safe)} short of covering bills, savings and essentials. Hold off on non-essential spending.`;
  else heroLine = `After ${fmt(C.fixedRemaining)} of bills, ${fmt(C.savingsRemaining)} of savings, ${fmt(C.essentialRemaining)} of essentials${C.buffer > 0 ? ` and a ${fmt(C.buffer)} buffer` : ""}.`;

  const ef = data.savings.find((l) => l.kind === "emergency");
  const efMonths = C.efPlanned > 0 && C.efGap > 0 ? Math.ceil(C.efGap / C.efPlanned - 1e-9) : null;
  const cover = C.essentialsCommitted > 0 ? C.efBalance / C.essentialsCommitted : null;

  const funBudget = C.discretionaryPlanned;
  const allocSegs = [
    { label: "Bills & fixed payments", value: C.fixedPlanned, color: "var(--bills)" },
    { label: "Essential spending", value: C.essentialPlanned, color: "var(--c-ess)" },
    { label: "Fun & flexible spending", value: funBudget, color: "#C0504D" },
    { label: "Savings", value: C.savingsPlanned, color: "var(--c-save)" },
    { label: "Buffer", value: C.buffer, color: "var(--c-buf)" },
    { label: "Unallocated", value: Math.max(C.planUnallocated, 0), color: "var(--safe)" },
  ];
  const rows = C.catRows.map((r) => ({ name: r.name.length > 16 ? r.name.slice(0, 15) + "…" : r.name, Budget: r.B, Paid: r.P }));

  return (
    <>
      {C.ed.state === "before" && (
        <Note tone="info">
          {monthName} hasn't started yet, so this shows the whole period ({C.ed.dim} days). To rehearse a day part-way through, set "Pretend today is" under Plan → Settings.
        </Note>
      )}
      {(data.txns.length > 0 || data.history.length > 0) && (!backupAt || (Date.now() - new Date(backupAt).getTime()) / 86400000 > 14) && (
        <Note tone="info">
          Your data is stored only on this device and isn't backed up. {backupAt ? "Your last backup is over two weeks old." : "You haven't made a backup yet."}{" "}
          <button className="btn small" style={{ marginLeft: 6 }} onClick={() => go("data")}>Back up now</button>
        </Note>
      )}
      {C.ed.state === "after" && todayISO() > C.period.end && (
        <Note tone="warn">
          {monthName} has finished. <button className="btn small" style={{ marginLeft: 6 }} onClick={() => go("data")}>Start {periodName(nextMonth(st.month), st.payday || 1)}</button>
        </Note>
      )}
      <PayCard data={data} C={C} update={update} notify={notify} />
      {C.missing.filter((m) => m.key !== "pay").length > 0 && <SetupCard data={data} C={C} update={update} go={go} />}

      <section className="card hero" aria-label="Safe to spend">
        <div className="hero-top">
          <div>
            <h2>Safe to spend</h2>
            <div className={`big${short && ready ? " neg" : ""}${!ready ? " dim" : ""}`}>{ready ? <Money v={C.safe} /> : "£ – –"}</div>
            <p className="muted" style={{ maxWidth: 520 }}>{heroLine}</p>
            {ready && C.budgetMissing > 0 && <p className="small" style={{ marginTop: 6 }}><Chip tone="warn">Provisional: {C.budgetMissing} budget figure{C.budgetMissing > 1 ? "s" : ""} still blank, counted as £0</Chip></p>}
          </div>
          <div className="daily">
            <span className="muted small">Daily guide</span>
            <b>{ready && !short && C.ed.daysRemaining > 0 ? fmt(C.daily) : "–"}</b>
            <span className="muted small">
              {ready && !short && C.ed.daysRemaining > 0 ? `${fmt(C.weekly)} a week · ${C.ed.daysRemaining} day${C.ed.daysRemaining > 1 ? "s" : ""} left (incl. today)` : C.ed.state === "after" ? "Month finished" : "Nothing safe to spend yet"}
            </span>
          </div>
        </div>
        {ready && short && C.incomeExpectedRemaining > 0 && !st.countExpected && (
          <p className="small" style={{ marginTop: 10 }}>
            {fmt(C.incomeExpectedRemaining)} of expected income hasn't arrived and isn't counted. Log it as received on payday, or switch on "Count expected income" in Plan → Settings.
          </p>
        )}
        <CashStrip C={C} />
        <MonthRuler C={C} />
        {ready && C.discretionaryRemaining > Math.max(C.safe, 0) + 0.005 && (
          <p className="small" style={{ marginTop: 12 }}>
            Your remaining fun budgets ({fmt(C.discretionaryRemaining)}) add up to more than your safe-to-spend ({fmt(Math.max(C.safe, 0))}). Trim them by about {fmt(C.discretionaryRemaining - Math.max(C.safe, 0))}.
          </p>
        )}
        <details className="assume">
          <summary>Assumptions behind this number</summary>
          <ul>
            <li>Cash in your account = starting balance + income marked paid − expenses marked paid − savings transfers marked paid (transfers leave your current account).</li>
            <li>Bills still to pay = each fixed line's budget minus what you've paid, or any scheduled payments if higher. Scheduled items sit inside the budget, never on top.</li>
            <li>Planned savings not yet transferred are held back. Essential spending left = the unspent budget on lines marked essential (Groceries by default).</li>
            <li>{st.holdBuffer ? `A ${fmt(st.buffer)} buffer is held back (editable in Plan → Settings).` : "No buffer is held back (switched off in Settings)."}</li>
            <li>{st.countExpected ? "Income you expect but haven't received is counted (guaranteed lines only)." : "Income that hasn't arrived yet is not counted. Side income, bonuses and other income only count once received."}</li>
            <li>Fun and flexible budgets are not deducted: safe-to-spend is the money available for them.</li>
            <li>Days left includes today ({C.ed.daysRemaining} from {shortDate(C.ed.date)}); the daily guide is safe-to-spend divided by that. Blank figures count as £0.</li>
          </ul>
        </details>
      </section>

      <div className="grid" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="lab">Income received</div>
          <div className="val">{fmt(C.incomeReceived)}</div>
          <Meter value={C.incomePlanned > 0 ? C.incomeReceived / C.incomePlanned : 0} label="Income received against guaranteed income" />
          <div className="note">Guaranteed: {fmt(C.incomePlanned)} · still to arrive {fmt(C.incomeExpectedRemaining)}</div>
          {C.incomePossible > 0 && <div className="note">+{fmt(C.incomePossible)} possible extras, not counted</div>}
        </div>
        <div className="stat">
          <div className="lab">Expenses paid</div>
          <div className="val">{fmt(C.expensesPaid)}</div>
          <Meter value={C.expensesProjected > 0 ? C.expensesPaid / C.expensesProjected : 0} color="var(--bills)" label="Expenses paid against projected" />
          <div className="note">Projected for the month: {fmt(C.expensesProjected)}</div>
        </div>
        <div className="stat">
          <div className="lab">Savings: actual vs planned</div>
          <div className="val">{fmt(C.savingsActual)}</div>
          <Meter value={C.savingsPlanned > 0 ? C.savingsActual / C.savingsPlanned : 0} color="var(--c-save)" label="Savings moved against planned" />
          <div className="note">Planned: {fmt(C.savingsPlanned)}</div>
        </div>
        <div className="stat">
          <div className="lab">Savings rate</div>
          <div className="val">{pctTxt(C.savingsRateActual)}</div>
          <div className="note">Actual (moved ÷ income received). Planned: {pctTxt(C.savingsRatePlanned)}</div>
        </div>
        <div className="stat">
          <div className="lab">Cash in account</div>
          <div className={`val${C.cash < 0 ? " neg" : ""}`}>{fmt(C.cash)}</div>
          <div className="note">{fmt(C.reserved)} reserved · {fmt(Math.max(C.safe, 0))} free</div>
        </div>
        <div className="stat">
          <div className="lab">Plan: unallocated income</div>
          <div className={`val${C.planUnallocated < 0 ? " neg" : ""}`}>{fmt(C.planUnallocated)}</div>
          <div className="note">{C.planUnallocated < 0 ? "Your plan spends more than your guaranteed income." : "Guaranteed income not yet given a job."}</div>
        </div>
      </div>

      <Card title="Emergency fund" aside={<Chip tone={C.efProgress >= 1 ? "good" : ""}>{Math.round(C.efProgress * 100)}%</Chip>}>
        <div className="row-between">
          <b style={{ fontSize: 22 }}>{fmt(C.efBalance)}</b>
          <span className="muted">target {fmt(C.efTarget)}</span>
        </div>
        <Meter tall value={C.efProgress} label="Emergency fund progress" />
        <p className="small muted">
          {C.efTarget <= 0 ? "Set a target in Plan → Savings." : C.efGap <= 0 ? "Target reached. Extra savings can go towards other goals." : `${fmt(C.efGap)} to go. `}
          {efMonths !== null && `At ${fmt(C.efPlanned)} a period that's about ${efMonths} period${efMonths > 1 ? "s" : ""} (by the end of ${periodName(addMonths(st.month, efMonths - 1), st.payday || 1)}).`}
          {C.efGap > 0 && C.efPlanned <= 0 && " No monthly contribution planned yet: see Scenarios."}
          {cover !== null && C.efBalance > 0 && ` Covers about ${cover.toFixed(1)} months of your essential costs (${fmt(C.essentialsCommitted)} a month).`}
        </p>
        {ef && ef.balance === null && <p className="small"><Chip tone="need">Enter your starting balance above</Chip></p>}
      </Card>

      <div className="grid2">
        <Card title="Bills still to pay">
          {C.upcoming.length === 0 ? (
            <p className="muted small">Every fixed payment with an amount is marked paid.</p>
          ) : (
            <ul className="list" style={{ listStyle: "none", padding: 0 }}>
              {C.upcoming.map((u) => (
                <li key={u.id} className="row-between">
                  <span><b>{u.name}</b> {u.overdue && <Chip tone="bad">Overdue</Chip>} <span className="muted small">{u.date ? `due ${shortDate(u.date)}` : "no due date set"}{u.occCount > 1 ? ` · ${u.occCount} payments this period` : ""}</span></span>
                  <span className="actions" style={{ alignItems: "center" }}>
                    <b>{u.occCount > 1 ? fmt(u.each) : fmt(u.remaining)}</b>
                    <button className="btn small" onClick={() => markPaid("fixed", u.id, u.occCount > 1 ? { one: true } : undefined)}>{u.occCount > 1 ? `Mark next paid (${fmt(u.each)})` : "Mark paid"}</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Where your guaranteed income goes (plan)">
          <StackBar segments={allocSegs} label="Plan allocation" />
          <Swatches items={allocSegs} />
          {C.planUnallocated < 0 && <p className="small neg" style={{ marginTop: 8 }}>Over-planned by {fmt(-C.planUnallocated)}.</p>}
        </Card>
      </div>

      <Card title="Budget vs paid by category">
        {rows.length === 0 ? (
          <p className="muted small">Add budget amounts in Plan, then log payments, and this chart fills in.</p>
        ) : (
          <div role="img" aria-label="Bar chart of budget against paid for each category">
            <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 46 + 60)}>
              <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="#E3E9EC" />
                <XAxis type="number" tickFormatter={(v) => "£" + v} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => fmt(v)} />
                <RLegend />
                <Bar dataKey="Budget" fill="#B9C6CE" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Paid" fill="#0E7C66" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {data.history.length > 0 && (
        <Card title="Previous months">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Month</th><th className="r">Income</th><th className="r">Spent</th><th className="r">Saved</th><th className="r">Rate</th><th className="r">Emergency fund</th></tr></thead>
              <tbody>
                {data.history.map((h, i) => (
                  <tr key={i}><td>{h.label || (h.month ? periodName(h.month, 1) : "–")}</td><td className="r">{fmt(h.income)}</td><td className="r">{fmt(h.expenses)}</td><td className="r">{fmt(h.saved)}</td><td className="r">{pctTxt(h.rate)}</td><td className="r">{fmt(h.efBalance)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
