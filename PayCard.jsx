import { useState } from "react";
import { n0, r2, sum, uid, isISO, shortDate, periodName } from "./calc.js";
import { fmt, ordinal } from "./format.js";
import { Chip, Card, Field, MoneyInput } from "./ui.jsx";

/* The first thing on the dashboard: how much you get paid this period, and when it actually arrived. */
export function PayCard({ data, C, update, notify }) {
  const salary = data.income.find((l) => l.kind === "salary") || data.income[0];
  const S = C.stats[salary.id];
  const blank = salary.amount === null || salary.amount === undefined;
  const received = S.P;
  const done = received > 0 && !blank && S.remaining === 0;
  const lastDate = data.txns.filter((t) => t.catId === salary.id && t.type === "income" && t.status === "paid").map((t) => t.date).sort().pop();
  const [open, setOpen] = useState(null);
  const expanded = open === null ? !done : open;
  const [amt, setAmt] = useState(null);
  const [date, setDate] = useState("");
  const per = C.period;
  const when = isISO(date) ? date : C.ed.date;
  const periodLabel = periodName(data.settings.month, per.payday);

  const setExpected = (v) => update((d) => { d.income.find((l) => l.id === salary.id).amount = v; });
  const record = () => {
    const a = amt !== null ? amt : n0(salary.amount);
    if (!(a > 0)) return notify("Type the amount you received first.");
    if (when < per.start || when > per.end) return notify(`Pick a date inside this pay period (${shortDate(per.start)} to ${shortDate(per.end)}).`);
    let total = 0;
    update((d) => {
      const l = d.income.find((x) => x.id === salary.id);
      d.txns.push({ id: uid(), date: when, type: "income", catId: salary.id, desc: `${l.name} received`, amount: r2(a), status: "paid", example: false });
      // once pay has really arrived, the plan should use what you actually got
      total = sum(d.txns.filter((t) => t.catId === salary.id && t.type === "income" && t.status === "paid"), (t) => t.amount);
      l.amount = total;
    });
    setAmt(null);
    setDate("");
    setOpen(false);
    notify(`Recorded ${fmt(a)}. Your plan now uses ${fmt(r2(received + a))} as this period's pay.`);
  };

  return (
    <Card
      title="Pay this period"
      aside={blank ? <Chip tone="need">Enter your pay</Chip> : done ? <Chip tone="good">Received {fmt(received)}</Chip> : received > 0 ? <Chip tone="warn">Part received {fmt(received)}</Chip> : <Chip>Not received yet</Chip>}
    >
      <p className="small muted" style={{ marginBottom: 8 }}>{periodLabel}{per.payday > 1 ? ` · pay cycle (payday around the ${ordinal(per.payday)})` : ""}</p>
      {!expanded ? (
        <div className="row-between">
          <span>
            Took home <b>{fmt(received)}</b>{lastDate ? ` on ${shortDate(lastDate)}` : ""}. Plan uses {fmt(salary.amount)}.
          </span>
          <button className="btn small" onClick={() => setOpen(true)}>Change or add</button>
        </div>
      ) : (
        <>
          <div className="fields">
            <Field label="Expected take-home pay" hint={blank ? "Type what you expect after tax. Nothing is assumed." : "Used for planning until your pay arrives. It switches to the real amount when you record it."}>
              <MoneyInput label="Expected take-home pay" nullable value={salary.amount} placeholder="Enter £" onChange={setExpected} />
            </Field>
            <Field label="Pay received" hint="Amount that actually landed in your account, and the day.">
              <div className="actions" style={{ flexWrap: "nowrap" }}>
                <MoneyInput label="Pay received amount" value={amt !== null ? amt : null} nullable placeholder={blank ? "0.00" : String(salary.amount)} onChange={setAmt} />
                <input type="date" aria-label="Pay received date" min={per.start} max={per.end} value={date || C.ed.date} onChange={(e) => setDate(e.target.value)} style={{ minWidth: 0 }} />
              </div>
            </Field>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={record} disabled={blank && amt === null}>Record pay received</button>
            {done && <button className="btn" onClick={() => setOpen(false)}>Close</button>}
          </div>
        </>
      )}
    </Card>
  );
}
