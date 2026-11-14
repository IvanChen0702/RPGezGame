# NPC 新表情 447

莉莉、希、風間、夜弦各加入四張透明立繪，保留原有五種表情與所有既有圖檔內容。新素材以 WebP q85 內嵌 `assetRegistry393_`，不額外複製外部 runtime 圖片。

| Expression | 說明 |
| --- | --- |
| deadpan | 無言 |
| surprised | 驚訝 |
| worried | 擔心 |
| serious | 認真 |

原有選項為 `basic,angry,happy,shy,sly`。四個新表情沿用各角色原本的可見高度、中心與底部基準；每格為 480 × 724、四格圖集為 1920 × 724。採等比例縮放，沒有拉寬或壓扁；舊圖集保持 2172 × 724，風間原有不等寬裁切保持不變。夜弦移除確認稿的背景霧層，保留手中魔法光效。

`tools/planning/npc_expressions447.json` 記錄原始確認稿雜湊、裁切區域、比例與對齊點。若要重製，將四張確認稿依 NPC ID 命名成 PNG，使用 `python tools/prepare_npc_expressions447.py SOURCE_DIR OUTPUT_DIR`（需要 Pillow、numpy、scipy）。這個工具只輸出整理圖與比較圖，不直接覆寫正式頁面。

## 企劃欄位

`tools/planning/quest_expressions447.xlsx` 是使用者提供的參考 Excel 的**任務分頁副本**，僅保留 QuestNPCs、Quests、QuestRewards、QuestObjectives、QuestDialogues，不是整份正式資料的替代品。

- QuestNPCs 的四個角色 Expressions 加入四種代碼。
- QuestDialogues 的 Expression 提供九種選項，下拉範圍為 F2:F5000。
- 既有任務、對話與獎勵值沒有改動，也沒有發布新的主線故事。
- `tools/update_quest_expressions447.py INPUT.xlsx OUTPUT.xlsx` 可將同樣設定套到最新完整 Excel，禁止原地覆寫。
- `tools/planning/quest_expression_options447.gs` 是可整合進既有 Apps Script 的下拉選單設定工具，尚未在線上執行。**目前使用的 .gs 未提供，驗證／同步流程仍未確認**；發布前需將其中可能存在的 Expression 白名單一併擴充。game-api 目前直接傳遞表情欄位，不需要發布企劃資料才能支援新圖。
