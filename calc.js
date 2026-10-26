/* Pure budgeting logic: no React, no browser APIs except Date. Unit-tested in tests/calc.test.mjs */
export const STORE_KEY = "budget-dashboard:v1";
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const r2 = (x) => {
  const v = Number(x);
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + (v >= 0 ? 1e-9 : -1e-9)) * 100) / 100;
};
export const n0 = (x) => {
  if (x === null || x === undefined || x === "") return 0;
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};
export const sum = (arr, f) => r2(arr.reduce((a, x) => a + n0(f ? f(x) : x), 0));
export const uid = () => "i" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const clone = (o) => JSON.parse(JSON.stringify(o));

/* ---------- dates (all ISO strings, no timezone maths) ---------- */
export const pad = (n) => String(n).padStart(2, "0");
export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const todayISO = () => {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
};
export const parseISO = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return { y, m, d };
};
export const isISO = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { y, m, d } = parseISO(s);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
export const daysInMonth = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
export const monthStart = (ym) => `${ym}-01`;
export const monthEnd = (ym) => `${ym}-${pad(daysInMonth(ym))}`;
export const nextMonth = (ym) => {
  let [y, m] = ym.split("-").map(Number);
  m += 1;
  if (m > 12) { m = 1; y += 1; }
  return `${y}-${pad(m)}`;
};
export const addMonths = (ym, k) => {
  let out = ym;
  for (let i = 0; i < k; i++) out = nextMonth(out);
  return out;
};
export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};
export const shortDate = (s) => {
  if (!isISO(s)) return "";
  const { m, d } = parseISO(s);
  return `${d} ${MONTHS[m - 1]}`;
};

/* ---------- defaults ---------- */
export const currentMonth = () => todayISO().slice(0, 7);
export const defaultData = (month) => ({
  version: 1,
  settings: {
    month: month || currentMonth(),
    asOf: "",
    openingCash: null,
    buffer: 50,
    holdBuffer: true,
    countExpected: false,
    scenarioPct: { cautious: 30, balanced: 50, ambitious: 70 },
  },
  income: [
    { id: "inc_salary", key: "salary", kind: "salary", name: "Salary (take-home)", amount: 2303, counted: true },
    { id: "inc_side", key: "side", kind: "side", name: "Side income", amount: 0, counted: false },
    { id: "inc_bonus", key: "bonus", kind: "bonus", name: "Bonuses", amount: 0, counted: false },
    { id: "inc_other", key: "other", kind: "other", name: "Other income", amount: 0, counted: false },
  ],
  fixed: [
    { id: "fx_rent", key: "rent", name: "Rent contribution", amount: 1000, due: null },
    { id: "fx_bills", key: "bills", name: "Bills contribution", amount: 188, due: null },
    { id: "fx_council", key: "council", name: "Council tax", amount: null, due: null },
    { id: "fx_phone", key: "phone", name: "Phone", amount: null, due: null },
    { id: "fx_subs", key: "subs", name: "Subscriptions", amount: null, due: null },
    { id: "fx_transport", key: "transport", name: "Transport (passes, season tickets)", amount: null, due: null },
    { id: "fx_other", key: "otherfixed", name: "Other regular payments", amount: null, due: null },
  ],
  variable: [
    { id: "vr_groceries", key: "groceries", name: "Groceries", amount: null, essential: true },
    { id: "vr_eating", key: "eating", name: "Eating out", amount: null, essential: false },
    { id: "vr_shopping", key: "shopping", name: "Shopping", amount: null, essential: false },
    { id: "vr_ent", key: "ent", name: "Entertainment", amount: null, essential: false },
    { id: "vr_music", key: "music", name: "Music & DJ", amount: null, essential: false },
    { id: "vr_travel", key: "travel", name: "Travel", amount: null, essential: false },
    { id: "vr_misc", key: "misc", name: "Miscellaneous", amount: null, essential: false },
  ],
  savings: [
    { id: "sv_ef", key: "emergency", kind: "emergency", name: "Emergency fund", amount: null, balance: null, target: 3000 },
    { id: "sv_goal", key: "goal", kind: "goal", name: "Other savings goal", amount: 0, balance: null, target: null },
    { id: "sv_invest", key: "invest", kind: "invest", name: "Investing (optional)", amount: 0, balance: null, target: null },
  ],
  txns: [],
  history: [],
  paydayChecks: {},
});

