import * as L from "../src/lib/calc.js";
let pass = 0, fail = 0;
const eq = (a, b, msg) => { const ok = typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 0.005 : JSON.stringify(a) === JSON.stringify(b); if (ok) pass++; else { fail++; console.log("FAIL:", msg, "got", a, "expected", b); } };
const NOW = "2026-11-10";
const fresh = () => L.defaultData("2026-11");
const setAmt = (d, grp, key, v) => { d[grp].find(l => l.key === key).amount = v; };
const tx = (d, grp, key, type, amount, status, date = "2026-11-05") => { const l = d[grp].find(x => x.key === key); d.txns.push({ id: L.uid(), date, type, catId: l.id, desc: "t", amount, status, example: false }); };

// 1 defaults
let d = fresh(); let C = L.computeAll(d, "2026-10-26");
eq(C.ed.state, "before", "before state"); eq(C.ed.daysRemaining, 30, "30 days before month");
eq(C.incomePlanned, 2303, "planned income"); eq(C.fixedPlanned, 1188, "fixed planned");
eq(C.missing.length, 15, "15 missing figures"); eq(C.safe, -1238, "default safe");
eq(C.planUnallocated, 2303 - 1188 - 50, "plan unallocated");
eq(C.efTarget, 3000, "ef target"); eq(C.efBalance, 0, "ef bal");

// 2 opening cash + salary received
d = fresh(); d.settings.openingCash = 150; tx(d, "income", "salary", "income", 2303, "paid", "2026-11-01");
C = L.computeAll(d, NOW);
eq(C.cash, 2453, "cash after salary"); eq(C.safe, 2453 - 1188 - 50, "safe after salary");
// pay rent -> cash and bills remaining both fall: safe unchanged
const s1 = C.safe; tx(d, "fixed", "rent", "expense", 1000, "paid", "2026-11-01");
C = L.computeAll(d, NOW); eq(C.safe, s1, "paying a budgeted bill leaves safe-to-spend unchanged"); eq(C.fixedRemaining, 188, "bills remaining 188"); eq(C.cash, 1453, "cash 1453");

// 3 double counting
d = fresh(); d.settings.openingCash = 1000; setAmt(d, "variable", "groceries", 250);
tx(d, "variable", "groceries", "expense", 100, "paid"); tx(d, "variable", "groceries", "expense", 40, "planned");
C = L.computeAll(d, NOW); eq(C.stats[d.variable[0].id].remaining, 150, "planned sits inside budget");
const safeA = C.safe;
d.txns.find(t => t.status === "planned").status = "paid";
C = L.computeAll(d, NOW); eq(C.stats[d.variable[0].id].remaining, 110, "after paying planned"); eq(C.safe, safeA, "essential: planned->paid leaves safe unchanged");
// planned bigger than budget left
d.txns.push({ id: "z", date: "2026-11-20", type: "expense", catId: d.variable[0].id, desc: "big", amount: 200, status: "planned", example: false });
C = L.computeAll(d, NOW); eq(C.stats[d.variable[0].id].remaining, 200, "scheduled > budget left uses scheduled"); eq(C.stats[d.variable[0].id].projected, 340, "projected = P + S when over");
// overspend beyond budget
d.txns = []; tx(d, "variable", "groceries", "expense", 300, "paid");
C = L.computeAll(d, NOW); eq(C.stats[d.variable[0].id].remaining, 0, "no negative remaining"); eq(C.stats[d.variable[0].id].over, 50, "over by 50");

// 4 non essential: paying reduces safe
d = fresh(); d.settings.openingCash = 1500; setAmt(d, "variable", "eating", 100);
C = L.computeAll(d, NOW); const s2 = C.safe; tx(d, "variable", "eating", "expense", 30, "paid");
C = L.computeAll(d, NOW); eq(C.safe, s2 - 30, "non-essential spend lowers safe"); eq(C.discretionaryRemaining, 70, "discretionary remaining 70");

// 5 savings transfers
d = fresh(); d.settings.openingCash = 1000; setAmt(d, "savings", "emergency", 200);
C = L.computeAll(d, NOW); const s3 = C.safe; tx(d, "savings", "emergency", "savings", 200, "paid");
C = L.computeAll(d, NOW); eq(C.safe, s3, "moving planned savings leaves safe unchanged"); eq(C.savingsActual, 200, "actual savings"); eq(C.cash, 800, "cash after transfer"); eq(C.efBalance, 200, "ef balance incl. paid contribution");

