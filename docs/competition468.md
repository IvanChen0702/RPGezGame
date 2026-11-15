# 迷霧戰境 468：完整模式與部署順序

本版完成獨立模式的參賽、探索、裝備、寶石、補給、鐵匠鋪、伺服器戰鬥、死亡掉落、恢復、跨週結算與領獎。它取代 465 的準備中實作，不變更主線配點、裝備或戰鬥結果；只有領取賽季獎勵才更新正式存檔。

## 部署狀態與開啟方式

2026-11-16（台灣時間）已成功套用 `mist_world465` 與 `mist_runtime468`，並部署 game-api v61。線上驗證九張模式資料表的 RLS／ACL、三支 service-only RPC，以及 service_role 讀取企劃均通過。前端隨本 PR 合併至 main 後由 Cloudflare 部署。

目前已發布企劃 `20261115-152949-8b8b7521` 的 `MistConfig.Enabled=false`，尚未開賽。現有 .gs 不需更換；須將來源表 Enabled 改為 TRUE 並經既有流程驗證／發布。工具未連接 Google Sheet，不能聲稱已修改來源表。

依序完成：

1. 查驗線上 schema 與 migration history；僅套用缺少的 `20261115140245_mist_world465.sql`，再套用 `20261115163236_mist_runtime468.sql`。不要重跑 436／438／退役 migration。
2. 執行 `supabase/review/verify468.sql`：三支 RPC 存在、新表 RLS 啟用、anon/authenticated 無表格權限及 RPC EXECUTE、service_role 無 TRUNCATE。保留平台角色預設權限的既有待辦。
3. 部署 game-api 的 `index.ts`、`lease446.ts`、`mist-api468.js`、`mist-runtime468.js`、`mist-combat468.js`。沿用 verify_jwt=false 與函式內部 Supabase Auth、確認信箱、帳號綁定及停權檢查。
4. `MIST_RUNTIME468_ENABLED` 未設定時採新流程；設為字串 `false` 可暫時回復舊準備中入口。不要在交戰期間切換此緊急開關；一般停止新入場應使用企劃 Enabled=false，仍可完成／恢復既有戰鬥。`MIST_SCHEMA465_READY` 不再是新流程開關。
5. 合併前端到 main，等待 Cloudflare 並核對公開成品。前端只有拿到伺服器 ready=true 才允許新操作。
6. Excel／Google Sheet 的 `MistConfig`：`Key=Enabled` 這列 `Value` 改為 TRUE，再使用已部署 maintenance466 `.gs` 的既有驗證、發布流程。**不另直接改 Supabase 已發布 JSON**，避免下一次企劃同步將開關覆蓋回 FALSE。這次不需新增 `.gs` 功能或重跑一次性任務設定。
7. 以 verify468 再確認 planning_enabled=true；既有 `rpg-background-tick` 每五分鐘呼叫 system/tick，同時維護戰境。首次狀態讀取也會建當週賽季。主線第 1 層完成後：戰鬥 → 競技 → 迷霧戰境 → 參加本季。一般怪／菁英仍須按規則倒數 30 分鐘後才出現。

上述第 1 步須成功後才可部署使用新 RPC 的後端。若 Supabase 客戶端確認逾時／取消，不得改用 execute_sql 繞過套用確認，或宣稱已執行。

## 實作邊界

- 裝備與技能計算由 `tools/build_mist_combat468.mjs` 從正式 index.html 的競技場共用邏輯抽取。產物 `mist-combat468.js` 不手改；沒有 eval、瀏覽器 DOM 或跨請求共用戰鬥狀態。變更共用戰鬥後必須重新產生與測試。
- 10 種普通怪、5 種菁英使用 MistEnemies 的能力與數值。特殊能力回合、連擊、吸血、護盾與蓄力由伺服器執行。新模式採挑戰者先手，每次指令結算雙方各一回合，上限依 BattleMaxRounds（目前 30）。
- 每季凍結戰鬥與抽獎企劃；Enabled 即時控制新操作。未解鎖技能、客戶端傳入的能力／裝備／勝負一律不採信。防守配置只在主動開戰更新；更換裝備保留 HP 比例。
- 私有出生箱位置只回傳本人；自己的身邊與旗幟提供 3×3 視野。其他玩家只顯示暱稱、積分、當前 HP、保護／交戰狀態；不回傳其裝備、技能或背包。戰鬥紀錄保留實際觸發能力文字。
- 戰境使用獨立版本比較及短交易；不取得遊戲共用 SERVER_BUSY 鎖。隨機抽取與戰鬥計算在交易外完成，CAS 成功才提交。request UUID + 完整操作內容可重試，不重複扣體力、發物品或推進回合。
- 同時占格／雙方交戰由同一交易提交。狀態讀取與既有五分鐘背景 tick 共同恢復超過十分鐘的交戰。週日 23:00 台灣時間停止新行動，23:10 按最後確認 HP 平局結束並結算，週一 00:00 新賽季。
- 死亡當次交易即清空裝備、背包、待處理戰利品、旗幟；只有符合資格的 1～3 件出戰裝備落入擊殺者箱子。重生補給不掉落。離線死亡通知與重生都能恢復；死亡結果畫面可離開。
- 領獎對 PlayerSaves 與獎勵列加鎖，驗證正式存檔 revision，獎品與回執原子入帳；重送不重發。不使用舊全遊戲鎖。
- 本版不清理歷史玩家資料。模式命令回執與舊賽季需持續監控容量；目前未做大規模壓力測試。共用棋盤的 CAS 在高併發可能要求同筆重試，與主線共用鎖分離。

## 驗證

```sh
npm --prefix supabase/tests ci
npm --prefix supabase/tests test
npm --prefix supabase/tests run test:competition
npm --prefix supabase/tests run test:mist
node tools/build_mist_combat468.mjs
python3 tools/package_site.py
# 本機 HTTP 服務 port 8443；僅使用合成帳號。
node tools/tests/mist465-ui.cjs
node tools/tests/mist468-play.cjs
BROWSER=webkit node tools/tests/mist468-play.cjs
```

隔離 PGlite 驗證 RPC、授權、重試、回合占用、跨週與原子領獎；情境測試涵蓋實際 PvP 掉落、同歸於盡、復仇冷卻、滿背包阻擋、HP 比例、每日補給及怪物敗北恢復。共用核心檢查所有已發布主動技能、被動技能、裝備、寶石、15 種怪物，另強制觸發低血量／機率能力與核對指定回合能力。

Chromium／WebKit 以真實前端及隔離 reducer 跑參賽 → 補給 → 裝備 → 技能 → 戰鬥 → 重新載入 → 逾時恢復 → 離場。手機在戰鬥及結果畫面持續隱藏底部導覽，離場恢復。這不是正式帳號端到端上線驗證，也不是 Safari 真機測試。
