import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Check, Pencil } from "lucide-react";
import { r2, sum, uid, isISO, monthStart, monthEnd, shortDate } from "./calc.js";
import { fmt } from "./format.js";
import { Chip, Card, Field, Note, MoneyInput } from "./ui.jsx";

/* ================= Transaction log ================= */
export function Log({ data, C, update, notify, loadExamples, removeExamples }) {
  const ed = C.ed;
  const ym = data.settings.month;
  const blank = () => ({ type: "expense", date: ed.date, catId: "", amount: "", desc: "", status: "paid" });
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState("");
  const [fType, setFType] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [q, setQ] = useState("");
  const [bank, setBank] = useState("");

  const cats = form.type === "income" ? data.income : form.type === "savings" ? data.savings : [...data.fixed, ...data.variable];
  const catKey = cats.map((c) => c.id).join(",");
  useEffect(() => {
    if (!cats.some((c) => c.id === form.catId)) setForm((f) => ({ ...f, catId: cats[0] ? cats[0].id : "" }));
  }, [form.type, catKey]);

  const names = useMemo(() => {
    const m = {};
    [...data.income, ...data.fixed, ...data.variable, ...data.savings].forEach((l) => (m[l.id] = l.name));
    return m;
  }, [data]);
  const sel = C.stats[form.catId];

  const submit = () => {
    const amt = parseFloat(form.amount);
    if (!form.catId) return setErr("Choose a category.");
    if (!(amt > 0)) return setErr("Enter an amount above £0.");
    if (!isISO(form.date) || form.date < monthStart(ym) || form.date > monthEnd(ym))
      return setErr(`Pick a date between ${shortDate(monthStart(ym))} and ${shortDate(monthEnd(ym))}. Paid early? Date it on the 1st.`);
    setErr("");
    const t = { id: editId || uid(), date: form.date, type: form.type, catId: form.catId, desc: form.desc.trim().slice(0, 80) || names[form.catId] || "", amount: r2(amt), status: form.status, example: false };
    update((d) => {
      if (editId) {
        const i = d.txns.findIndex((x) => x.id === editId);
        if (i >= 0) d.txns[i] = t;
      } else d.txns.push(t);
    });
    notify(editId ? "Transaction updated." : "Transaction added.");
    setEditId(null);
    setForm((f) => ({ ...blank(), type: f.type, catId: f.catId, date: f.date, status: f.status }));
  };
  const edit = (t) => {
    setEditId(t.id);
    setErr("");
    setForm({ type: t.type, date: t.date, catId: t.catId, amount: String(t.amount), desc: t.desc, status: t.status });
    window.scrollTo && window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const toggle = (id) => update((d) => { const t = d.txns.find((x) => x.id === id); if (t) t.status = t.status === "paid" ? "planned" : "paid"; });
  const del = (id) => update((d) => { d.txns = d.txns.filter((x) => x.id !== id); });

  const list = data.txns
    .filter((t) => (fType === "all" || t.type === fType) && (fStatus === "all" || t.status === fStatus))
    .filter((t) => !q.trim() || (t.desc + " " + (names[t.catId] || "")).toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  const hasExamples = data.txns.some((t) => t.example);
  const bankNum = parseFloat(bank);
  const diff = Number.isFinite(bankNum) ? r2(bankNum - C.cash) : null;

  return (
    <>
      <Card title={editId ? "Edit transaction" : "Add a transaction"}>
        <div className="seg" role="group" aria-label="Transaction type">
          {[["expense", "Expense"], ["income", "Income"], ["savings", "Savings transfer"]].map(([k, l]) => (
            <button key={k} aria-pressed={form.type === k} onClick={() => setForm((f) => ({ ...f, type: k }))}>{l}</button>
          ))}
        </div>
        <div className="fields">
          <Field label="Category">
            <select aria-label="Category" value={form.catId} onChange={(e) => setForm({ ...form, catId: e.target.value })}>
              {form.type === "expense" ? (
                <>
                  <optgroup label="Fixed">{data.fixed.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>
                  <optgroup label="Variable">{data.variable.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>
                </>
              ) : cats.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <label className="money"><span className="pound">£</span>
              <input inputMode="decimal" aria-label="Amount" placeholder="0.00" value={form.amount} onChange={(e) => { const v = e.target.value.replace(/,/g, ""); if (/^\d{0,9}(\.\d{0,2})?$/.test(v)) setForm({ ...form, amount: v }); }} />
            </label>
          </Field>
          <Field label="Date">
            <input type="date" aria-label="Date" min={monthStart(ym)} max={monthEnd(ym)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Status" hint="Paid = money has moved. Planned = known and coming, but not paid yet.">
            <select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="paid">Paid</option>
              <option value="planned">Planned</option>
            </select>
          </Field>
          <Field label="Description (optional)">
            <input aria-label="Description" maxLength={80} placeholder="e.g. Tesco shop" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          </Field>
        </div>
        {sel && form.type !== "income" && (
          <p className="small muted" style={{ marginBottom: 8 }}>
            {names[form.catId]}: budget {sel.missing ? "not set" : fmt(sel.B)} · paid {fmt(sel.P)} · scheduled {fmt(sel.S)} · left in budget {fmt(sel.remaining)}. This transaction uses up the budget, it doesn't add on top.
          </p>
        )}
        {err && <Note tone="bad">{err}</Note>}
        <div className="actions">
          <button className="btn primary" onClick={submit}>{editId ? <><Check size={16} />Save changes</> : <><Plus size={16} />Add transaction</>}</button>
          {editId && <button className="btn" onClick={() => { setEditId(null); setErr(""); setForm(blank()); }}>Cancel</button>}
        </div>
      </Card>

      <Card title={`Transactions (${data.txns.length})`} aside={hasExamples ? <button className="btn small danger" onClick={removeExamples}><Trash2 size={14} />Remove all examples</button> : null}>
        {hasExamples && <Note tone="warn">Rows marked "Example" are sample data so you can see the dashboard react. They count in the totals until you remove them.</Note>}
        <div className="fields" style={{ marginBottom: 8 }}>
          <div className="seg" role="group" aria-label="Filter by type" style={{ marginBottom: 0 }}>
            {[["all", "All"], ["income", "Income"], ["expense", "Expenses"], ["savings", "Savings"]].map(([k, l]) => <button key={k} aria-pressed={fType === k} onClick={() => setFType(k)}>{l}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Filter by status" style={{ marginBottom: 0 }}>
            {[["all", "Any status"], ["paid", "Paid"], ["planned", "Planned"]].map(([k, l]) => <button key={k} aria-pressed={fStatus === k} onClick={() => setFStatus(k)}>{l}</button>)}
          </div>
          <input aria-label="Search transactions" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {list.length === 0 ? (
          <div>
            <p className="muted">{data.txns.length === 0 ? "No transactions yet. Add your first above, or load a few labelled examples to see how it works." : "No transactions match these filters."}</p>
            {data.txns.length === 0 && <div className="actions" style={{ marginTop: 8 }}><button className="btn" onClick={loadExamples}>Load example transactions</button></div>}
          </div>
        ) : (
          <ul className="tx-list">
            {list.map((t) => (
              <li className="tx" key={t.id}>
                <div className="tx-main">
                  <span className="tx-date">{shortDate(t.date)}</span>
                  <b>{t.desc}</b>
                  {t.example && <Chip tone="example">Example</Chip>}
                  <Chip>{t.type === "savings" ? "Saving" : t.type === "income" ? "Income" : "Expense"}</Chip>
                </div>
                <div className={`tx-amt ${t.type}`}>{t.type === "income" ? "+" : "−"}{fmt(t.amount)}</div>
                <div className="tx-meta">{names[t.catId] || "Unknown"}</div>
                <div className="tx-act">
                  <button className={`chip btn-chip ${t.status === "paid" ? "good" : "warn"}`} onClick={() => toggle(t.id)} aria-label={`${t.desc}: ${t.status}. Tap to switch.`}>{t.status === "paid" ? "Paid" : "Planned"}</button>
                  <button className="icon" aria-label={`Edit ${t.desc}`} onClick={() => edit(t)}><Pencil size={15} /></button>
                  <button className="icon" aria-label={`Delete ${t.desc}`} onClick={() => del(t.id)}><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {list.length > 0 && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Showing {list.length}: income paid {fmt(sum(list.filter((t) => t.type === "income" && t.status === "paid"), (t) => t.amount))} · spent {fmt(sum(list.filter((t) => t.type === "expense" && t.status === "paid"), (t) => t.amount))} · saved {fmt(sum(list.filter((t) => t.type === "savings" && t.status === "paid"), (t) => t.amount))} · planned (not yet paid) {fmt(sum(list.filter((t) => t.status === "planned"), (t) => t.amount))}
          </p>
        )}
      </Card>

      <Card title="Check against your bank">
        <p className="small muted" style={{ marginBottom: 8 }}>Type the balance your banking app shows (you type it yourself, nothing is connected). If it differs from what this app tracks, you've probably missed a transaction.</p>
        <div className="fields">
          <Field label="Balance in your banking app"><MoneyInput label="Bank balance" allowNegative nullable value={Number.isFinite(bankNum) ? bankNum : null} onChange={(v) => setBank(v === null ? "" : String(v))} /></Field>
          <div>
            <span className="lab small"><b>Tracked in this app</b></span>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(C.cash)}</div>
            {diff !== null && (Math.abs(diff) < 0.005 ? <Chip tone="good">Matches</Chip> : <Chip tone="warn">Bank is {fmt(Math.abs(diff))} {diff > 0 ? "higher" : "lower"}: look for unlogged {diff > 0 ? "income" : "spending"}</Chip>)}
          </div>
        </div>
      </Card>
    </>
  );
}
