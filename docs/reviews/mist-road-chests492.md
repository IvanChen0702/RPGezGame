# 路邊寶箱 492

沿用迷霧戰境的棋盤、裝備產生器、共用確認小窗、開箱表演與一鍵裝備。小窗以三個現有寶箱圖示、大機率數字和單行陷阱警示呈現；領取規則收合。一般寶箱不透露隱藏結果。

- 上下左右相鄰開啟，不耗體力；全玩家共用，先開先得，只在既有視野內顯示。
- 30% 保證傳說裝備一件；40% 沿用隨機品質裝備池一件（可能含傳說）；30% 陷阱，不給裝備。
- 陷阱傷害 = floor(開啟當下剩餘 HP × 80%)。500/1000 → 100/1000；1 HP 留 1 HP。不更動最大 HP、積分、裝備或體力。
- 裝備 +1～+9、固定一孔、排除 gmSword；滿包進待收戰利品。領獎回執持久保存，重整不重抽。
- 初始最多五箱；開啟後排入 30 分鐘補回佇列，生成於不同的內圈空格，避開旗幟與占用物件。場上寶箱＋待補回數合計五個；滿圖延後生成。賽季結束停止生成，新賽季重置。
- 開啟結果戰報含座標。陷阱回執只對本人回傳；多人競爭及斷線重試沿用世界 revision CAS 與命令回執同交易提交。

## 企劃設定與更新順序

新增 `MistConfig` 六個 Key：

| Key | 值 |
| --- | ---: |
| RoadChestCap | 5 |
| RoadChestRespawnMinutes | 30 |
| RoadChestLegendaryPercent | 30 |
| RoadChestRandomPercent | 40 |
| RoadChestTrapPercent | 30 |
| RoadChestTrapHpPercent | 80 |

三種結果機率合計必須 100；陷阱扣血百分比限制 1～99。完整 `.gs` 的新增企劃與驗證已更新。

1. 只套用 `20261118074324_mist_road_chests492.sql`：新增 cell kind 和企劃相容性 trigger，沿用 RLS/ACL/交易 RPC，沒有新的對外函式。
2. 部署 `game-api` 與前端；六個新 key 尚未發布時後端不生成路邊寶箱。
3. 執行 `tools/planning/publish_mist_road_chests492.sql`：僅添加核准六項設定到正式企劃與當季凍結規則，保存舊版本並提高世界 revision；不覆蓋玩家紀錄。精確前置版本不符會中止。
4. 試算表維護者將 `tools/planning/sync_mist_road_chests492.gs` 加入目前 Apps Script，執行 `syncMistRoadChests492()`。只從已發布企劃補上缺少的六項設定，不覆蓋既有欄位值、不發布、不操作玩家資料。舊發布器若缺新 key，資料庫相容 trigger 會保留已發布值。

## 驗證

- `npm run test:mist`（含 `mist-road-chests492.mjs`）：既有戰鬥/狀態/獎勵回歸；機率邊界、當前 HP 傷害與小數、零體力、滿包、範圍/死亡/交戰/關季限制、30 分鐘補回與旗幟避讓、隱私。
- PGlite 執行真實 migration 與 RPC：兩人同箱只有一人提交，舊請求精確重播，不重扣、不重抽；企劃範圍/總和/重複驗證；匿名 ACL 不變。
- `node tools/tests/mist492-planning.cjs`：完整 GS 語法、同步冪等、欄位位置變動、保留手動值及未發布阻擋。
- `node tools/tests/mist492-ui.cjs`（Chromium、WebKit；1440×900、390×844、360×640）：真實 reducer 驅動畫面，取消不送請求、零體力開啟、陷阱遺失回應與重試、HP 條、兩種開箱動畫與一鍵裝備、無溢出或 JavaScript 錯誤。

正式驗證只讀取公開企劃、函式定義與物件數量；不以真實玩家帳號開箱或戰鬥。
