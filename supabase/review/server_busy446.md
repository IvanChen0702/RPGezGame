# SERVER_BUSY 取鎖／解鎖修正 446

目標：`ynzaotitxntrhubwfinr` 的 `game-api`。基準為正式 v54；本次首次將既有部署程式納入 `supabase/functions/game-api/` 維護，沒有重新編寫遊戲引擎。移除兩個沒有呼叫點的歷史測試帳號常數，避免將帳號識別碼納入 Git。

## 已確認的問題

2026-11-13 22:00:10（台北時間）取鎖後，直到 22:02:11 才再次成功取鎖；其間沒有解鎖 RPC 紀錄，與資料庫租約的 120 秒期限吻合，25 筆請求被 429 拒絕。同一時段出現 503；既有日誌不足以將最初中斷歸因於特定操作。

v54 只在收到成功取鎖回應後才設定 `held`；成功 UPDATE 的回應若遺失，就不會解鎖。解鎖失敗也被空白 catch 忽略。所有私人操作共用同一租約，包括狀態查詢。

## 修正

- 每次請求使用伺服器產生的 owner／trace ID。取鎖前先標記「可能持有」，回應不明確時仍執行 owner 限定的清理。
- 只重試鎖 RPC，沿用同一 owner；取鎖最多 12 次競爭、最多容忍 2 次 RPC 錯誤。每次鎖 RPC 有 3 秒逾時；不重送遊戲交易。
- 解鎖最多 3 次，短暫退避。解鎖成功但回應遺失後，下一次 `false` 表示已不是持有人，可以結束清理。不能釋放別人的租約。
- 解鎖全部失敗會留下 `lock_release_unconfirmed`，不將已成功提交的遊戲交易改報失敗。
- `EdgeRuntime.waitUntil` 追蹤整個 handler（含 finally），並記錄 worker 關閉時尚未完成的階段。
- `battle/status`、`quest/status`、`chaos/catalog` 移出全域租約。保留身分驗證、帳號停用檢查、伺服器取得的 account ID 及既有引擎檢查。
- `battle/status` 保留 `game_battle_status79` 自己的存檔列鎖；`game_quest_read368` 已確認只有 SELECT。完整引擎測試確認任務狀態及混沌寶盒目錄沒有寫入 I/O。
- 企劃／私人設定讀取移至取鎖之前，縮短持鎖時間。開戰、結算、領獎、買賣、取消戰鬥、開世界王寶箱、排程等仍保留原有全域保護；本次不改資料庫函式、回執或 revision 規則。
- 429 回應包含 `Retry-After: 2` 與 trace ID。不自動重試未知提交狀態的遊戲操作。

## 追蹤

新增 JSON 紀錄的 `event` 固定為 `game_api446`，包含 `kind`、`trace_id`、白名單內的 `action`、`phase`、`elapsed_ms`。完成紀錄另外包含 HTTP 狀態、鎖嘗試次數、持鎖時間與釋放結果。錯誤只記錄固定分類及 HTTP 狀態，不記錄例外原文、帳號、請求參數、token 或存檔。

重要事件：`request_started`、`lock_acquired`、`lock_acquire_error`、`lock_release_error`、`lock_release_recovered`、`lock_release_unconfirmed`、`request_failed`、`request_completed`、`worker_shutdown`。HTTP 回應標頭 `X-Game-Trace-Id` 可供對照。

## 驗證

```sh
npm --prefix supabase/tests ci
npm --prefix supabase/tests test
node supabase/tests/read-paths446.mjs /path/to/public-bootstrap.json
node --check supabase/functions/game-api/index.ts
node --check supabase/functions/game-api/lease446.ts
```

租約測試以實際 handler 搭配模擬 I/O 驗證取鎖回應遺失、解鎖重試、owner 隔離、持續失敗、交易不重播、讀取繞過租約但仍須登入、續租失敗中止、排程驗證與日誌隱私。完整引擎測試使用公開企劃快照及人工帳號／存檔，禁止任何預期以外的網路 I/O。

部署同時包含 `index.ts` 與 `lease446.ts`，入口為 `index.ts`，沿用原有 `verify_jwt=false` 及函式內驗證。GitHub／Cloudflare Pages 不會自動部署這個後端。

2026-11-13 22:33（台北時間）已部署為正式 **v55**。重新下載部署內容確認兩個檔案與測試版本完全相符；`health`、`data/version` 均回覆 200／ok，正式站 CORS 與 `X-Game-Trace-Id` 正常，線上可見新的完成紀錄。24 項租約測試、兩條完整引擎讀取檢查及既有 438／440／439 回歸均通過。沒有使用正式玩家帳號執行交易測試。

## 限制與回復

資料庫仍保留 120 秒租約，未縮短期限或無條件清鎖。`waitUntil` 無法突破平台 CPU、記憶體與 worker 存活上限；程序被強制終止或持續網路故障時，仍可能需要等待租約過期。新紀錄用於辨認這類情況。

沒有變更兩個既有排程；拳擊獨立排程的 403 與重複掃描問題另行處理。

部署前保留 v54 的單檔原始碼於非公開工作區。若需回復，使用該備份重新部署原本的 `index.ts`，沿用原有驗證與環境設定；本次沒有資料庫更新需要回滾，也不可為回復而清除遊戲租約或玩家資料。
