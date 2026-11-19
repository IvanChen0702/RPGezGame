# 迷霧行囊容量 499

- EquipmentCapacity、GemCapacity、ChestCapacity 均由 10 改為 20，正式企劃與目前賽季一起更新，備份舊企劃／賽季設定並提高世界 revision；不重建玩家物品。
- API 回傳 inventoryCapacity499，前端依實際分類容量呈現計數與空格。裝備與寶石各預留至 20 格，寶箱仍沿用自動開箱，不新增寶箱頁籤。
- 第 20 件正常收納，第 21 件保留待收戰利品；丟棄／整理後可手動收取。既有滿包防丟失、拆寶石及卸裝規則沿用容量設定。
- `syncMistCapacity499()`（tools/planning/sync_mist_capacity499.gs，完整 maintenance482.gs 亦已包含）將上述三個 Key 從正式企劃同步到試算表，下一次發布前需執行，避免舊值覆蓋。不同於 498 七個 Key 同步，本函式只處理容量。

驗證：三分類 19→20→滿包拒絕／待收保留→整理後再收取、連續開箱溢出；PGlite 真實發布腳本確認正式與當季各 20 且玩家資料不變；既有開箱回歸及 GS 語法；Chromium／WebKit 1440、390、320 寬的格數、標題與橫向溢出檢查。