export const clampPct = (v, fb) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fb;
};

export const normalizeData = (raw) => {
  const base = defaultData();
  if (!raw || typeof raw !== "object") return base;
  const num = (v) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? r2(Number(v)) : null);
  const str = (v, fb) => (typeof v === "string" && v.trim() ? v.slice(0, 60) : fb);
  const rs = raw.settings || {};
  const settings = {
    month: typeof rs.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(rs.month) ? rs.month : base.settings.month,
    asOf: isISO(rs.asOf) ? rs.asOf : "",
    openingCash: num(rs.openingCash),
    buffer: rs.buffer === undefined ? base.settings.buffer : num(rs.buffer) ?? 0,
    holdBuffer: rs.holdBuffer !== false,
    countExpected: rs.countExpected === true,
    scenarioPct: {
      cautious: clampPct(rs.scenarioPct && rs.scenarioPct.cautious, 30),
      balanced: clampPct(rs.scenarioPct && rs.scenarioPct.balanced, 50),
      ambitious: clampPct(rs.scenarioPct && rs.scenarioPct.ambitious, 70),
    },
  };
  const lines = (arr, fb, mk) => (Array.isArray(arr) && arr.length ? arr : fb).slice(0, 40).map((l) => mk(l && typeof l === "object" ? l : {}));
  const income = lines(raw.income, base.income, (l) => ({
    id: str(l.id, uid()),
    key: typeof l.key === "string" ? l.key : undefined,
    kind: ["salary", "side", "bonus", "other"].includes(l.kind) ? l.kind : "other",
    name: str(l.name, "Income"),
    amount: num(l.amount) ?? 0,
    counted: l.counted === true,
  }));
  const fixed = lines(raw.fixed, base.fixed, (l) => ({
    id: str(l.id, uid()),
    key: typeof l.key === "string" ? l.key : undefined,
    name: str(l.name, "Payment"),
    amount: num(l.amount),
    due: Number.isInteger(l.due) && l.due >= 1 && l.due <= 31 ? l.due : null,
  }));
  const variable = lines(raw.variable, base.variable, (l) => ({
    id: str(l.id, uid()),
    key: typeof l.key === "string" ? l.key : undefined,
    name: str(l.name, "Category"),
    amount: num(l.amount),
    essential: l.essential === true,
  }));
  const savings = lines(raw.savings, base.savings, (l) => ({
    id: str(l.id, uid()),
    key: typeof l.key === "string" ? l.key : undefined,
    kind: ["emergency", "goal", "invest"].includes(l.kind) ? l.kind : "goal",
    name: str(l.name, "Savings"),
    amount: num(l.amount),
    balance: num(l.balance),
    target: num(l.target),
  }));
  if (!savings.some((l) => l.kind === "emergency")) savings.unshift(clone(base.savings[0]));
  const ids = new Set([...income, ...fixed, ...variable, ...savings].map((l) => l.id));
  const typeOk = ["income", "expense", "savings"];
  const txns = (Array.isArray(raw.txns) ? raw.txns : [])
    .slice(0, 5000)
    .filter((t) => t && typeOk.includes(t.type) && isISO(t.date) && Number.isFinite(Number(t.amount)) && Number(t.amount) > 0 && ids.has(t.catId))
    .map((t) => ({
      id: str(t.id, uid()),
      date: t.date,
      type: t.type,
      catId: t.catId,
      desc: typeof t.desc === "string" ? t.desc.slice(0, 80) : "",
      amount: r2(Number(t.amount)),
      status: t.status === "planned" ? "planned" : "paid",
      example: t.example === true,
    }));
  const history = (Array.isArray(raw.history) ? raw.history : []).slice(-36).map((h) => ({
    month: typeof h.month === "string" ? h.month : "",
    income: n0(h.income),
    expenses: n0(h.expenses),
    saved: n0(h.saved),
    rate: h.rate === null || h.rate === undefined ? null : n0(h.rate),
    efBalance: n0(h.efBalance),
  }));
  const pc = raw.paydayChecks && typeof raw.paydayChecks === "object" ? raw.paydayChecks : {};
  return {
    version: 1,
    settings,
    income,
    fixed,
    variable,
    savings,
    txns,
    history,
    paydayChecks: { bills: !!pc.bills, savings: !!pc.savings, weekly: !!pc.weekly, buffer: !!pc.buffer },
  };
};

