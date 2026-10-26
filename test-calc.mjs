import * as L from "./calc.js";
let pass = 0, fail = 0;
const eq = (a, b, msg) => { const ok = typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 0.005 : JSON.stringify(a) === JSON.stringify(b); if (ok) pass++; else { fail++; console.log("FAIL:", msg, "got", a, "expected", b); } };
const NOW = "2026-11-10";
const fresh = () => { const d = L.defaultData("2026-11"); d.income[0].amount = 2303; return d; };
const setAmt = (d, grp, key, v) => { d[grp].find(l => l.key === key).amount = v; };
const tx = (d, grp, key, type, amount, status, date = "2026-11-05") => { const l = d[grp].find(x => x.key === key); d.txns.push({ id: L.uid(), date, type, catId: l.id, desc: "t", amount, status, example: false }); };

// 1 defaults
let d = L.defaultData("2026-11"); { const C0 = L.computeAll(d, "2026-10-26"); eq(C0.missing.length, 16, "pristine default: 16 blanks incl. pay"); eq(C0.missing.some(m => m.key === "pay"), true, "pay flagged blank"); eq(C0.incomePlanned, 0, "no pay assumed"); }
d = fresh(); let C = L.computeAll(d, "2026-10-26");
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
const wb = L.weekBlocks("2026-11-01", 30); eq(wb.length, 5, "5 weeks"); eq(wb[4].days, 2, "last block 2 days"); eq(wb[0].start, "2026-11-01", "week1 start"); eq(wb[4].end, "2026-11-30", "last week ends on the 30th");
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


// ===================== pay cycles =====================
eq(L.getPeriod({ month: "2026-11", payday: 1 }).end, "2026-11-30", "payday 1 = calendar month");
let P = L.getPeriod({ month: "2026-10", payday: 25 }); eq([P.start, P.end, P.days], ["2026-10-25", "2026-11-24", 31], "payday 25 cycle");
P = L.getPeriod({ month: "2027-02", payday: 31 }); eq([P.start, P.end], ["2027-02-28", "2027-03-30"], "payday 31 clamps in Feb");
// periods join up with no gaps/overlaps across a full year for awkward paydays
for (const pd of [1, 15, 25, 28, 30, 31]) { let ym = "2026-01", ok = true, prevEnd = null; for (let i = 0; i < 24; i++) { const p = L.getPeriod({ month: ym, payday: pd }); if (prevEnd && L.addDays(prevEnd, 1) !== p.start) ok = false; prevEnd = p.end; ym = L.nextMonth(ym); } eq(ok, true, "periods contiguous for payday " + pd); }
eq(L.periodKeyFor("2026-11-10", 25), "2026-10", "10 Nov belongs to cycle starting Oct"); eq(L.periodKeyFor("2026-11-25", 25), "2026-11", "25 Nov starts a new cycle"); eq(L.periodKeyFor("2026-01-03", 25), "2025-12", "year boundary"); eq(L.periodKeyFor("2026-11-10", 1), "2026-11", "payday 1");
eq(L.periodName("2026-10", 25), "25 Oct – 24 Nov 2026", "pay-cycle label"); eq(L.periodName("2026-12", 25), "25 Dec 2026 – 24 Jan 2027", "label across year"); eq(L.periodName("2026-11", 1), "November 2026", "calendar label");
d = fresh(); d.settings.month = "2026-10"; d.settings.payday = 25; d.settings.openingCash = 1000;
C = L.computeAll(d, "2026-11-10"); eq([C.ed.state, C.ed.day, C.ed.dim, C.ed.daysRemaining], ["during", 17, 31, 15], "mid-cycle day counting (10 Nov = day 17 of 31, 15 left)");
C = L.computeAll(d, "2026-10-20"); eq(C.ed.state, "before", "before cycle starts"); C = L.computeAll(d, "2026-11-25"); eq(C.ed.state, "after", "after cycle ends");
C = L.computeAll(d, "2026-11-10"); eq(C.weeks.length, 5, "31 days = 5 blocks"); eq([C.weeks[0].start, C.weeks[0].end, C.weeks[4].start, C.weeks[4].end, C.weeks[4].days], ["2026-10-25", "2026-10-31", "2026-11-22", "2026-11-24", 3], "week blocks follow the cycle"); eq(C.curWeek, 3, "current week index (day 17 -> week 3)");
eq(C.cumulative.length, 31, "31 chart points"); 
// transactions dated either side of the month boundary are both inside the cycle
d.variable[1].amount = 100; tx(d, "variable", "eating", "expense", 10, "paid", "2026-10-28"); tx(d, "variable", "eating", "expense", 20, "paid", "2026-11-03");
C = L.computeAll(d, "2026-11-10"); eq(C.stats[d.variable[1].id].P, 30, "both dates counted in cycle"); eq(C.weeks[0].spent, 10, "28 Oct in week 1"); eq(C.weeks[1].spent, 20, "3 Nov in week 2");
// CSV import range follows the cycle
let csvd = fresh(); csvd.settings.month = "2026-10"; csvd.settings.payday = 25;
let ci = L.csvToTxns("date,type,category,description,amount,status\n2026-10-26,expense,Groceries,a,5,paid\n2026-11-24,expense,Groceries,b,5,paid\n2026-10-24,expense,Groceries,c,5,paid\n2026-11-25,expense,Groceries,d,5,paid", csvd);
eq(ci.good.length, 2, "import keeps 26 Oct and 24 Nov"); eq(ci.errors.length, 2, "import rejects 24 Oct and 25 Nov"); eq(ci.errors[0].reason.includes("25 Oct – 24 Nov 2026"), true, "error names the cycle");
// examples land inside the cycle
{ const ex = L.makeExamples(csvd); eq(ex.every(t => t.date >= "2026-10-25" && t.date <= "2026-11-24"), true, "examples inside cycle"); }

