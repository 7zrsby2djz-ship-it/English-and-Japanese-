// 只保存「教室入口」設定。不保存學習進度。所有讀寫都包 try/catch。
// Only the classroom-door setting lives here. Never learning progress.
import { readClassroomSetting } from "./classroom_url.mjs";

export const SETTING_KEY = "weichuan-language-door:v1";
export const DRAFT_KEY = "weichuan-language-door:v1:draft";

/** @returns {{state:"none"} | {state:"ok", setting:object} | {state:"corrupt"} | {state:"unavailable"}} */
export function loadSetting() {
  let raw;
  try {
    raw = window.localStorage.getItem(SETTING_KEY);
  } catch {
    return { state: "unavailable" };
  }
  if (raw === null) return { state: "none" };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { state: "corrupt" }; }
  const result = readClassroomSetting(parsed);
  return result.ok ? { state: "ok", setting: result.setting } : { state: "corrupt" };
}

/** @returns {boolean} true only when the write really succeeded and reads back. */
export function saveSetting(setting) {
  try {
    const value = JSON.stringify(setting);
    window.localStorage.setItem(SETTING_KEY, value);
    return window.localStorage.getItem(SETTING_KEY) === value;
  } catch {
    return false;
  }
}

/** Removes only this app's keys; never clears the whole browser storage. */
export function clearSetting() {
  try { window.localStorage.removeItem(SETTING_KEY); } catch { return false; }
  clearDraft();
  return true;
}

export function loadDraft() {
  try { return window.sessionStorage.getItem(DRAFT_KEY); } catch { return null; }
}
export function saveDraft(text) {
  try { window.sessionStorage.setItem(DRAFT_KEY, text); return true; } catch { return false; }
}
export function clearDraft() {
  try { window.sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}