/* ---------- the date the dashboard treats as "today" ---------- */
export const effective = (settings, nowISO) => {
  const s = monthStart(settings.month);
  const e = monthEnd(settings.month);
  const dim = daysInMonth(settings.month);
  const t = isISO(settings.asOf) ? settings.asOf : nowISO;
  if (t < s) return { date: s, state: "before", day: 0, daysRemaining: dim, dim, elapsed: 0 };
  if (t > e) return { date: e, state: "after", day: dim, daysRemaining: 0, dim, elapsed: dim };
  const day = parseISO(t).d;
  return { date: t, state: "during", day, daysRemaining: dim - day + 1, dim, elapsed: day };
};

/* ---------- planned vs actual for one budget line (no double counting) ----------
   B = budget, P = paid, S = scheduled (planned-status transactions).
   remaining = max(B - P, S): scheduled items live INSIDE the budget, they never add on top.
   projected = P + remaining = max(B, P + S).                                              */
export const lineStats = (line, txns) => {
  const mine = txns.filter((t) => t.catId === line.id);
  const B = n0(line.amount);
  const P = sum(mine.filter((t) => t.status === "paid"), (t) => t.amount);
  const S = sum(mine.filter((t) => t.status === "planned"), (t) => t.amount);
  const remaining = r2(Math.max(r2(B - P), S, 0));
  return { line, B, P, S, remaining, projected: r2(P + remaining), over: P > B ? r2(P - B) : 0, missing: line.amount === null || line.amount === undefined };
};

export const catStatus = (B, P, frac, state) => {
  if (B <= 0) return P > 0 ? "unbudgeted" : "none";
  if (P > B) return "over";
  if (P >= 0.8 * B) return "near";
  if (state === "during" && frac >= 0.15 && P > 0 && P > B * frac * 1.25) return "ahead";
  return "ok";
};

export const weekBlocks = (ym) => {
  const dim = daysInMonth(ym);
  const out = [];
  for (let s = 1, n = 1; s <= dim; s += 7, n++) {
    const e = Math.min(s + 6, dim);
    out.push({ n, startDay: s, endDay: e, start: `${ym}-${pad(s)}`, end: `${ym}-${pad(e)}`, days: e - s + 1 });
  }
  return out;
};

