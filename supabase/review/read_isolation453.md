# 453：顯示查詢移出全域鎖

基準：正式 game-api v57／Git main `9e685cd`。六條路徑只改排程與 I/O 防護，不改業務函式、回應格式或前端。

| 路徑 | 完整依賴核對 | 原有行為 |
|---|---|---|
| arena/ranking | 當季排行、自身名次、頭像 | 排名排序、榜外自身名次維持 |
| arena/revenge/list | 本人可用復仇、雙方分數、頭像、暱稱與舊存檔暱稱回退 | owner 篩選與分數計算維持 |
| arena/reports | 本人當季戰報 | 排序、筆數上限、欄位維持 |
| boxing/ranking | 已發布賽季、排行、本人待領獎勵 | 排名、配置快照、待領狀態維持；此路徑原本不發獎 |
| worldboss/ranking | 指定 Boss、已結算挑戰彙總 | 傷害合計、名次、本人排行與錯誤回應維持 |
| auction/my-sales | 本人已售物品、領款狀態 | 舊資料的領款狀態判讀、待領筆數／金額維持 |

六條路徑的共用 dispatchGate411 仍驗證企劃、登入 actor、存檔與玩法解鎖；外層仍驗證 Auth、帳號連結及停用狀態。帳號篩選只取伺服器驗證的 actor，不採用 body 的 accountId／ownerAccountId／sellerAccountId。無私人設定依賴，因此不再下載 game_runtime_config。

六條路徑的 engine 啟用 readOnly，資料庫 HTTP adapter 僅允許 GET table read，禁止寫入與 RPC。若未來加入隱藏副作用，會在發送前拒絕，必須重新審核其持鎖方式。既有 quest/status 的已審核讀取 RPC 不受此新限制影響。

## 保留原鎖的路徑

拳擊 status／history 可能補發獎勵；世界 Boss status／reward/check 可能建立 Boss 或恢復發獎；競技場 status／matches 可能建立玩家與每日對手。上述路徑及所有開戰、結算、領獎、買賣仍維持原鎖與交易恢復。此次沒有引入帳號分鎖，避免舊寫入路徑與新寫入並行造成存檔覆蓋。

## 驗證

- `npm --prefix supabase/tests test`：69 項 handler／lease 測試，包含六種讀取在持鎖中完成、讀取錯誤不清除他人的鎖、匿名／停用／未連結／無效身份拒絕，以及會寫入的狀態查詢仍被鎖保護。
- `node supabase/tests/read-paths453.mjs /path/to/baseline-v57.ts`：42 組完整 engine 的回應與 I/O 比對，含正常、空清單、暱稱回退、榜外自身名次、缺少目標、上游錯誤、尚未解鎖。部署前使用 v57 備份比對；一般測試無參數時比對同引擎 readOnly 開關。
- 故意注入寫入／RPC 驗證在 HTTP 發送前被拒絕。
- 既有權限、presence、世界 Boss 重試、排程補獎、結算重試與 446 讀取回歸維持通過。
- 全部使用合成玩家資料，不對正式玩家執行測試交易。

## 部署與限制

只部署 `supabase/functions/game-api/index.ts` 與未變動的 `lease446.ts`；沿用函式內身分驗證與 verify_jwt=false。無 SQL migration、授權變更、前端變更或手動清理。回復時使用 v57 兩個原檔，不修改資料庫租約或玩家資料。

顯示查詢與寫入可並行，持續更新中的排行可能在兩個 SELECT 間變動；交易仍以原後端驗證及 revision／回執為準。此次降低共用鎖的影響面，沒有宣稱解決所有寫入間的 SERVER_BUSY 或平台連線中止。
