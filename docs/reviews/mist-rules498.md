# 迷霧規則與棋盤 498

- 補給站提供全體已參賽玩家共用 5×5 視野，加入「查看其它視野」。領取次數仍每日二選一，擴大視野不等於可遠端領取；隱身及非參賽者隱私沿用既有規則。
- 路邊寶箱：20% 傳說、60% 隨機非傳說、20% 陷阱。陷阱仍扣目前剩餘 HP 的 80%，最低留 1 HP。
- 空降箱：台灣時間 00:00／12:00 為補充界線；場上最多一箱，未領取保留，領取後等下一時段。不補累積漏領箱。沿用請求時推進世界的既有排程模型。
- 返回棋盤（含戰後、頁籤、關閉整備）定位角色；檢視其它視野時，一般狀態更新保留觀看位置。
- 沿用石牆與外框素材，增加不攔截操作的暗色漸層、邊緣陰影；不放大既有有界限迷霧 SVG 濾鏡。
- 排除 `gmSword,forgeBlank172`，適用出生補給、裝備箱、路邊箱及擊殺轉移。更新前唯讀盤點：當季裝備／裝備背包內兩種物品合計為 0，不清除既有玩家資料。

## 設定

MistConfig：SupplyVisionRadius=2、AirdropIntervalHours=12、RoadChestRandomExcludeLegendary=1、RoadChestLegendaryPercent=20、RoadChestRandomPercent=60、RoadChestTrapPercent=20、ExcludedEquipmentIDs=gmSword,forgeBlank172。

資料庫新增僅限企劃相容性／驗證 trigger（SECURITY INVOKER，拒絕 PUBLIC/anon/authenticated 執行）。發布腳本有精確舊版本檢查，備份企劃與舊賽季設定，更新本季與正式企劃，提升世界 revision 防止舊快照覆寫。根據最後實際領取空降戰報重新推算下一時段，未領取箱不動。玩家紀錄不更新。

試算表：`tools/planning/sync_mist_rules498.gs` 的 `syncMistRules498()` 只更新／補上上述七個 Key，不發布企劃、不碰其他欄位；完整 `maintenance482.gs` 已含此函式及新預設／驗證。舊發布器漏三個新增 Key 時 trigger 保留已發布值；但既有三項機率及排除名單仍以試算表為準，下一次發布前須同步，避免舊值覆蓋。

## 驗證

- 全套 `npm run test:mist`，新增 498 規則與 PGlite 真實 migration／發布腳本測試。
- 機率邊界、非傳說池、排除裝備、12:00／00:00 前後、未領取保留、不重複補箱、共用視野及非參賽者隔離。
- PGlite：驗證範圍、舊發布器補值、本季更新、上午領取改為中午補回、玩家資料不變、版本防重跑及匿名權限。
- GS：完整語法、既有值更新／缺值補入、其他欄位保留、重複執行不修改。
- Chromium／WebKit：1440、390、360 寬，棋盤回中、保留其它視野、外圍出生點、32／256 地圖限制、點擊、旋轉、寶箱 20／60／20 提示、開箱／斷線重試與一鍵裝備。
