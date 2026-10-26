/* Local-only persistence. Everything lives in this browser's localStorage on THIS device.
   Nothing is sent to any server. No analytics, no tracking, no bank connections. */
import { STORE_KEY } from "./calc.js";

const BACKUP_KEY = "budget-dashboard:lastBackup";
const CORRUPT_KEY = "budget-dashboard:corrupt-copy";

export function storageAvailable() {
  try {
    const k = "__budget_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}
export function readRaw() {
  try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; }
}
export function writeRaw(s) {
  try { localStorage.setItem(STORE_KEY, s); return true; } catch (e) { return false; }
}
export function keepCorruptCopy(raw) {
  try { localStorage.setItem(CORRUPT_KEY, raw); } catch (e) { /* ignore */ }
}
export function markBackup() {
  try { localStorage.setItem(BACKUP_KEY, new Date().toISOString()); } catch (e) { /* ignore */ }
}
export function lastBackup() {
  try { return localStorage.getItem(BACKUP_KEY); } catch (e) { return null; }
}
export function clearAll() {
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(CORRUPT_KEY);
  } catch (e) { /* ignore */ }
}

/* Ask the browser not to evict our data when the device is low on space. Best effort: browsers may say no. */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch (e) { /* ignore */ }
  return false;
}
export async function isPersisted() {
  try {
    if (navigator.storage && navigator.storage.persisted) return await navigator.storage.persisted();
  } catch (e) { /* ignore */ }
  return false;
}
