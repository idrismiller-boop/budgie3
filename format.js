import { r2, n0 } from "./calc.js";

export const fmt = (v) => {
  const n = r2(n0(v));
  const s = Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? "−£" : "£") + s;
};
export const pctTxt = (x) => (x === null || x === undefined ? "–" : Math.round(x * 100) + "%");
export const showNum = (v) => (v === null || v === undefined ? "" : Number.isInteger(v) ? String(v) : v.toFixed(2));
export const STATUS_TXT = { over: ["bad", "Over budget"], near: ["warn", "Nearly used"], ahead: ["warn", "Ahead of pace"], unbudgeted: ["warn", "No budget set"], ok: ["good", "On track"] };
