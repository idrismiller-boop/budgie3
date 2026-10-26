import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><div id=root></div>", { url: "http://localhost/", pretendToBeVisual: true });
const w = dom.window;
globalThis.window = w; globalThis.document = w.document; Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true });
for (const k of ["HTMLElement","Node","Element","getComputedStyle","MutationObserver","Event","KeyboardEvent","MouseEvent","FileReader","Blob","requestAnimationFrame","cancelAnimationFrame"]) globalThis[k] = w[k];
globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
w.ResizeObserver = globalThis.ResizeObserver; w.scrollTo = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.localStorage = w.localStorage;
const KEY = "budget-dashboard:v1";
w.URL.createObjectURL = () => "blob:test"; w.URL.revokeObjectURL = () => {}; w.HTMLAnchorElement.prototype.click = function () {};
globalThis.URL = w.URL;
const errors = []; const oe = console.error; console.error = (...a) => { const s = a.map(String).join(" "); if (!/width\(0\)|height\(0\)/.test(s)) errors.push(s.slice(0, 300)); };
const React = (await import("react")).default;
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { build } = await import("esbuild");
await build({ entryPoints: ["src/App.jsx"], bundle: true, format: "esm", platform: "node", outfile: "tests/.app.bundle.mjs", jsx: "automatic", logLevel: "error", external: ["react", "react-dom", "recharts", "lucide-react"] });
const App = (await import("./.app.bundle.mjs")).default;
let root = createRoot(document.getElementById("root"));
const flush = async (ms = 700) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
await act(async () => { root.render(React.createElement(App)); }); await flush(50);
const $ = (s) => document.querySelector(s); const $$ = (s) => [...document.querySelectorAll(s)];
const text = () => document.body.textContent;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL:", m); } };
const setVal = async (el, v) => { const proto = el.tagName === "SELECT" ? w.HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype; const set = Object.getOwnPropertyDescriptor(proto, "value").set; await act(async () => { set.call(el, v); el.dispatchEvent(new w.Event(el.tagName==="SELECT"?"change":"input", { bubbles: true })); }); };
const click = async (el) => { await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true })); }); };
const tab = async (name) => { const b = $$("button[role=tab]").find(x => x.textContent === name); await click(b); };

const cur = new Date(); const curLabel = cur.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
ok(text().includes(curLabel), "title follows current month: " + curLabel);
// switch month via Plan -> Settings (no transactions yet, so it applies instantly)
await tab("Plan"); const mi = $("input[aria-label='Budget month']"); ok(!!mi, "month picker exists"); await setVal(mi, "2026-11"); await flush(50);
ok(text().includes("November 2026"), "month switched to November 2026");
await tab("Dashboard");
ok(text().includes("Fill in your figures"), "setup card shown");
ok(text().includes("£ – –"), "safe-to-spend withheld until cash entered");
// enter opening cash
const cash = $("input[aria-label='Current account balance']"); ok(!!cash, "cash input"); await setVal(cash, "2500"); await flush(50);
ok(!text().includes("£ – –"), "safe-to-spend appears"); 
ok(/£1,262\.00/.test(text()), "safe = 2500-1188-50 = 1262 shown: " + (text().match(/Safe to spend.{0,40}/)||[""])[0]);
// all tabs render
for (const t of ["Plan","Log","Payday","Weekly","Scenarios","Data","Dashboard"]) { await tab(t); ok(text().length > 200, "tab renders: " + t); }
// plan: set groceries
await tab("Plan"); await click($$(".seg button").find(b => b.textContent === "Variable spending"));
const gro = $("input[aria-label='Groceries monthly amount']"); ok(!!gro, "groceries amount"); await setVal(gro, "250"); await flush(50);
ok(/£250\.00/.test(text()), "groceries budget shows");
// log: add expense
await tab("Log");
await setVal($("select[aria-label=Category]"), $$("select[aria-label=Category] option").find(o => o.textContent === "Groceries").value);
await setVal($("input[aria-label=Amount]"), "40.50"); 
await click($$("button").find(b => b.textContent.includes("Add transaction"))); await flush(50);
ok(text().includes("−£40.50"), "txn listed");
ok(/budget £250\.00/.test(text()) || text().includes("Transactions (1)"), "txn counted");
await tab("Dashboard"); ok(/£40\.50/.test(text()), "expenses paid shows 40.50");
// weekly
await tab("Weekly"); ok(text().includes("Week 1"), "weekly");
// scenarios apply
await tab("Scenarios"); const useBtn = $$("button").find(b => b.textContent === "Use this plan" && !b.disabled); ok(!!useBtn, "apply button enabled"); if (useBtn) await click(useBtn); await flush(50);
await tab("Plan"); await click($$(".seg button").find(b => b.textContent === "Savings")); ok(/Emergency fund/.test(text()), "savings tab");
// payday
await tab("Payday"); const logSal = $$("button").find(b => b.textContent.includes("Log salary as received")); ok(!!logSal, "log salary button"); await click(logSal); await flush(50);
ok(text().includes("Salary logged"), "salary logged chip");
// examples
await tab("Data"); await click($$("button").find(b => b.textContent.includes("Load labelled example"))); await flush(50);
await tab("Log"); ok(text().includes("Example"), "examples labelled"); await click($$("button").find(b => b.textContent.includes("Remove all examples"))); await flush(50);
ok(!text().includes("Example: salary"), "examples removed");
// CSV export contains txn
await tab("Data"); const ta = $("textarea[aria-label='Export text']"); ok(ta.value.includes("date,type,category"), "csv header"); ok(ta.value.includes("40.50"), "csv has txn");
// import round trip: replace
const csv = ta.value; await setVal($("textarea[aria-label='Paste import data']"), csv + "\r\n2026-11-09,expense,Eating out,Pizza,12.00,paid\r\n2026-12-01,expense,Eating out,Late,5,paid");
await click($$("button").find(b => b.textContent === "Check data")); await flush(20);
ok(/valid/.test(text()) && /outside November 2026/.test(text()), "import report w/ out-of-month error");
await click($$("button").find(b => b.textContent === "Import now")); await flush(50);
await tab("Log"); ok(text().includes("Pizza"), "imported row appears");
// roll month
await tab("Data"); await click($$("button").find(b => b.textContent.startsWith("Start December"))); await click($$("button").find(b => b.textContent.startsWith("Yes, start December"))); await flush(700);
ok(text().includes("December 2026"), "rolled to December");
const saved = JSON.parse(w.localStorage.getItem(KEY)); ok(saved.settings.month === "2026-12" && saved.history.length === 1 && saved.txns.length === 0, "persisted after roll");
ok(!!w.localStorage.getItem(KEY), "autosave wrote to localStorage");
await tab("Dashboard"); ok(text().includes("Previous months"), "history table");
// reload: unmount and mount again, data must come back from storage
await act(async () => { root.unmount(); });
const root2 = createRoot(document.getElementById("root"));
await act(async () => { root2.render(React.createElement(App)); }); await flush(100);
ok(text().includes("December 2026"), "after reload: still December 2026 (persisted)");
await tab("Plan"); await click($$(".seg button").find(b => b.textContent === "Variable spending"));
ok($("input[aria-label='Groceries monthly amount']").value === "250", "after reload: groceries budget 250 persisted");
await tab("Data"); ok($("textarea[aria-label='Export text']").value.split("\n").length === 1, "after reload: new month has no transactions");

