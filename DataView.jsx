import { useState, useMemo, useRef, useEffect } from "react";
import { Trash2, Download, Upload, Copy, RotateCcw } from "lucide-react";
import { todayISO, nextMonth, monthLabel, defaultData, txnsToCSV, csvToTxns, txnKey, exportJSON, parseBackup, rollMonth } from "../lib/calc.js";
import { fmt, pctTxt } from "../lib/format.js";
import { Card, Note } from "../components/ui.jsx";
import { requestPersistence, isPersisted, clearAll } from "../lib/storage.js";

/* ================= Data: export, import, new month, reset ================= */
export function DataView({ data, C, update, setData, notify, loadExamples, removeExamples, storage, backupAt, onBackup, install }) {
  const [persisted, setPersisted] = useState(null);
  useEffect(() => { isPersisted().then(setPersisted); }, []);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const [fmtSel, setFmtSel] = useState("csv");
  const exportText = useMemo(() => (fmtSel === "csv" ? txnsToCSV(data) : exportJSON(data)), [data, fmtSel]);
  const taRef = useRef(null);
  const [text, setText] = useState("");
  const [report, setReport] = useState(null);
  const [mode, setMode] = useState("append");
  const [confirmRoll, setConfirmRoll] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const hasExamples = data.txns.some((t) => t.example);
  const nextLabel = monthLabel(nextMonth(data.settings.month));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      if (fmtSel === "json") onBackup();
      notify("Copied to clipboard.");
    } catch (e) {
      if (taRef.current) taRef.current.select();
      notify("Couldn't copy automatically. The text is selected: press Ctrl/Cmd+C.");
    }
  };
  const download = () => {
    try {
      const blob = new Blob([exportText], { type: fmtSel === "csv" ? "text/csv" : "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-${data.settings.month}.${fmtSel}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (fmtSel === "json") onBackup();
      notify("Download started. If nothing appears, use Copy and paste into a text file.");
    } catch (e) {
      notify("Downloads are blocked here. Use Copy and paste into a text file.");
    }
  };
  const share = async () => {
    try {
      const file = new File([exportText], `budget-${data.settings.month}.${fmtSel}`, { type: fmtSel === "csv" ? "text/csv" : "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Budget export" });
        if (fmtSel === "json") onBackup();
      } else notify("File sharing isn't supported here. Use Download or Copy.");
    } catch (e) {
      if (!e || e.name !== "AbortError") notify("Sharing failed. Use Download or Copy instead.");
    }
  };
  const protect = async () => {
    const ok = await requestPersistence();
    setPersisted(await isPersisted());
    notify(ok ? "Your browser agreed to protect this data from automatic clean-up." : "The browser declined (it decides). Keep regular backups instead.");
  };
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 2000000) { notify("That file is too large (2 MB limit)."); return; }
    const rd = new FileReader();
    rd.onload = () => { setText(String(rd.result || "")); setReport(null); };
    rd.readAsText(f);
    e.target.value = "";
  };
  const check = () => {
    const t = text.trim();
    if (!t) { setReport({ ok: false, msg: "Paste your data or choose a file first." }); return; }
    if (t.startsWith("{")) {
      const r = parseBackup(t);
      if (!r.ok) setReport({ ok: false, msg: r.reason });
      else setReport({ ok: true, kind: "json", data: r.data, msg: `Backup found for ${monthLabel(r.data.settings.month)}: ${r.data.txns.length} transactions. Restoring replaces everything currently in the app.` });
    } else {
      const r = csvToTxns(t, data);
      setReport({ ok: r.good.length > 0, kind: "csv", ...r, msg: `${r.good.length} of ${r.total} rows are valid${r.remapped ? `, ${r.remapped} with an unknown category moved to a default one` : ""}${r.errors.length ? `, ${r.errors.length} skipped` : ""}.` });
    }
  };
  const apply = () => {
    if (!report || !report.ok) return;
    if (report.kind === "json") {
      setData(report.data);
      notify("Backup restored.");
    } else {
      update((d) => {
        if (mode === "replace") { d.txns = report.good; }
        else {
          const seen = new Set(d.txns.map(txnKey));
          const fresh = report.good.filter((t) => !seen.has(txnKey(t)));
          d.txns.push(...fresh);
        }
      });
      notify(mode === "replace" ? `Replaced transactions with ${report.good.length} imported rows.` : `Imported ${report.good.length} rows (exact duplicates of existing rows are skipped).`);
    }
    setReport(null);
    setText("");
  };
  const roll = () => {
    setData(rollMonth(data, todayISO()));
    setConfirmRoll(false);
    notify(`Started ${nextLabel}. Your plan and savings balances carried over.`);
  };
  const wipe = () => {
    clearAll();
    setData(defaultData());
    setConfirmWipe(false);
    notify("Everything was reset to the starting figures.");
  };

  const storageMsg = {
    saved: "Saved automatically on this device. It will still be here next time you open the app.",
    saving: "Saving…",
    
        unavailable: "This browser is blocking local storage (private browsing can do this), so nothing is kept between visits. Export a backup (JSON) before you close, and import it next time.",
    error: "The last save didn't work. Export a backup now so you don't lose anything.",
  }[storage];

  return (
    <>
      <Card title="Where your data lives">
        <Note tone={storage === "unavailable" || storage === "error" ? "warn" : "info"}>{storageMsg}</Note>
        <ul className="list small">
          <li><b>Stored on this device only.</b> Your figures live in this browser's local storage. Nothing is uploaded: there are no accounts, no analytics, no tracking and no bank connections.</li>
          <li><b>Not backed up and not synced.</b> Another phone or computer starts empty, and nothing is copied to the cloud. Move data between devices with a JSON backup (Export, then Import).</li>
          <li><b>It can be lost</b> if you clear the site's data or browsing history, remove the app and its data, reset or lose the phone, or the browser frees space on a low-storage device.</li>
          <li><b>Browser and installed app can hold separate copies.</b> On iPhone the Home Screen app does not see what you entered in Safari. Install first, then enter your data, or export from Safari and import into the app.</li>
          <li><b>The web address matters.</b> Data belongs to this exact address. If you move the app to a new address, export first and import there.</li>
          <li>Updating the app never touches your data. It is kept separately from the app's files.</li>
        </ul>
        <div className="row-between" style={{ marginTop: 10 }}>
          <span className="small">Last full backup (JSON): <b>{backupAt ? new Date(backupAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "never"}</b></span>
          <span className="small">Protected from automatic clean-up: <b>{persisted === null ? "checking…" : persisted ? "yes" : "not guaranteed"}</b>{persisted === false && <> <button className="btn small" onClick={protect} style={{ marginLeft: 6 }}>Ask browser</button></>}</span>
        </div>
      </Card>

      <Card title="Install on your phone">
        {install.installed ? (
          <Note tone="good">You're running the installed app.</Note>
        ) : install.canPrompt ? (
          <div className="actions"><button className="btn primary" onClick={install.promptInstall}>Install app</button></div>
        ) : install.ios ? (
          <ol className="list small">
            <li>Open this page in <b>Safari</b> (not inside another app).</li>
            <li>Tap the <b>Share</b> button, then <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            <li>Open the new Budget icon. Do this before entering data, because the Home Screen app keeps its own storage.</li>
          </ol>
        ) : (
          <p className="small muted">Android (Chrome): open the browser menu (⋮) and choose <b>Install app</b> or <b>Add to Home screen</b>. If the Install button isn't offered yet, use the site for a minute and try again. It needs a secure (https) address.</p>
        )}
      </Card>

      <Card title={`Start ${nextLabel}`}>
        <p className="small muted" style={{ marginBottom: 8 }}>Close out {monthLabel(data.settings.month)}: income {fmt(C.incomeReceived)}, spent {fmt(C.expensesPaid)}, saved {fmt(C.savingsActual)} ({pctTxt(C.savingsRateActual)}).</p>
        <ul className="list small" style={{ marginBottom: 10 }}>
          <li><b>Kept:</b> all your budget amounts, categories, due days, settings and previous-month history.</li>
          <li><b>Rolled forward:</b> savings balances (plus what you moved this month) and your account balance ({fmt(C.cash)} as tracked).</li>
          <li><b>Cleared:</b> this month's transactions, including any planned ones not yet paid, and the payday ticks.</li>
        </ul>
        {!confirmRoll ? (
          <button className="btn primary" onClick={() => setConfirmRoll(true)}><RotateCcw size={16} />Start {nextLabel}…</button>
        ) : (
          <Note tone="warn">
            <p>Export a backup first if you want to keep this month's transactions. Then confirm.</p>
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={roll}>Yes, start {nextLabel}</button>
              <button className="btn" onClick={() => setConfirmRoll(false)}>Cancel</button>
            </div>
          </Note>
        )}
      </Card>

      <Card title="Export">
        <div className="seg" role="group" aria-label="Export format">
          <button aria-pressed={fmtSel === "csv"} onClick={() => setFmtSel("csv")}>Transactions (CSV)</button>
          <button aria-pressed={fmtSel === "json"} onClick={() => setFmtSel("json")}>Full backup (JSON)</button>
        </div>
        <textarea ref={taRef} readOnly aria-label="Export text" value={exportText} onFocus={(e) => e.target.select()} />
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn" onClick={copy}><Copy size={16} />Copy</button>
          <button className="btn" onClick={download}><Download size={16} />Download</button>
          {canShare && <button className="btn" onClick={share}>Share / save to Files</button>}
        </div>
      </Card>

      <Card title="Import">
        <p className="small muted" style={{ marginBottom: 8 }}>Paste a CSV (columns: date, type, category, description, amount, status) or a JSON backup. UK dates (DD/MM/YYYY) work. Rows dated outside {monthLabel(data.settings.month)} are skipped. Unknown categories go to Miscellaneous (or the default income/savings line). Missing status means paid.</p>
        <textarea aria-label="Paste import data" placeholder="Paste CSV or JSON here" value={text} onChange={(e) => { setText(e.target.value); setReport(null); }} />
        <div className="actions" style={{ marginTop: 8, alignItems: "center" }}>
          <label className="btn"><Upload size={16} />Choose file<input type="file" accept=".csv,.json,.txt,text/csv,application/json" onChange={onFile} style={{ display: "none" }} /></label>
          <button className="btn" onClick={check}>Check data</button>
        </div>
        {report && (
          <div style={{ marginTop: 10 }}>
            <Note tone={report.ok ? "good" : "bad"}>{report.msg}</Note>
            {report.kind === "csv" && report.errors && report.errors.length > 0 && (
              <ul className="list small" style={{ marginBottom: 10 }}>
                {report.errors.slice(0, 6).map((e, i) => <li key={i}>Row {e.row}: {e.reason}</li>)}
                {report.errors.length > 6 && <li>…and {report.errors.length - 6} more.</li>}
              </ul>
            )}
            {report.ok && (
              <div className="actions" style={{ alignItems: "center" }}>
                {report.kind === "csv" && (
                  <select aria-label="Import mode" value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: "auto" }}>
                    <option value="append">Add to my transactions</option>
                    <option value="replace">Replace all my transactions</option>
                  </select>
                )}
                <button className="btn primary" onClick={apply}>{report.kind === "json" ? "Restore backup" : "Import now"}</button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Example data and reset">
        <div className="actions">
          {!hasExamples ? <button className="btn" onClick={loadExamples}>Load labelled example transactions</button> : <button className="btn danger" onClick={removeExamples}><Trash2 size={16} />Remove all examples</button>}
          {!confirmWipe ? <button className="btn danger" onClick={() => setConfirmWipe(true)}>Erase everything…</button> : (
            <>
              <button className="btn danger" onClick={wipe}>Yes, erase everything</button>
              <button className="btn" onClick={() => setConfirmWipe(false)}>Cancel</button>
            </>
          )}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>Erasing resets every figure to the starting defaults. Export a backup first if you might want it back.</p>
      </Card>
    </>
  );
}