// ===================== recurring bills =====================
const per = (m, pd) => L.getPeriod({ month: m, payday: pd });
const occ = (line, m, pd) => L.occurrences(line, per(m, pd));
eq(occ({ freq: "period", due: 1 }, "2026-10", 25), ["2026-11-01"], "monthly due on 1st lands in Nov in a 25th-cycle");
eq(occ({ freq: "period", due: 28 }, "2026-10", 25), ["2026-10-28"], "due 28th lands in Oct");
eq(occ({ freq: "period", due: 25 }, "2026-10", 25), ["2026-10-25"], "due on payday = first day"); eq(occ({ freq: "period", due: 24 }, "2026-10", 25), ["2026-11-24"], "due the day before payday = last day");
eq(occ({ freq: "period", due: 31 }, "2026-11", 1), ["2026-11-30"], "due 31st clamps to 30 Nov"); eq(occ({ freq: "period", due: null }, "2026-11", 1), [], "undated has no dates");
eq(occ({ freq: "weekly", anchor: "2026-11-02" }, "2026-11", 1).length, 5, "weekly x5 in Nov"); eq(occ({ freq: "weekly", anchor: "2026-11-02" }, "2026-11", 1)[4], "2026-11-30", "last weekly");
eq(occ({ freq: "weekly", anchor: "2027-03-01" }, "2026-11", 1), ["2026-11-02","2026-11-09","2026-11-16","2026-11-23","2026-11-30"], "weekly anchored in the future still projects back onto the same weekday");
eq(occ({ freq: "fortnightly", anchor: "2026-11-05" }, "2026-11", 1), ["2026-11-05", "2026-11-19"], "fortnightly"); eq(occ({ freq: "fourweekly", anchor: "2026-10-14" }, "2026-11", 1), ["2026-11-11"], "4-weekly");
eq(occ({ freq: "quarterly", anchor: "2026-08-15" }, "2026-11", 1), ["2026-11-15"], "quarterly lands Nov"); eq(occ({ freq: "quarterly", anchor: "2026-08-15" }, "2026-10", 1), [], "quarterly not due Oct");
eq(occ({ freq: "yearly", anchor: "2025-11-14" }, "2026-11", 1), ["2026-11-14"], "yearly lands this Nov"); eq(occ({ freq: "yearly", anchor: "2026-03-14" }, "2026-11", 1), [], "yearly not due in Nov"); eq(occ({ freq: "yearly", anchor: "2024-02-29" }, "2026-02", 1), ["2026-02-28"], "leap-day anchor clamps");
eq(occ({ freq: "quarterly", anchor: "2026-11-30" }, "2027-02", 1), ["2027-02-28"], "quarterly month-end clamp");
// budget maths for repeating bills
d = fresh(); d.settings.openingCash = 1000; d.fixed[3].amount = 20; d.fixed[3].freq = "weekly"; d.fixed[3].anchor = "2026-11-02";
C = L.computeAll(d, "2026-11-10"); let ph = C.stats[d.fixed[3].id]; eq([ph.B, ph.each, ph.occ.length], [100, 20, 5], "weekly 20 x 5 = 100 budget"); eq(C.fixedPlanned, 1188 + 100, "fixed total includes repeats");
tx(d, "fixed", "phone", "expense", 40, "paid"); C = L.computeAll(d, "2026-11-10"); ph = C.stats[d.fixed[3].id]; eq(ph.remaining, 60, "two weeks paid, 60 left");
let up = C.upcoming.find(u => u.id === d.fixed[3].id); eq([up.date, up.overdue, up.occCount, up.each], ["2026-11-16", false, 5, 20], "next unpaid occurrence is the 3rd (16 Nov), not yet overdue on the 10th");
C = L.computeAll(d, "2026-11-20"); up = C.upcoming.find(u => u.id === d.fixed[3].id); eq(up.overdue, true, "16 Nov unpaid is overdue on 20 Nov");
eq(C.schedule.filter(x => x.lineId === d.fixed[3].id).map(x => x.paid), [true, true, false, false, false], "schedule marks first two paid"); eq(C.schedule.filter(x => x.lineId === d.fixed[3].id && x.next).length, 1, "exactly one 'next' per line");
// not-due yearly bill adds nothing and is not unpaid
d = fresh(); d.fixed[4].amount = 240; d.fixed[4].freq = "yearly"; d.fixed[4].anchor = "2026-03-14"; C = L.computeAll(d, "2026-11-10"); eq(C.stats[d.fixed[4].id].B, 0, "yearly bill outside period costs 0"); eq(C.stats[d.fixed[4].id].notDue, true, "flagged not due"); eq(C.upcoming.some(u => u.id === d.fixed[4].id), false, "not in upcoming");
d.fixed[4].anchor = "2025-11-14"; C = L.computeAll(d, "2026-11-10"); eq(C.stats[d.fixed[4].id].B, 240, "yearly bill due this period"); eq(C.upcoming.find(u => u.id === d.fixed[4].id).date, "2026-11-14", "yearly date");
// repeating bills still protect safe-to-spend
d = fresh(); d.settings.openingCash = 1000; C = L.computeAll(d, "2026-11-10"); const sb = C.safe; d.fixed[3].amount = 20; d.fixed[3].freq = "weekly"; d.fixed[3].anchor = "2026-11-02"; C = L.computeAll(d, "2026-11-10"); eq(C.safe, sb - 100, "adding a weekly bill lowers safe-to-spend by its period total");