// --- PWA/local-storage specific checks ---
await tab("Dashboard"); ok(text().includes("isn't backed up"), "backup nudge shown when data exists and no backup");
await tab("Data");
ok(text().includes("Stored on this device only"), "local storage limitations explained");
ok(text().includes("Not backed up and not synced"), "states no backup/sync");
ok(text().includes("Install on your phone") && text().includes("Android (Chrome)"), "install card (non-iOS fallback)");
await click($$("button").find(b => b.textContent === "Full backup (JSON)"));
await click($$("button").find(b => b.textContent.includes("Download"))); await flush(20);
ok(!!w.localStorage.getItem("budget-dashboard:lastBackup"), "JSON download records backup time");
await tab("Dashboard"); ok(!text().includes("isn't backed up"), "nudge gone after backup");
// install prompt event
let prompted = false; const evt = new w.Event("beforeinstallprompt"); evt.prompt = () => { prompted = true; }; evt.userChoice = Promise.resolve({});
await act(async () => { w.dispatchEvent(evt); }); await tab("Data");
const ib = $$("button").find(b => b.textContent === "Install app"); ok(!!ib, "Install button appears on beforeinstallprompt"); if (ib) await click(ib); ok(prompted, "native install prompt invoked");
// flush on hide: change something then hide immediately (before debounce) and check storage
await tab("Plan"); await click($$(".seg button").find(b => b.textContent === "Variable spending"));
await setVal($("input[aria-label='Groceries monthly amount']"), "321");
Object.defineProperty(w.document, "visibilityState", { value: "hidden", configurable: true }); w.document.dispatchEvent(new w.Event("visibilitychange"));
ok(JSON.parse(w.localStorage.getItem(KEY)).variable[0].amount === 321, "saved immediately when app is hidden (no debounce wait)");
Object.defineProperty(w.document, "visibilityState", { value: "visible", configurable: true });
// corrupt data is preserved, not destroyed
await act(async () => { root2.unmount(); });
w.localStorage.setItem(KEY, "{not json");
const root3 = createRoot(document.getElementById("root"));
await act(async () => { root3.render(React.createElement(App)); }); await flush(50);
ok(text().includes("couldn't be read"), "corrupt data message");
ok(w.localStorage.getItem("budget-dashboard:corrupt-copy") === "{not json", "corrupt copy kept");
await flush(700);
console.error = oe;
console.log(`${pass} passed, ${fail} failed; console errors: ${errors.length}`); errors.slice(0, 5).forEach(e => console.log("  ERR:", e));
process.exit(fail ? 1 : 0);