/* ---------- everything the dashboard needs ---------- */
export const computeAll = (data, nowISO) => {
  const { settings: st, income, fixed, variable, savings, txns } = data;
  const ed = effective(st, nowISO);
  const dim = ed.dim;
  const isPaid = (t) => t.status === "paid";
  const tI = txns.filter((t) => t.type === "income");
  const tE = txns.filter((t) => t.type === "expense");
  const tS = txns.filter((t) => t.type === "savings");

  const incomeL = income.map((l) => lineStats(l, tI));
  const fixedL = fixed.map((l) => lineStats(l, tE));
  const varL = variable.map((l) => lineStats(l, tE));
  const savL = savings.map((l) => lineStats(l, tS));
  const stats = {};
  [...incomeL, ...fixedL, ...varL, ...savL].forEach((x) => (stats[x.line.id] = x));

  const counted = incomeL.filter((x) => x.line.counted);
  const incomeReceived = sum(tI.filter(isPaid), (t) => t.amount);
  const incomePlanned = sum(counted, (x) => x.B);
  const incomeExpectedRemaining = sum(counted, (x) => x.remaining);
  const incomePossible = sum(incomeL.filter((x) => !x.line.counted), (x) => x.B);

  const expensesPaid = sum(tE.filter(isPaid), (t) => t.amount);
  const fixedPlanned = sum(fixedL, (x) => x.B);
  const fixedPaid = sum(fixedL, (x) => x.P);
  const fixedRemaining = sum(fixedL, (x) => x.remaining);
  const variablePlanned = sum(varL, (x) => x.B);
  const variablePaid = sum(varL, (x) => x.P);
  const variableRemaining = sum(varL, (x) => x.remaining);
  const essentialRemaining = sum(varL.filter((x) => x.line.essential), (x) => x.remaining);
  const essentialPlanned = sum(varL.filter((x) => x.line.essential), (x) => x.B);
  const discretionaryPlanned = sum(varL.filter((x) => !x.line.essential), (x) => x.B);
  const discretionaryRemaining = sum(varL.filter((x) => !x.line.essential), (x) => x.remaining);
  const expensesProjected = r2(sum(fixedL, (x) => x.projected) + sum(varL, (x) => x.projected));

  const savingsPlanned = sum(savL, (x) => x.B);
  const savingsActual = sum(savL, (x) => x.P);
  const savingsRemaining = sum(savL, (x) => x.remaining);

  const openingCash = n0(st.openingCash);
  const cash = r2(openingCash + incomeReceived - expensesPaid - savingsActual);
  const buffer = st.holdBuffer ? n0(st.buffer) : 0;
  const expectedIncome = st.countExpected ? incomeExpectedRemaining : 0;
  const pool = r2(cash + expectedIncome);
  const reserved = r2(fixedRemaining + savingsRemaining + essentialRemaining + buffer);
  const safe = r2(pool - reserved);
  const daily = ed.daysRemaining > 0 && safe > 0 ? r2(safe / ed.daysRemaining) : 0;

  const planAllocated = r2(fixedPlanned + variablePlanned + savingsPlanned);
  const planUnallocated = r2(incomePlanned - planAllocated - buffer);
  const savingsRateActual = incomeReceived > 0 ? savingsActual / incomeReceived : null;
  const savingsRatePlanned = incomePlanned > 0 ? savingsPlanned / incomePlanned : null;

  const efS = savL.find((x) => x.line.kind === "emergency");
  const efStart = n0(efS && efS.line.balance);
  const efBalance = r2(efStart + (efS ? efS.P : 0));
  const efTarget = n0(efS && efS.line.target);
  const efGap = Math.max(r2(efTarget - efBalance), 0);
  const efProgress = efTarget > 0 ? Math.min(efBalance / efTarget, 1) : 0;
  const efPlanned = efS ? efS.B : 0;
  const savBalances = savL.map((x) => ({ ...x, balanceNow: r2(n0(x.line.balance) + x.P) }));

  const essentialsCommitted = r2(fixedPlanned + essentialPlanned);

  const missing = [];
  if (st.openingCash === null || st.openingCash === undefined) missing.push({ key: "cash", label: "Current account balance", tab: "dashboard" });
  if (efS && (efS.line.balance === null || efS.line.balance === undefined)) missing.push({ key: "efbal", label: "Emergency fund balance", tab: "dashboard" });
  fixed.filter((l) => l.amount === null).forEach((l) => missing.push({ key: l.id, label: l.name, tab: "plan", sub: "fixed" }));
  variable.filter((l) => l.amount === null).forEach((l) => missing.push({ key: l.id, label: l.name, tab: "plan", sub: "variable" }));
  savings.filter((l) => l.kind === "emergency" && l.amount === null).forEach(() => missing.push({ key: "efplan", label: "Monthly emergency fund contribution", tab: "plan", sub: "savings" }));
  const budgetMissing = missing.filter((m) => m.tab === "plan").length;

  const upcoming = fixedL
    .filter((x) => x.remaining > 0)
    .map((x) => ({ id: x.line.id, name: x.line.name, due: x.line.due, remaining: x.remaining, line: x.line }))
    .sort((a, b) => (a.due || 99) - (b.due || 99));

  const catRows = [...fixedL, ...varL].filter((x) => x.B > 0 || x.P > 0).map((x) => ({ id: x.line.id, name: x.line.name, B: x.B, P: x.P }));

  /* weekly blocks (7-day blocks from the 1st) */
  const weeks = weekBlocks(st.month).map((w) => {
    const inW = (t) => t.date >= w.start && t.date <= w.end;
    const lines = varL.map((x) => {
      const mine = tE.filter((t) => t.catId === x.line.id && inW(t));
      const spent = sum(mine.filter(isPaid), (t) => t.amount);
      const scheduled = sum(mine.filter((t) => !isPaid(t)), (t) => t.amount);
      const budget = r2((x.B * w.days) / dim);
      return { id: x.line.id, name: x.line.name, essential: x.line.essential, budget, spent, scheduled, diff: r2(budget - spent) };
    });
    const fixedIds = new Set(fixed.map((l) => l.id));
    return {
      ...w,
      lines,
      budget: sum(lines, (l) => l.budget),
      spent: sum(lines, (l) => l.spent),
      scheduled: sum(lines, (l) => l.scheduled),
      fixedPaid: sum(tE.filter((t) => isPaid(t) && fixedIds.has(t.catId) && inW(t)), (t) => t.amount),
    };
  });
  const curWeek = ed.state === "before" ? 1 : ed.state === "after" ? weeks.length : Math.ceil(ed.day / 7);

  const varIds = new Set(variable.map((l) => l.id));
  const varPaidTx = tE.filter((t) => isPaid(t) && varIds.has(t.catId));
  const cumulative = [];
  for (let d = 1; d <= dim; d++) {
    const date = `${st.month}-${pad(d)}`;
    const hide = ed.state === "before" || (ed.state === "during" && d > ed.day);
    cumulative.push({ day: d, actual: hide ? null : sum(varPaidTx.filter((t) => t.date <= date), (t) => t.amount), pace: r2((variablePlanned * d) / dim) });
  }

  /* scenarios: only the money left after essentials + buffer can move */
  const poolRaw = r2(incomePlanned - essentialsCommitted - buffer);
  const flex = Math.max(poolRaw, 0);
  const efStartGap = Math.max(r2(efTarget - efStart), 0);
  const scenarios = [
    ["cautious", "Cautious"],
    ["balanced", "Balanced"],
    ["ambitious", "Ambitious"],
  ].map(([key, label]) => {
    const pct = n0(st.scenarioPct[key]);
    const save = r2((flex * pct) / 100);
    const spend = r2(flex - save);
    const months = save > 0 ? (efStartGap > 0 ? Math.ceil(efStartGap / save - 1e-9) : 0) : null;
    const reachLabel = months === null ? null : months === 0 ? null : monthLabel(addMonths(st.month, months - 1));
    const cap = efTarget > efStart ? efTarget : efStart;
    const proj = Array.from({ length: 13 }, (_, m) => ({ m, bal: r2(Math.min(efStart + save * m, cap)) }));
    return { key, label, pct, save, spend, spendWeek: r2(spend / (dim / 7)), months, reachLabel, proj, yearSaved: r2(save * 12), rate: incomePlanned > 0 ? save / incomePlanned : null };
  });

  const weeksInMonth = dim / 7;
  const payday = {
    income: incomePlanned,
    bills: fixedPlanned,
    savings: savingsPlanned,
    monthSpend: variablePlanned,
    perWeek: r2(variablePlanned / weeksInMonth),
    essentialPerWeek: r2(essentialPlanned / weeksInMonth),
    funPerWeek: r2(discretionaryPlanned / weeksInMonth),
    buffer,
    unallocated: r2(incomePlanned - fixedPlanned - savingsPlanned - variablePlanned - buffer),
  };

  return {
    ed, stats, incomeL, fixedL, varL, savL: savBalances, txnCount: txns.length,
    incomeReceived, incomePlanned, incomeExpectedRemaining, incomePossible,
    expensesPaid, expensesProjected, fixedPlanned, fixedPaid, fixedRemaining,
    variablePlanned, variablePaid, variableRemaining, essentialRemaining, essentialPlanned,
    discretionaryPlanned, discretionaryRemaining,
    savingsPlanned, savingsActual, savingsRemaining,
    cash, buffer, expectedIncome, pool, reserved, safe, daily, weekly: r2(daily * 7),
    planAllocated, planUnallocated, savingsRateActual, savingsRatePlanned,
    efBalance, efTarget, efGap, efProgress, efPlanned, efStart, essentialsCommitted,
    missing, budgetMissing, upcoming, catRows, weeks, curWeek, cumulative,
    flex, poolRaw, scenarios, payday,
  };
};

