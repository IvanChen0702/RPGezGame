# 迷霧戰境體力 478

初始體力與上限 20；每 30 分鐘恢復 1 點。主頁重點、完整規則、體力不足提示及棋盤分母一起更新。棋盤分母使用後端賽季規則，舊回應相容預設為 20。原有戰鬥、移動、插旗、拔旗、隱身與鐵匠鋪成本不變，重生仍不重置體力。

部署順序：套用 `20261116032956_mist_energy478.sql` 將資料庫上限及預設值更新；發布 game-api（新增 energyRules 回應）；執行 `tools/planning/publish_mist_energy478.sql` 以版本檢查同步正式企劃與 ACTIVE 賽季；部署前端。

資料同步鎖定既有世界 revision 後，先按舊規則結算既有恢復時間，再把未滿一點的進度比例保留至新週期。舊滿 10 點者從切換時間開始恢復至 20，不追溯補滿。資料庫操作同一交易：備份舊企劃及模式體力／賽季設定，更新相關玩家 revision 與世界 revision，拒絕舊快照提交；不清空 HP、裝備、積分或戰鬥。歷史已結算賽季不改。腳本重跑會因版本不符中止。

來源企劃表：新增 `tools/planning/auto_energy478.gs` 至既有 Apps Script，執行 `applyMistEnergy478`。只修改 MistConfig 三個值（EnergyInitial 10→20、EnergyCap 10→20、EnergyRecoveryMinutes 60→30），先備份，已更新略過；不同修訂／公式／重複或缺少 Key 時中止。無需重新部署 Apps Script，亦不會發布或寫入玩家資料。執行時暫停手動編輯表格。JSON、Excel 與初始化 GS 範本同步更新。

驗證：PGlite 真實 schema/發布 SQL、既有賽季切換、初始20/上限20、30分鐘邊界、舊半週期延續、舊滿體力不追溯補滿、玩家非體力資料不變、舊 revision 衝突、重跑版本防護。另有 GS 備份／衝突／冪等／中斷恢復模擬及手機、桌機完整遊玩回歸。