// ===================== monthly pay entry =====================
d = L.defaultData("2026-11"); d.settings.openingCash = 0; C = L.computeAll(d, "2026-11-10"); eq(C.incomePlanned, 0, "blank pay counts as 0 in plan"); eq(C.missing.some(m => m.key === "pay"), true, "blank pay is flagged");
d.income[0].amount = 2450.5; C = L.computeAll(d, "2026-11-10"); eq(C.incomePlanned, 2450.5, "typed pay used for plan"); eq(C.missing.some(m => m.key === "pay"), false, "pay flag cleared");
tx(d, "income", "salary", "income", 2450.5, "paid", "2026-11-01"); C = L.computeAll(d, "2026-11-10"); eq(C.incomeReceived, 2450.5, "pay received"); eq(C.incomeExpectedRemaining, 0, "nothing still to arrive");
// next period: pay is asked for, plan carries over, balance rolls
d.savings[0].balance = 100; let nd2 = L.rollMonth(d, "2026-11-30", { nextPay: 2600 }); eq(nd2.income[0].amount, 2600, "next period pay set from prompt"); eq(nd2.settings.month, "2026-12", "advanced one period"); eq(nd2.fixed[0].amount, 1000, "rent still planned");
nd2 = L.rollMonth(d, "2026-11-30", { nextPay: null }); eq(nd2.income[0].amount, null, "blank prompt leaves pay blank to be entered"); eq(L.computeAll(nd2, "2026-12-02").missing.some(m => m.key === "pay"), true, "blank pay flagged in new period");
nd2 = L.rollMonth(d, "2026-11-30"); eq(nd2.income[0].amount, 2450.5, "no option = pay unchanged (backwards compatible)"); eq(nd2.history[0].label, "November 2026", "history keeps its label");
d.settings.payday = 25; d.settings.month = "2026-10"; nd2 = L.rollMonth(d, "2026-11-30", { nextPay: 1 }); eq(nd2.history[0].label, "25 Oct – 24 Nov 2026", "pay-cycle history label"); eq(nd2.settings.month, "2026-11", "cycle advanced"); eq(nd2.settings.payday, 25, "payday kept");
// old saved data (no payday/freq/pay null) loads cleanly
{ const old = JSON.parse(JSON.stringify(fresh())); delete old.settings.payday; old.fixed.forEach(l => { delete l.freq; delete l.anchor; }); const n = L.normalizeData(old); eq(n.settings.payday, 1, "old data -> payday 1"); eq(n.fixed[0].freq, "period", "old data -> every period"); eq(n.income[0].amount, 2303, "old pay preserved"); eq(L.normalizeData({ ...old, settings: { ...old.settings, payday: 99 } }).settings.payday, 1, "bad payday rejected"); eq(L.normalizeData({ ...old, fixed: [{ ...old.fixed[0], freq: "hourly" }] }).fixed[0].freq, "period", "bad freq rejected"); }

// rounding
eq(L.r2(0.1 + 0.2), 0.3, "float"); eq(L.sum([0.1, 0.2, 0.3]), 0.6, "float sum");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
