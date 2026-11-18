# 重生補給、手機棋盤與拳擊機移除（482）

## 行為

- 成功確認重生後直接接既有開箱表演；不再提供獨立「開啟補給箱」操作。使用原本的 request ID、伺服器收據及恢復機制，重試不重抽。
- 手機只調整迷霧模式內的標題、頁籤、資源與操作區。HP／體力外框皆為 24px；倒數和積分放同列，無選格時不保留說明列。全站帳號橫幅、一般戰鬥和整備保持原有流程。
- 拳擊機入口、前後端專屬流程、五張獨立圖片、素材索引及舊網址轉址移除。極限／遺物沿用的樣式改為一般模式元件，沒有刪除共享素材。
- MistRankRewards 獨立承接原獎勵：寶盒 100／80／50／30。當季凍結企劃同步轉換；後續發布也會清除退役來源，避免舊 GS 重新寫回。

## 正式變更與驗證

- Supabase `ynzaotitxntrhubwfinr`，migration `20261118021014_remove_boxing482` 已套用。
- 移除 BoxingAttempts（583）、BoxingRanking（49）、BoxingRewards（50）、game_boxing_quest_runs379（35）及過渡稽核表；括號是執行前盤點數量。
- 移除專屬函式、觸發器、排程及執行紀錄，清理舊企劃版本、當季 frozen rules、任務舊計數與領獎 receipt。既有物品、競技場任務 baseline 與其他模式資料保留。
- 正式驗證：退役表、排程、企劃歷史來源、凍結來源、save receipt 均為 0。
- 新企劃版本 `20261118-021030-cleanup482`；game-api v70，五檔與儲存庫逐檔一致，verify_jwt=false 保留既有 body 身分驗證；health ok。
- 已測：完整 migration 隔離測試（含舊發布器回寫）、Mist 交易／賽季／獎勵／旗幟／體力及 320 組戰鬥案例；Chromium／WebKit 電腦手機重生開箱、斷線重試／恢復；一般關卡與 Mist 四段魔法彈、敵人攻擊／受擊及幾何比對；整備回歸；六尺寸入口與頁籤；手機 HP／體力等高；素材雜湊、解碼及打包。
- Supabase advisor 的既有權限／Auth 提示未因本次變更調整；新函式為 invoker、固定 search_path，PUBLIC/anon/authenticated 無執行權限。

## Google 試算表端仍需完成

目前沒有 Apps Script／Google Sheets 操作工具，因此無法宣稱已清除已安裝的 GS 或試算表內容。

1. 將原主要維護程式替換為 `tools/planning/maintenance482.gs`（保留 Script Properties、既有發布網址及其他非拳擊機的 GS 檔案）。不要把整份內容追加到舊主程式，否則會重複宣告。
2. 執行一次 `removeRetiredMode482()`：先將原獎勵搬到 MistRankRewards，刪除名稱包含 Boxing 的工作表、目前執行者的相關觸發器與 Script Properties，清除 GameConfig 的退役設定。保留其他功能、玩家備份與驗證／發布入口。
3. 執行 `checkMaintenanceStatus465()`，確認無退役觸發器；其他觸發器擁有者也要各自執行清理。若仍使用相容 Web App，重新部署此 GS 版本。
4. 單獨清理工具亦在 `tools/planning/remove_boxing482.gs`；完整版本已包含它，不要重複貼入。完成後可刪除這個一次性函式。

此清理不會自動發布其他企劃。舊資料庫 migration／測試是部署歷史與回歸證據，保留於 Git，不包含在公開網站；不改寫 Git 歷史或外部平台自動備份。