/* ---------- CSV ---------- */
export const csvCell = (v) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
};
export const unGuard = (s) => (/^'[=+\-@]/.test(s) ? s.slice(1) : s);

export const parseCSV = (text) => {
  const s = String(text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else inQ = false;
      } else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
};

export const txnsToCSV = (data) => {
  const names = {};
  [...data.income, ...data.fixed, ...data.variable, ...data.savings].forEach((l) => (names[l.id] = l.name));
  const head = ["date", "type", "category", "description", "amount", "status", "example"];
  const rows = [...data.txns]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.type, names[t.catId] || "", t.desc, t.amount.toFixed(2), t.status, t.example ? "yes" : ""]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
};

export const toISODate = (s) => {
  const t = s.trim();
  if (isISO(t)) return t;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // UK dd/mm/yyyy
  if (m) {
    const out = iso(Number(m[3]), Number(m[2]), Number(m[1]));
    return isISO(out) ? out : null;
  }
  return null;
};

export const csvToTxns = (text, data) => {
  const rows = parseCSV(text);
  const errors = [];
  if (rows.length < 2) return { good: [], errors: [{ row: 1, reason: "No data rows found." }], remapped: 0, total: 0 };
  const head = rows[0].map((h) => String(h).trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const absent = ["date", "type", "amount"].filter((n) => col(n) < 0);
  if (absent.length) return { good: [], errors: [{ row: 1, reason: `Missing column: ${absent.join(", ")}. Expected: date, type, category, description, amount, status.` }], remapped: 0, total: 0 };
  const ym = data.settings.month;
  const lo = monthStart(ym);
  const hi = monthEnd(ym);
  const groups = { income: data.income, expense: [...data.fixed, ...data.variable], savings: data.savings };
  const fallback = {
    income: data.income.find((l) => l.kind === "other") || data.income[0],
    expense: data.variable.find((l) => l.key === "misc") || data.variable[data.variable.length - 1] || data.fixed[0],
    savings: data.savings.find((l) => l.kind === "goal") || data.savings[0],
  };
  const good = [];
  let remapped = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (n) => (col(n) >= 0 && r[col(n)] !== undefined ? String(r[col(n)]).trim() : "");
    const line = i + 1;
    const date = toISODate(get("date"));
    if (!date) { errors.push({ row: line, reason: "Date not understood (use YYYY-MM-DD or DD/MM/YYYY)." }); continue; }
    if (date < lo || date > hi) { errors.push({ row: line, reason: `Date ${date} is outside ${monthLabel(ym)}.` }); continue; }
    let type = get("type").toLowerCase();
    if (type === "saving") type = "savings";
    if (!groups[type]) { errors.push({ row: line, reason: "Type must be income, expense or savings." }); continue; }
    const amt = parseFloat(get("amount").replace(/[£,\s]/g, ""));
    if (!Number.isFinite(amt) || amt === 0) { errors.push({ row: line, reason: "Amount is missing or not a number." }); continue; }
    const status = (get("status") || "paid").toLowerCase();
    if (!["paid", "planned"].includes(status)) { errors.push({ row: line, reason: "Status must be paid or planned." }); continue; }
    const cname = get("category").toLowerCase();
    let cat = groups[type].find((l) => l.name.trim().toLowerCase() === cname);
    if (!cat) { cat = fallback[type]; remapped++; }
    if (!cat) { errors.push({ row: line, reason: "No matching category." }); continue; }
    good.push({
      id: uid(), date, type, catId: cat.id,
      desc: unGuard(get("description")).slice(0, 80) || cat.name,
      amount: r2(Math.abs(amt)), status, example: get("example").toLowerCase() === "yes",
    });
  }
  return { good, errors, remapped, total: rows.length - 1 };
};

