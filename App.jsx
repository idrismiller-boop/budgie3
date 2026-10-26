import { useState, useEffect, useMemo, useRef } from "react";
import {
  STORE_KEY, defaultData, normalizeData, computeAll, todayISO, periodName,
  makeExamples, sum, n0, r2, uid,
} from "./calc.js";
import { ordinal } from "./format.js";
import { readRaw, writeRaw, storageAvailable, keepCorruptCopy, lastBackup, markBackup, requestPersistence } from "./storage.js";
import { useInstall } from "./install.js";
import { Dashboard } from "./Dashboard.jsx";
import { Plan } from "./Plan.jsx";
import { Log } from "./Log.jsx";
import { Payday } from "./Payday.jsx";
import { Weekly } from "./Weekly.jsx";
import { Scenarios } from "./Scenarios.jsx";
import { DataView } from "./DataView.jsx";

const TABS = [["dashboard", "Dashboard"], ["plan", "Plan"], ["log", "Log"], ["payday", "Payday"], ["weekly", "Weekly"], ["scenarios", "Scenarios"], ["data", "Data"]];

/* Read saved data synchronously so the first paint already has your numbers. */
function loadInitial() {
  if (!storageAvailable()) return { data: defaultData(), status: "unavailable", corrupt: false };
  const raw = readRaw();
  if (!raw) return { data: defaultData(), status: "saved", corrupt: false };
  try {
    return { data: normalizeData(JSON.parse(raw)), status: "saved", corrupt: false };
  } catch (e) {
    keepCorruptCopy(raw); // never silently destroy something we couldn't read
    return { data: defaultData(), status: "saved", corrupt: true };
  }
}