// 6 daily guide & dates
d = fresh(); d.settings.openingCash = 5000; d.settings.asOf = "2026-11-10"; C = L.computeAll(d, "2026-10-01");
eq(C.ed.daysRemaining, 21, "21 days left incl. today"); eq(C.daily, L.r2(C.safe / 21), "daily guide");
d.settings.asOf = "2026-11-30"; C = L.computeAll(d, NOW); eq(C.ed.daysRemaining, 1, "last day has 1 day");
d.settings.asOf = "2026-12-05"; C = L.computeAll(d, NOW); eq(C.ed.state, "after", "after state"); eq(C.daily, 0, "no daily guide after month");

// 7 expected income toggle
d = fresh(); d.settings.openingCash = 0; C = L.computeAll(d, NOW); const noInc = C.safe;
d.settings.countExpected = true; C = L.computeAll(d, NOW); eq(C.safe, noInc + 2303, "counting expected salary adds 2303");
d.income[1].amount = 400; C = L.computeAll(d, NOW); eq(C.safe, noInc + 2303, "uncounted side income never added"); eq(C.incomePossible, 400, "possible extras");
// side income received counts as cash
tx(d, "income", "side", "income", 120, "paid"); C = L.computeAll(d, NOW); eq(C.incomeReceived, 120, "received side income"); eq(C.cash, 120, "cash includes side income");

// 8 savings rate
d = fresh(); setAmt(d, "savings", "emergency", 230.3); C = L.computeAll(d, NOW); eq(C.savingsRatePlanned, 0.1, "planned rate 10%");
d.settings.openingCash = 0; tx(d, "income", "salary", "income", 2303, "paid"); tx(d, "savings", "emergency", "savings", 115.15, "paid"); C = L.computeAll(d, NOW); eq(C.savingsRateActual, 0.05, "actual rate 5%");

// 9 weeks
const wb = L.weekBlocks("2026-11"); eq(wb.length, 5, "5 weeks"); eq(wb[4].days, 2, "last block 2 days"); eq(wb[0].start, "2026-11-01", "week1 start");
d = fresh(); setAmt(d, "variable", "eating", 120); setAmt(d, "variable", "groceries", 300); C = L.computeAll(d, NOW);
eq(Math.abs(C.weeks.reduce((a, w) => a + w.budget, 0) - 420) < 0.05, true, "weekly shares sum to monthly budget");
tx(d, "variable", "eating", "expense", 25, "paid", "2026-11-09"); tx(d, "variable", "eating", "expense", 10, "paid", "2026-11-20"); C = L.computeAll(d, NOW);
eq(C.weeks[1].spent, 25, "week 2 spent"); eq(C.weeks[2].spent, 10, "week 3 spent (20 Nov)"); eq(C.weeks[2].scheduled, 0, "w3 sched"); eq(C.curWeek, 2, "current week");
eq(C.cumulative[9].actual, 25, "cum day 10"); eq(C.cumulative[10].actual, null, "cum hidden after today");

// 10 payday
d = fresh(); setAmt(d, "variable", "groceries", 250); setAmt(d, "savings", "emergency", 200); C = L.computeAll(d, NOW);
eq(C.payday.unallocated, 2303 - 1188 - 200 - 250 - 50, "payday unallocated"); eq(C.payday.perWeek, L.r2(250 / (30 / 7)), "per week");

// 11 scenarios
d = fresh(); setAmt(d, "variable", "groceries", 250); d.savings[0].balance = 500; C = L.computeAll(d, NOW);
eq(C.essentialsCommitted, 1438, "essentials"); eq(C.poolRaw, 2303 - 1438 - 50, "flex pool 815");
const bal = C.scenarios[1]; eq(bal.save, L.r2(815 * 0.5), "balanced save"); eq(bal.save + bal.spend, 815, "save+spend=pool");
eq(bal.months, Math.ceil(2500 / bal.save), "months to target"); eq(bal.proj[12].bal, 3000, "capped at target");
eq(C.scenarios[0].save < C.scenarios[1].save && C.scenarios[1].save < C.scenarios[2].save, true, "scenario ordering");
d = fresh(); setAmt(d, "fixed", "rent", 2300); setAmt(d, "fixed", "bills", 188); C = L.computeAll(d, NOW); eq(C.flex, 0, "no flex when essentials exceed income"); eq(C.scenarios[2].save, 0, "ambitious saves 0 if no pool"); eq(C.scenarios[2].months, null, "no months");

