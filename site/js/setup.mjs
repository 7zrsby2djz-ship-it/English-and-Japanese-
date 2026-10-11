// 一次性設定頁：貼網址 → 檢查 → 保存 → 進教室。
// Setup page. URL policy lives in classroom_url.mjs; copy lives in ui_copy.mjs.
import copy from "./ui_copy.mjs";
import { assessClassroomUrl, createClassroomSetting } from "./classroom_url.mjs";
import { loadSetting, saveSetting, clearSetting, loadDraft, saveDraft, clearDraft } from "./storage.mjs";

const $ = id => document.getElementById(id);
const get = path => path.split(".").reduce((o, k) => (o == null ? o : o[k]), copy);

// 1. 填入文字（只用 textContent，不把文字當 HTML）。
for (const node of document.querySelectorAll("[data-copy]")) {
  const text = get(node.dataset.copy);
  if (typeof text === "string") node.textContent = text;
}
document.title = copy.setup.pageTitle;
const fillList = (ol, items) => ol.replaceChildren(...items.map(t => {
  const li = document.createElement("li"); li.textContent = t; return li;
}));
fillList($("iphone-steps"), copy.setup.iphoneSteps);
fillList($("new-steps"), copy.setup.newClassroomSteps);
$("prompt-text").textContent = copy[copy.setup.newClassroomPromptSource]; // setupPrompt
$("manual-prompt").value = copy.setupPrompt;
$("skip-link").href = copy.setup.skipHomeUrl;

// 2. 錯誤代碼 → 頁面文案。
const reasonCopy = {
  missing_url: "missingUrl",
  invalid_input: "invalidUrl",
  invalid_url: "invalidUrl",
  invalid_characters: "invalidUrl",
  invalid_path_encoding: "invalidUrl",
  ambiguous_path: "invalidUrl",
  unsafe_protocol: "unsafeUrl",
  credentials_not_allowed: "unsafeUrl",
  non_default_port: "unsafeUrl",
  sensitive_query: "unsafeUrl",
  legacy_domain_recopy: "legacyDomain",
  unapproved_host: "unapprovedHost",
  shared_url: "sharedUrl",
  non_classroom_route: "notConversation",
  not_a_conversation: "notConversation",
  missing_conversation_id: "missingConversationId"
};

const input = $("chat-url");
const errorBox = $("url-error");
const confirmPanel = $("confirm-panel");
const checkLink = $("check-link");
const confirmButton = $("confirm-button");
const storagePanel = $("storage-panel");
const loadStatus = $("load-status");
const saveButton = $("save-button");
const clearZone = $("clear-zone");

// 試開確認只綁定「這一個」完整網址；欄位一改就清掉。只存在記憶體，不寫進草稿。
let openedHref = null;

function showError(reason) {
  errorBox.textContent = copy.errors[reasonCopy[reason] || "invalidUrl"];
  input.setAttribute("aria-invalid", "true");
  input.focus();
}
function resetTransient() {
  errorBox.textContent = "";
  input.removeAttribute("aria-invalid");
  confirmPanel.hidden = true;
  confirmButton.hidden = true;
  checkLink.removeAttribute("href");
  storagePanel.hidden = true;
  openedHref = null;
}

function finish(result) {
  if (!result.ok) {
    if (result.assessment.kind === "reject") showError(result.assessment.reason);
    return;
  }
  const href = result.setting.chatUrl;
  if (saveSetting(result.setting)) {
    clearDraft();
    window.location.assign(href); // 同分頁前往，能用上一頁返回
    return;
  }
  // 保存失敗：不假裝成功，但這次仍可進教室。
  confirmPanel.hidden = true;
  $("storage-go").href = href;
  storagePanel.hidden = false;
  $("storage-text").focus();
}

$("url-form").addEventListener("submit", event => {
  event.preventDefault();
  resetTransient();
  const assessment = assessClassroomUrl(input.value);
  if (assessment.kind === "reject") return showError(assessment.reason);
  if (assessment.kind === "confirm") {
    checkLink.href = assessment.href;
    confirmPanel.hidden = false;
    $("confirm-text").focus();
    return;
  }
  finish(createClassroomSetting(input.value));
});

checkLink.addEventListener("click", () => {
  // 使用者親手點擊才開新分頁；設定頁保留在原分頁。
  openedHref = checkLink.href;
  confirmButton.hidden = false;
});

confirmButton.addEventListener("click", () => {
  const assessment = assessClassroomUrl(input.value);
  if (assessment.kind !== "confirm" || assessment.href !== openedHref) {
    resetTransient();
    return;
  }
  finish(createClassroomSetting(input.value, openedHref));
});

input.addEventListener("input", () => {
  resetTransient();
  saveDraft(input.value); // 失敗也沒關係：值仍在頁面上
});

// 3. 複製啟動文字：成功才顯示「已複製」；失敗就給可手動選取的文字框。
$("copy-button").addEventListener("click", async () => {
  const status = $("copy-status");
  status.textContent = "";
  try {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") throw new Error("no clipboard");
    await navigator.clipboard.writeText(copy.setupPrompt);
    $("manual-copy").hidden = true;
    status.textContent = copy.setup.copied;
  } catch {
    $("manual-copy").hidden = false;
    status.textContent = copy.setup.copyFallback;
    $("manual-prompt").focus();
    $("manual-prompt").select();
  }
});

// 4. 清除：只刪本App的key。
$("clear-button").addEventListener("click", () => {
  clearSetting();
  resetTransient();
  input.value = "";
  saveButton.textContent = copy.setup.saveAction;
  clearZone.hidden = true;
  loadStatus.textContent = copy.setup.cleared;
});

// 5. 開頁狀態。
const loaded = loadSetting();
const draft = loadDraft();
if (loaded.state === "ok") {
  loadStatus.textContent = copy.setup.configuredNote;
  input.value = loaded.setting.chatUrl;
  saveButton.textContent = copy.setup.updateAction;
  clearZone.hidden = false;
} else if (loaded.state === "corrupt") {
  loadStatus.textContent = copy.errors.corruptSettings;
  clearZone.hidden = false;
} else {
  loadStatus.textContent = copy.setup.notConfigured;
}
if (draft) input.value = draft; // 只還原文字；不還原試開／確認狀態