export default function App() {
  const initial = useRef(null);
  if (initial.current === null) initial.current = loadInitial();
  const [data, setData] = useState(initial.current.data);
  const [tab, setTab] = useState("dashboard");
  const [planSub, setPlanSub] = useState("settings");
  const [storage, setStorage] = useState(initial.current.status);
  const [notice, setNotice] = useState(initial.current.corrupt ? "Your saved data couldn't be read, so you're starting fresh. A copy of the unreadable data was kept on this device." : "");
  const [today, setToday] = useState(todayISO());
  const [backupAt, setBackupAt] = useState(lastBackup());
  const install = useInstall(); // always mounted: the browser fires its install event only once, early
  const canStore = storage !== "unavailable";
  const dataRef = useRef(data);
  dataRef.current = data;
  const timer = useRef(null);

  const notify = (m) => {
    setNotice(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(""), 5000);
  };
  const onBackup = () => { markBackup(); setBackupAt(lastBackup()); };

  /* Autosave shortly after each change; skip if nothing differs from what's stored. */
  useEffect(() => {
    if (!canStore) return;
    setStorage("saving");
    const t = setTimeout(() => {
      const s = JSON.stringify(data);
      if (readRaw() === s) { setStorage("saved"); return; }
      setStorage(writeRaw(s) ? "saved" : "error");
    }, 400);
    return () => clearTimeout(t);
  }, [data]);

  /* Phones kill background apps without warning: save immediately when the app is hidden or closed.
     When it comes back (maybe days later) refresh "today" so days-left and weeks are right. */
  useEffect(() => {
    const flush = () => {
      if (!canStore) return;
      const s = JSON.stringify(dataRef.current);
      if (readRaw() !== s) writeRaw(s);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else setToday(todayISO());
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  /* If the app is open in two tabs, pick up changes from the other one instead of overwriting them. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORE_KEY && e.newValue) {
        try { setData(normalizeData(JSON.parse(e.newValue))); } catch (err) { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* Ask once (politely, no UI) for storage the browser shouldn't evict. */
  useEffect(() => { requestPersistence(); }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const C = useMemo(() => computeAll(data, today), [data, today]);
  const update = (fn) => setData((d) => { const c = JSON.parse(JSON.stringify(d)); fn(c); return c; });
  const go = (t, s) => {
    setTab(t);
    if (s) setPlanSub(s);
    if (typeof window !== "undefined" && window.scrollTo) window.scrollTo({ top: 0 });
  };

  /* Marks a line paid. { one: true } pays just ONE occurrence of a repeating bill (e.g. this week's £20). */
  const markPaid = (group, id, opts = {}) => update((d) => {
    const type = group === "income" ? "income" : group === "savings" ? "savings" : "expense";
    const line = d[group].find((l) => l.id === id);
    if (!line) return;
    const budget = C.stats[id] ? C.stats[id].B : n0(line.amount);
    const verb = group === "income" ? "received" : group === "savings" ? "moved" : "paid";
    if (!opts.one) d.txns.forEach((t) => { if (t.catId === id && t.type === type && t.status === "planned") t.status = "paid"; });
    const P = sum(d.txns.filter((t) => t.catId === id && t.type === type && t.status === "paid"), (t) => t.amount);
    const left = r2(budget - P);
    const amount = opts.one ? Math.min(n0(line.amount), left) : left;
    if (amount > 0) d.txns.push({ id: uid(), date: C.ed.date, type, catId: id, desc: `${line.name} (marked ${verb})`, amount: r2(amount), status: "paid", example: false });
  });
  const removeLine = (group, id) => {
    const line = data[group].find((l) => l.id === id);
    if (!line) return;
    if (group === "savings" && line.kind === "emergency") return notify("The emergency fund line is needed for progress tracking, so it can't be deleted.");
    if (group === "income" && data.income.length <= 1) return notify("Keep at least one income line.");
    const used = data.txns.filter((t) => t.catId === id).length;
    if (used) return notify(`"${line.name}" has ${used} transaction${used > 1 ? "s" : ""}. Delete or recategorise them in the Log first.`);
    update((d) => { d[group] = d[group].filter((l) => l.id !== id); });
  };
  const loadExamples = () => { update((d) => { d.txns.push(...makeExamples(d)); }); notify("Example transactions added. They're labelled and removable."); };
  const removeExamples = () => { update((d) => { d.txns = d.txns.filter((t) => !t.example); }); notify("Examples removed."); };

  const pill = { saving: ["Saving…", ""], saved: ["Saved on this device", "ok"], error: ["Couldn't save: export a backup", "bad"], unavailable: ["Not saving: export to keep", "bad"] }[storage];
  const pd = data.settings.payday || 1;
  const mLabel = periodName(data.settings.month, pd);

  return (
    <div className="bd">
      <div className="wrap">
        <header className="top">
          <div>
            <h1>{mLabel}</h1>
            <p className="sub">{pd > 1 ? `Pay cycle (payday around the ${ordinal(pd)})` : "Monthly budget"} · GBP · {C.period.days} days</p>
          </div>
          <span className={`pill ${pill[1]}`} role="status">{pill[0]}</span>
        </header>
        <nav className="tabs" role="tablist" aria-label="Sections">
          {TABS.map(([k, l]) => <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => go(k)}>{l}</button>)}
        </nav>
        {tab === "dashboard" && <Dashboard data={data} C={C} update={update} go={go} markPaid={markPaid} backupAt={backupAt} notify={notify} />}
        {tab === "plan" && <Plan data={data} C={C} update={update} sub={planSub} setSub={setPlanSub} markPaid={markPaid} removeLine={removeLine} />}
        {tab === "log" && <Log data={data} C={C} update={update} notify={notify} loadExamples={loadExamples} removeExamples={removeExamples} markPaid={markPaid} />}
        {tab === "payday" && <Payday data={data} C={C} update={update} markPaid={markPaid} />}
        {tab === "weekly" && <Weekly data={data} C={C} />}
        {tab === "scenarios" && <Scenarios data={data} C={C} update={update} notify={notify} />}
        {tab === "data" && <DataView data={data} C={C} update={update} setData={setData} notify={notify} loadExamples={loadExamples} removeExamples={removeExamples} storage={storage} backupAt={backupAt} onBackup={onBackup} install={install} />}
      </div>
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}
