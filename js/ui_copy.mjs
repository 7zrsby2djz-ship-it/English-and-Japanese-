// 頁面文字唯一來源（含 setupPrompt 啟動文字）。改字只改這裡。
// Single source of all UI copy, including setupPrompt. Pages import this file.
export default {
  "schemaVersion": 1,
  "home": {
    "title": "今天，一小步。",
    "description": "打開教室，跟著老師學。",
    "primaryAction": "開始今天的課",
    "footnote": "一般約12分鐘；累了就跟老師說「3分鐘」。",
    "pageTitle": "開始今天的課"
  },
  "setup": {
    "title": "接回你的教室",
    "intro": "已有教學對話？貼上網址就好，不用重新建立或上傳教材。",
    "urlLabel": "原教學對話的網址",
    "urlPlaceholder": "貼上你自己開啟原對話時的完整網址",
    "saveAction": "儲存並進教室",
    "copyPromptAction": "複製啟動文字",
    "copyFallback": "未能自動複製。請長按下方文字，選取後手動複製；你可以繼續設定。",
    "updateAction": "更新教室入口",
    "clearAction": "清除入口設定",
    "cleared": "已清除這個瀏覽器的入口設定。",
    "privateUrlHelp": "請從瀏覽器網址列複製，不要建立公開分享連結。",
    "iphoneHelpLabel": "iPhone怎麼取得網址？",
    "iphoneSteps": [
      "在Safari開啟chatgpt.com，登入與ChatGPT App相同的帳號。",
      "從聊天清單或搜尋開啟原本的英日教室；如果放在專案裡，先進原專案。看到之前的對話後再繼續。",
      "點Safari網址列，選取完整網址並複製。回到這一頁，貼到上方欄位。"
    ],
    "iphoneFootnote": "請複製Safari網址列，不用按ChatGPT的分享。若跳回App或暫時找不到網址，可先回原對話學習，之後再設定。",
    "newClassroomLabel": "還沒有教室？",
    "newClassroomSteps": [
      "開一個要長期保留的普通ChatGPT對話，附上私人取得的合併啟動包；不要用臨時對話作固定教室。",
      "複製下方啟動文字，貼到對話並送出。等老師確認能讀到檔案後，直接開始互動。",
      "從Safari網址列複製這個教室的網址，回本頁貼上並儲存。"
    ],
    "newClassroomPromptSource": "setupPrompt",
    "copied": "已複製，請回教學對話貼上。",
    "manualPromptLabel": "可手動複製的啟動文字",
    "unknownRoute": "這是ChatGPT網域，但本入口尚未辨識這個網址格式。先確認它能打開原教室，再儲存。",
    "checkLinkAction": "先打開確認",
    "confirmRouteAction": "確認是原教室，儲存並前往",
    "routeConfirmationHelp": "回到此頁後，確認剛才看到的是自己的原教學對話。網址改動後需要重新確認。",
    "skipAction": "暫時跳過設定",
    "skipExplanation": "先回原ChatGPT教室學習，之後再貼網址。這次不會顯示入口已設定。",
    "skipOpenChatGPT": "開啟ChatGPT，回原教室",
    "skipHomeUrl": "https://chatgpt.com/",
    "draftNote": "切換分頁時會盡量保留本次欄位；瀏覽器若清除或重載資料，可能需要重新貼上。",
    "pageTitle": "接回你的教室",
    "notConfigured": "先設定一次教室，之後就能直接開始。",
    "configuredNote": "這個瀏覽器已保存教室入口。要換教室，貼上新網址再儲存。",
    "storageGoAction": "這次先進教室",
    "noscript": "請開啟瀏覽器的JavaScript，才能保存教室入口。"
  },
  "errors": {
    "missingUrl": "請貼上ChatGPT私人對話的完整網址。",
    "invalidUrl": "這個網址格式無法使用，請貼上原對話的完整網址。",
    "sharedUrl": "這是分享連結。請改貼你自己開啟原對話時的網址。",
    "storageUnavailable": "這次可以進教室，但此瀏覽器沒有保存入口；下次可能需要再設定。",
    "corruptSettings": "找不到可使用的入口設定，請重新貼上教室網址。",
    "legacyDomain": "請在目前的ChatGPT網頁開啟原對話，再複製網址列中的新網址。",
    "unapprovedHost": "請使用chatgpt.com原對話的網址；其他網站不能設為教室。",
    "unsafeUrl": "這個網址不能作為教室入口，請重新複製原對話網址。",
    "notConversation": "這不是可保存的教室網址。請先開啟原教學對話，再複製網址列。",
    "missingConversationId": "網址缺少對話部分，請複製完整網址。",
    "copyFailureDoesNotBlock": "複製功能暫時不可用，仍可手動複製或先回原教室。"
  },
  "setupPrompt": "請讀完附上的英日合併啟動包，依本對話最新作答與接續卡繼續，不要因更新檔案重置進度。請你選教材，一次只給我一題，保留E看不懂與猜測方式；閱讀、聽力分開記錄。若沒有既有進度，再依啟動包開始。",
  "rules": {
    "home_interactive_elements": 1,
    "no_diagnosis_on_public_ui": true,
    "no_fake_progress": true,
    "no_daily_checkin_form": true,
    "startup_prompt_single_source": "setupPrompt",
    "existing_classroom_is_default": true,
    "unknown_route_requires_same_origin_and_user_confirmation": true,
    "rejected_url_has_no_override": true,
    "copy_single_source": "site/js/ui_copy.mjs"
  },
  "contentVersion": "1.2"
};
