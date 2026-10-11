# 給接手 AI 的說明（ChatGPT／Claude 先讀這份）

版本：V1（依交接包 v1.2 的「極簡英日入口施工計畫」實作）｜2026-10-11 由 Claude 完成首版

## 這是什麼

一個兩頁的靜態網站：首頁只有一個「開始今天的課」按鈕，連到使用者自己保存的私人 ChatGPT 教學對話；設定頁負責保存那個網址。教學、進度、排程全部由 ChatGPT 對話負責，網站不碰。

沒有框架、沒有建置步驟、沒有後端、沒有 API、沒有追蹤。直接改 `site/` 裡的檔案即可。

## 工作方式（使用者已同意）

pull 最新 → 修改 → 跑檢查 → commit → push。push 到 `main` 後，GitHub Actions 會先跑檢查，通過才把 `site/` 發布到 `gh-pages` 分支（GitHub Pages）。

```bash
npm run check          # 離線檢查：網址規則、文案、公開邊界（只需要 Node 18+）
npm install && npx playwright install chromium
npm run test:e2e       # 瀏覽器流程測試（手機寬度模擬）
```

## 檔案

| 檔案 | 作用 |
| --- | --- |
| `site/index.html` + `site/js/home.mjs` | 首頁。已設定 → 顯示唯一按鈕；未設定／壞掉／讀不到 → `location.replace("setup.html")` |
| `site/setup.html` + `site/js/setup.mjs` | 設定頁：貼網址、錯誤提示、未知路徑確認、儲存失敗、複製啟動文字、暫時跳過、清除 |
| `site/js/ui_copy.mjs` | **所有頁面文字的唯一來源**，含 `setupPrompt`（啟動文字）。不要在別處另抄一份 |
| `site/js/classroom_url.mjs` | 網址政策純函式（原封不動取自交接包）。改規則要同步改 `tests/url_cases.json` 並升 `URL_POLICY_VERSION` |
| `site/js/storage.mjs` | localStorage／sessionStorage 讀寫，全部 try/catch |
| `site/css/style.css` | 樣式（起點為交接包 design_tokens.css） |
| `scripts/validate_entry_contract.mjs` | 43 個網址案例＋設定相容＋文案一致 |
| `scripts/check_public_site.mjs` | 確認 `site/` 沒有私人資料、真實聊天網址、金鑰、追蹤、外部資源、網路請求 |
| `tests/e2e.mjs` | Playwright 流程測試；chatgpt.com 請求全部攔截成假頁面 |

本機設定 key：`weichuan-language-door:v1`，內容 `{schemaVersion:1, chatUrl, routeStatus, urlPolicyVersion}`。草稿 key：`weichuan-language-door:v1:draft`（sessionStorage，只存文字，不存「已試開／已確認」）。

## 不能破壞的規則

1. 首頁只能有 **1 個**可互動元件（`ui_copy.rules.home_interactive_elements`）。不加語言切換、進度條、連續天數、分數、單字卡、設定按鈕。
2. 不顯示假進度：網站不知道有沒有上課，點按鈕不等於完成。
3. 被拒絕的網址（分享連結、其他網域、帳密、port、敏感參數…）**沒有**「仍然儲存」按鈕。
4. 未辨識但安全的 chatgpt.com 路徑：本人先點「先打開確認」→ 回來按確認 → 才保存。確認只綁定那一個完整網址，欄位一改就失效。
5. 複製啟動文字：`await writeText` 成功後才顯示「已複製」；失敗就顯示可選取的唯讀文字框。
6. 儲存失敗：不假裝成功，顯示「這次先進教室」連結。
7. 不用 iframe、不抓 ChatGPT 內容、不接 LLM API、不送網址到任何第三方、不寫 console 記錄網址。
8. **這個倉庫是公開的。** 不要把私人教材放進來：兩本教學聖經、合併啟動包、`initial_state.private.json`、`answer_keys.teacher.json`、`coach_notes`、`teacher/` 資料夾、作答紀錄、健康自述。`check_public_site.mjs` 會擋檔名和內容。

## 已驗收（2026-10-11，Chromium 手機模擬）

- 新訪客自動到設定頁；貼支援網址 → 儲存 → 同分頁前往，query／fragment 保留；重開首頁仍有入口。
- 首頁只有 1 個互動元件；Tab 可到按鈕，焦點外框可見；Enter 可進入；從 ChatGPT 返回仍正常。
- 空白、分享、假網域、javascript:、舊網域、ChatGPT 首頁都顯示對應文字且無覆寫按鈕，輸入保留。
- JSON 損壞、版本不符、儲存的網址被竄改 → 回設定頁並顯示提示，不會空白。
- 未知路徑：必須先開新分頁試開；改欄位會清掉確認；確認後存成 `user_confirmed_unrecognized`。
- localStorage 讀寫拋錯：顯示保存失敗文字，仍能這次進教室。
- Clipboard 拒絕：顯示手動複製框，不顯示「已複製」；成功時內容與畫面啟動文字一致。
- 暫時跳過：連到 chatgpt.com 首頁，不保存任何設定。
- 清除只刪本 App 的 key。
- 320×568、390×844、橫向 844×390，100% 與 200% 字級：無橫向捲動，儲存按鈕可到達，主按鈕 ≥64px。

## 尚未驗證（需要本人在 iPhone 上）

- 真實私人對話網址能否打開原對話、會不會跳到 ChatGPT App（由 iOS／ChatGPT 決定，網站無法保證）。
- iPhone Safari 實機的鍵盤、安全區、加入主畫面（manifest 用 `display: browser`，讓主畫面圖示用 Safari 開、共用同一份設定）。
- Safari 的 Clipboard 實際行為。

## 之後若要擴充

交接包原本規劃：V1 達到驗收後**先使用，不繼續堆功能**。若使用者明確要「教學全部在網站裡」，那是新版本，需要重新設計 API、費用與進度保存，不要把這個入口悄悄擴成抓取或代理登入工具。
