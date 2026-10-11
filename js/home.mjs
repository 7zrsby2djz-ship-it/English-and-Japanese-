// 日常首頁：只有一個可互動元件「開始今天的課」。
// Home: exactly one interactive element. No progress, no stats, no menus.
import copy from "./ui_copy.mjs";
import { loadSetting } from "./storage.mjs";

const root = document.getElementById("home");

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  const loaded = loadSetting();
  if (loaded.state !== "ok") {
    // 尚未設定、設定損壞或瀏覽器不讓讀取 → 設定頁處理（不留空白頁）。
    window.location.replace("setup.html");
    return;
  }
  document.title = copy.home.pageTitle;
  root.replaceChildren(
    el("h1", {}, copy.home.title),
    el("p", { class: "secondary" }, copy.home.description),
    // href 每次載入都重新經過網址政策檢查（loadSetting → readClassroomSetting）。
    el("a", { class: "primary-action", href: loaded.setting.chatUrl, rel: "noreferrer" }, copy.home.primaryAction),
    el("p", { class: "secondary small" }, copy.home.footnote)
  );
}

render();
// 從ChatGPT按「上一頁」回來時，若頁面是快取還原，重新檢查一次設定。
window.addEventListener("pageshow", event => { if (event.persisted) render(); });