export const txnKey = (t) => [t.date, t.type, t.catId, t.amount.toFixed(2), t.desc, t.status].join("|");

/* ---------- JSON backup ---------- */
export const exportJSON = (data) => JSON.stringify({ app: "monthly-budget", version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
export const parseBackup = (text) => {
  try {
    const o = JSON.parse(text);
    const d = o && o.data ? o.data : o;
    if (!d || typeof d !== "object" || !Array.isArray(d.income) || !d.settings) return { ok: false, reason: "That JSON isn't a backup from this app." };
    return { ok: true, data: normalizeData(d) };
  } catch (e) {
    return { ok: false, reason: "That text isn't valid JSON." };
  }
};

/* ---------- labelled examples ---------- */
export const makeExamples = (d) => {
  const ym = d.settings.month;
  const spec = [
    ["income", d.income, "salary", "01", "Example: salary", 2303, "paid"],
    ["expense", d.fixed, "rent", "01", "Example: rent contribution", 1000, "paid"],
    ["expense", d.fixed, "bills", "01", "Example: bills contribution", 188, "paid"],
    ["savings", d.savings, "emergency", "02", "Example: transfer to emergency fund", 100, "paid"],
    ["expense", d.variable, "groceries", "03", "Example: supermarket shop", 42.18, "paid"],
    ["expense", d.variable, "eating", "07", "Example: lunch out", 14.5, "paid"],
    ["expense", d.variable, "groceries", "09", "Example: top-up shop", 18.6, "paid"],
    ["expense", d.variable, "music", "14", "Example: DJ cables (planned)", 30, "planned"],
  ];
  return spec
    .map(([type, arr, key, day, desc, amount, status]) => {
      const line = arr.find((l) => l.key === key);
      return line ? { id: uid(), date: `${ym}-${day}`, type, catId: line.id, desc, amount, status, example: true } : null;
    })
    .filter(Boolean);
};

/* ---------- start next month ---------- */
export const rollMonth = (data, nowISO) => {
  const C = computeAll(data, nowISO);
  const d = clone(data);
  d.history = [
    ...(d.history || []),
    { month: data.settings.month, income: C.incomeReceived, expenses: C.expensesPaid, saved: C.savingsActual, rate: C.savingsRateActual, efBalance: C.efBalance },
  ].slice(-36);
  d.savings = d.savings.map((l, i) => {
    const paid = C.savL[i].P;
    return { ...l, balance: l.balance === null && paid === 0 ? null : r2(n0(l.balance) + paid) };
  });
  d.settings.openingCash = data.settings.openingCash === null && data.txns.length === 0 ? null : C.cash;
  d.settings.month = nextMonth(data.settings.month);
  d.settings.asOf = "";
  d.txns = [];
  d.paydayChecks = {};
  return d;
};
