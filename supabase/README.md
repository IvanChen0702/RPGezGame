# Supabase 權限與城鎮寵物修正（438／439）

目標專案：`ynzaotitxntrhubwfinr`。本次四項修改已獲使用者授權；**此工作環境尚未執行正式資料庫更新**，目前交付 SQL、驗證查詢與隔離測試。GitHub／Cloudflare 部署不會自動執行這些 SQL。

## 修正內容

| 更新檔 | 修改 |
| --- | --- |
| [439：寵物身分關聯](migrations/202611130003_fix_presence_identity439.sql) | 將 `members[].id` 視為隨機 `presence_id`，沿 `game_presence358.auth_user_id → game_identity_links.legacy_account_id → PlayerSaves.account_id` 取同行寵物 |
| [438：授權收斂](migrations/202611130002_restrict_public_privileges438.sql) | 撤銷已盤點 19 張表對 anon／authenticated 的 TRUNCATE、修正兩個建表角色的預設授權、撤銷 game_inventory_action 的 PUBLIC／anon EXECUTE |

439 沿用 420／358 的認證、名單、在線時限與排序。它只回傳已攜帶寵物的 `id`、`species`、`level`，不把 Auth ID、遊戲帳號 ID、其他寵物、能力或存檔傳給前端。已離線、缺少綁定／存檔、帳號停用或關聯不明確時，該名玩家的寵物為 null，不改查別人的帳號。

438 保留既有表格讀寫權限、函式實作及 service_role 的表格權限；明確保留 authenticated／service_role 執行背包交易。PostgreSQL 的全域與 schema 預設授權會相加，所以兩位 owner 的 **GLOBAL 與 public schema** 預設 TRUNCATE 都要檢查；撤銷全域的該項授權也會影響這兩位 owner 日後在其他 schema 建立的新表，但不動其他權限或現有非目標表。

不修改 `game-api`、358／420、Excel／`.gs`、回執清理排程、玩家資料或畫面。此次問題都位於 SQL 關聯與 ACL，無須重新部署 Edge Functions。

## 由已連線的 Codex／Supabase 管理工具執行

1. 確認專案與最新 GitHub 版本；備份目前 436 定義、目標表／函式 ACL 及兩位 owner 的預設 ACL 至非公開工作區。先執行 [唯讀驗證查詢](review/verify438_439.sql)，查看現況與執行角色對 owner 的成員關係。
2. 先套用 **439**，再套用 **438**。兩份 SQL 分別為原子交易，可重複執行；一份失敗不表示另一份被回滾。不要將歷史 436 檔案重新當作修正套用。
3. 若 438 回報 `438_DEFAULT_ACL_OWNER_PERMISSION_REQUIRED`，該份修改會整筆回滾，需要具有指定 owner 權限的管理連線。若回報其他驗證錯誤，先比對實際授權與盤點差異，不應跳過檢查強行提交。
4. 再執行 [唯讀驗證查詢](review/verify438_439.sql)，確認下列結果，並分別記錄兩份 SQL 的實際部署狀態。
5. 用兩個正常登入帳號驗收：城鎮各自攜帶不同寵物、換寵物、取消攜帶（在線名單約每分鐘更新）；另檢查登入、存檔、一般／批次裝備交易。不要用 TRUNCATE 作測試。

| 驗證欄位 | 預期結果 |
| --- | --- |
| found_table_count | 19 |
| remaining_table_truncate | 空陣列 |
| remaining_default_truncate | 空陣列 |
| inventory | 各簽章 anon／public EXECUTE 為 false，authenticated／service EXECUTE 為 true |
| presence.matches_patch439 | true（完整函式 body MD5 比對；若另有改寫需人工核對） |
| presence.anon_execute／authenticated_execute | false／true |
| base358_present／base420_present | true／true |

439 的資料結構與 ID 關聯，來自使用者提供的 2026/11/13 18:16 台北時間線上唯讀結果。438 的範圍來自同日線上 ACL 盤點。實際套用時仍以當前資料庫為準；腳本會檢查必要物件與權限，遇到不符就失敗回滾。

## 歷史 436 的錯誤

`202611130001_town_companions436.sql` 原先錯把 presence ID 當成遊戲帳號 ID。原檔只作歷史與重現測試用途；新安裝直接使用 439，已裝 436 的環境也使用 439 取代同一函式。前端 RPC 名稱不變，不必更換客戶端。

## 本機測試

```sh
npm --prefix supabase/tests install
npm --prefix supabase/tests test
```

使用 PGlite 的隔離 PostgreSQL 相容引擎，沒有正式資料庫連線。測試涵蓋：不同 presence／Auth／legacy ID、舊程式誤取另一帳號寵物的重現、換寵物／取消攜帶、異常關聯、匿名與停用帳號、私密資料不外洩、19 表 ACL、兩位 owner 的全域／schema 預設授權、一般與批次背包呼叫、可重跑、其他權限與存檔不變，以及失敗回滾。

420 的本機替身只模擬呼叫契約，不能代替正式站整合測試。文件、測試與 SQL 均不會打包到 Cloudflare 公開成品。
