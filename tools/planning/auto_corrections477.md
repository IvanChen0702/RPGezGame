# 自動同步本次企劃修正

正式遊戲已更新。這份工具只把來源 Google Sheet 同步成同一份修正文，避免下次發布回退；不需要再次發布遊戲或重新部署 Apps Script 網頁應用程式。

1. 從目前維護的企劃 Google Sheet 開啟「擴充功能 → Apps Script」。
2. 新增指令碼檔案 `auto_corrections477`，貼入同目錄 `auto_corrections477.gs` 全文並儲存。保留原有程式。
3. 選擇並執行 `applyPlanningCorrections477`。首次執行依 Google 提示授權試算表操作。執行期間暫停手動編輯企劃表。
4. 在執行記錄確認 `ok: true`。首次完整更新應顯示 `updatedDialogues: 44`、`addedFlagKeys: 3`；已更新部分會略過，數字可以較少。

可先執行 `previewPlanningCorrections477` 預覽差異，完全不寫入。工具依 DialogueID／QuestID 比對，不依賴固定列號或欄位順序；核對對應任務條件、舊文字、重複或缺少 ID 及公式。遇到其他修訂時在寫入前中止，不強蓋。

寫入前複製受影響工作表為 `_backup477_...`，保留格式與公式。不改任務條件、獎勵、帳號、玩家存檔或排程，不呼叫 API，不發布企劃。補齊 `MistConfig` 的 `FlagScoreMinutes=180`、`FlagScorePoints=1`、`RemoveEnemyFlagPoints=3`，其他設定原樣保留。既有發布器使用表名白名單，備份工作表不會發布。

Apps Script 多個儲存格寫入不具單一交易性。若 Google 執行中斷，可再次執行：已套用的文字會略過；若有人同時修改，工具中止並在執行記錄保留完成筆數與備份名稱。腳本鎖只阻止同專案腳本並行，不能鎖住人的試算表編輯。

目前環境沒有連線中的 Google Sheets 工作階段，無法代為執行此工具；已完成離線模擬測試，尚未實際寫入來源 Google Sheet。這是本次 475／476 更新的定點同步器，不會自動重寫未來新增任務的劇情對話。
