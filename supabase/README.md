# Supabase 權限與城鎮寵物修正（439／440）

目標專案：`ynzaotitxntrhubwfinr`。本次修改已獲使用者授權；**此工作環境尚未執行正式資料庫更新**，目前交付 SQL、驗證查詢與隔離測試。GitHub／Cloudflare 部署不會自動執行這些 SQL。

## 438 權限錯誤與替代方案

使用者回報 `438_DEFAULT_ACL_OWNER_PERMISSION_REQUIRED: supabase_admin`。438 同時修改專案及平台角色的預設授權，要求執行者擁有兩者權限；託管 Supabase 的專案 `postgres` 不一定有權修改保留角色 `supabase_admin`。這個錯誤不表示遊戲無法連接資料庫。

438 在修改前檢查權限，失敗時該筆交易不能提交；若連線仍處於失敗交易，先執行 `ROLLBACK` 或使用新的交易。獨立提交的 439 不會因此回滾。**後續改用 440，不要重跑 438，也不要將歷史 migrations 全部依序重播。** 不要嘗試授予平台角色成員資格、冒用角色或更換 service-role key 來繞過限制。

| 更新檔 | 範圍 |
| --- | --- |
| [439：寵物身分關聯](migrations/202611130003_fix_presence_identity439.sql) | 沿 presence ID → Auth ID → legacy account ID 取得該名玩家攜帶的寵物 |
| [440：專案授權收斂](migrations/202611130004_project_privileges440.sql) | 撤銷已盤點 19 張表對 anon／authenticated 的 TRUNCATE、撤銷 postgres 的預設 TRUNCATE、收斂 game_inventory_action 的 PUBLIC／anon EXECUTE |
| [441：平台管理員後續處理](admin/restrict_platform_defaults441.sql) | 僅處理 supabase_admin 的預設 TRUNCATE；置於 admin 目錄，不列入一般專案更新流程 |

440 保留其他表格讀寫權限、函式實作及 service_role 的表格權限，明確保留 authenticated／service_role 執行背包交易。它不修改 supabase_admin 的 ACL。若目標表或函式本身也缺乏授權修改權限，或仍有 PUBLIC／繼承授權，440 會失敗並回滾，不會略過檢查而報成功。

PostgreSQL 的全域與 schema 預設授權會相加，因此檢查 **GLOBAL 與 public schema** 兩個範圍。440 撤銷 postgres 的全域 TRUNCATE 預設授權，也會影響 postgres 日後在其他 schema 建立的新表；不更動既有非目標表或其他權限。

439 沿用 420／358 的認證、名單、在線時限與排序，關聯為 `members[].id = game_presence358.presence_id → auth_user_id → game_identity_links.legacy_account_id → PlayerSaves.account_id`。只回傳攜帶寵物的 `id`、`species`、`level`；不公開 Auth ID、遊戲帳號 ID 或存檔。缺少綁定／存檔、帳號停用或關聯不明確時，寵物為 null。

不修改 `game-api`、358／420、Excel／`.gs`、回執清理排程、玩家資料或畫面；無須重新部署 Edge Functions。

## 由已連線的 Codex／Supabase 管理工具執行

1. 確認專案與最新 GitHub 版本；備份目前 436 定義、目標表／函式 ACL 及兩位 owner 的預設 ACL 至非公開工作區。先執行 [唯讀驗證查詢](review/verify438_439.sql)。檔名保留相容性，內容已支援 440／441。
2. 若 `presence.matches_patch439` 已為 true，且 anon／authenticated EXECUTE 分別為 false／true，不必重跑 439；否則比對線上定義後套用 439。若已有不同的新修正，先核對，不直接覆蓋。
3. 以有權管理專案物件的 postgres 連線套用 **440**，再執行驗證查詢。439／440 各自為原子交易，可重跑，須分別記錄部署結果。
4. 確認 `project_permissions_ready = true`。若 `platform_defaults_ready = false`，保留為「平台預設授權待處理」，不得宣稱全部授權修正完成。
5. 將剩餘 supabase_admin 預設 ACL 與權限錯誤提供給 Supabase 支援或具平台權限的管理員，評估並處理 441。一般專案連線不用執行 441；它無權執行時會直接失敗，不影響先前提交的 440。平台處理後重新驗證。
6. 用兩個正常登入帳號驗收：各自帶不同寵物、換寵物、取消攜帶（在線名單約每分鐘更新），另檢查登入、存檔、一般／批次裝備交易。不要用 TRUNCATE 作測試。

| 驗證欄位 | 預期／解讀 |
| --- | --- |
| found_table_count | 19 |
| remaining_table_truncate | 空陣列 |
| remaining_project_default_truncate | 空陣列 |
| project_permissions_ready | true：19 表、postgres 預設權限、inventory EXECUTE 全數通過 |
| remaining_platform_default_truncate | supabase_admin 尚待處理項目，440 不會清除 |
| platform_defaults_ready | 只有上述平台預設 TRUNCATE 全數移除才為 true |
| all_permissions_ready | 專案與平台檢查均通過；不包含寵物驗證 |
| remaining_default_truncate | 兩位 owner 的合併清單，保留原欄位且不隱藏未修項目 |
| inventory | anon／public EXECUTE 為 false，authenticated／service 為 true |
| presence.matches_patch439 | true（完整函式 body MD5 比對；另有改寫需人工核對） |
| presence.anon_execute／authenticated_execute | false／true |
| base358_present／base420_present | true／true |

這些狀態僅涵蓋已盤點範圍，不代表整個資料庫安全審查。439 的 ID 關聯來自使用者提供的 2026/11/13 18:16 台北時間線上唯讀結果，ACL 範圍來自同日盤點；仍需以正式資料庫驗證結果為準。

## 歷史檔案

`202611130001_town_companions436.sql` 錯把 presence ID 當遊戲帳號 ID，只保留作歷史與重現測試；以 439 取代同一函式，前端 RPC 名稱不變。

`202611130002_restrict_public_privileges438.sql` 保留作歷史及失敗重現，託管專案改用 440；441 留給平台管理員獨立處理。

## 本機測試

```sh
npm --prefix supabase/tests install
npm --prefix supabase/tests test
```

使用 PGlite 隔離 PostgreSQL 相容引擎，沒有正式資料庫連線。權限回歸以 **非 superuser、非 supabase_admin 成員的 postgres** 重現 438 錯誤，確認 440 可獨立提交、平台 ACL 完整保留且報告列為未完成、441 被拒絕不影響已提交的 440，並驗證真正有權限的管理員可完成平台修正。

另涵蓋可重跑、其他權限與資料不變、匿名／登入／伺服器／批次背包呼叫，以及非預期 PUBLIC 授權時原子回滾。寵物測試涵蓋不同 presence／Auth／legacy ID、舊錯誤重現、換寵物／取消攜帶、異常關聯及私密資料保護。420 本機替身只模擬呼叫契約，不能代替正式整合測試。文件、測試與 SQL 均不打包到 Cloudflare 公開成品。