// 12 CSV round trip
d = fresh(); d.settings.openingCash = 0; tx(d, "variable", "eating", "expense", 12.5, "paid", "2026-11-04");
d.txns[0].desc = 'Pizza, "large" =cmd'; tx(d, "income", "salary", "income", 2303, "paid", "2026-11-01"); d.txns[1].desc = "=HYPERLINK(1)";
const csv = L.txnsToCSV(d); eq(csv.includes("'=HYPERLINK(1)"), true, "formula guarded in export");
const imp = L.csvToTxns(csv, d); eq(imp.good.length, 2, "import 2 rows"); eq(imp.errors.length, 0, "no errors");
eq(imp.good.find(t => t.type === "expense").desc, 'Pizza, "large" =cmd', "quotes & commas survive");
eq(imp.good.find(t => t.type === "income").desc, "=HYPERLINK(1)", "guard removed on import");
const bad = L.csvToTxns("date,type,category,description,amount,status\n2026-12-01,expense,Groceries,x,5,paid\n03/11/2026,expense,Nonsense,y,£1,234.50,paid\n03/11/2026,expense,Nonsense,z,\"£1,234.50\",planned\n2026-11-05,food,Groceries,q,5,paid", d);
eq(bad.errors.length >= 2, true, "bad rows reported"); eq(bad.good.length, 1, "one good row (UK date, remapped)"); eq(bad.good[0].date, "2026-11-03", "UK date parsed"); eq(bad.good[0].amount, 1234.5, "£ and comma stripped"); eq(bad.remapped, 1, "remapped count");
eq(L.csvToTxns("a,b\n1,2", d).errors.length, 1, "missing columns reported");

// 13 normalize / backup
const n1 = L.normalizeData(JSON.parse(JSON.stringify(d))); eq(n1.txns.length, 2, "normalize keeps txns");
eq(L.normalizeData(null).income.length, 4, "normalize null -> defaults"); eq(L.normalizeData({ settings: {}, income: "x", txns: [{ type: "bad" }] }).txns.length, 0, "garbage txns dropped");
const pb = L.parseBackup(L.exportJSON(d)); eq(pb.ok, true, "backup parses"); eq(pb.data.txns.length, 2, "backup txns"); eq(L.parseBackup("nope").ok, false, "bad JSON rejected"); eq(L.parseBackup('{"x":1}').ok, false, "wrong JSON rejected");
const strip = L.normalizeData({ ...JSON.parse(JSON.stringify(d)), savings: [] }); eq(strip.savings.some(l => l.kind === "emergency"), true, "emergency line restored");

// 14 roll month
d = fresh(); d.settings.openingCash = 100; d.savings[0].balance = 400; setAmt(d, "savings", "emergency", 150);
tx(d, "income", "salary", "income", 2303, "paid", "2026-11-01"); tx(d, "fixed", "rent", "expense", 1000, "paid"); tx(d, "savings", "emergency", "savings", 150, "paid");
const before = L.computeAll(d, NOW); const nd = L.rollMonth(d, NOW);
eq(nd.settings.month, "2026-12", "next month"); eq(nd.txns.length, 0, "txns cleared"); eq(nd.savings[0].balance, 550, "ef balance rolled"); eq(nd.settings.openingCash, before.cash, "cash rolled"); eq(nd.history.length, 1, "history row"); eq(nd.history[0].saved, 150, "history saved"); eq(nd.income[0].amount, 2303, "plan kept");
const C2 = L.computeAll(nd, "2026-12-02"); eq(C2.efBalance, 550, "ef after roll"); eq(C2.cash, before.cash, "cash after roll");
eq(L.defaultData().settings.month, L.todayISO().slice(0,7), "default month follows today");
eq(L.normalizeData(null).settings.month, L.defaultData().settings.month, "normalize fallback = current month");
d = fresh(); eq(L.rollMonth(d, NOW).settings.openingCash, null, "unfilled opening cash stays unfilled");
d = fresh(); d.settings.month = "2026-12"; eq(L.rollMonth(d, NOW).settings.month, "2027-01", "year rollover");

// 15 examples
d = fresh(); const ex = L.makeExamples(d); eq(ex.length, 8, "8 examples"); eq(ex.every(t => t.example && t.desc.startsWith("Example")), true, "labelled");
d.txns = ex; C = L.computeAll(d, NOW); eq(C.incomeReceived, 2303, "example income"); eq(C.stats[d.variable[0].id].P, 60.78, "example groceries");
d.txns = d.txns.filter(t => !t.example); eq(d.txns.length, 0, "examples removable");

// 16 status helper
eq(L.catStatus(100, 120, .5, "during"), "over", "over"); eq(L.catStatus(100, 85, .9, "during"), "near", "near"); eq(L.catStatus(100, 60, .3, "during"), "ahead", "ahead"); eq(L.catStatus(100, 20, .5, "during"), "ok", "ok"); eq(L.catStatus(0, 5, .5, "during"), "unbudgeted", "unbudgeted");

// rounding
eq(L.r2(0.1 + 0.2), 0.3, "float"); eq(L.sum([0.1, 0.2, 0.3]), 0.6, "float sum");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
