# 487 迷霧戰境資源與視野

## 行為

- 體力補包與預告合計最多 10 個；預告 30 分鐘、相鄰免費領取 +10 體力、最高 20。滿體力無法領取。領取後立即在可用內圈格補上新的 30 分鐘預告；沒有空格時等待下一次更新，不覆蓋玩家、怪物、建築或旗幟。
- 空降資源場上至多 1 個，提供所有參賽者 5×5 視野；相鄰免費領取傳說裝備寶箱 ×1，使用既有開箱／一鍵裝備／待收戰利品流程。領取後共用視野消失，下一個台灣時間 00:00 再生成；無人領取則跨日保留原物件。賽季重置仍清空該季資源。
- 「查看其它視野」列出自己的旗幟與全場空降，只捲動棋盤，不發出移動請求、不耗體力。隱身玩家仍受原有隱私判定保護。
- 沿用服務端 world revision CAS 和 account/requestId 收據。多人爭搶只發一次；重試同請求回傳原收據。戰鬥中／死亡／賽季結束不能領取。體力與空降領取均有座標戰報。
- 新圖示：`assets/images/ui/mist/stamina487.webp`、`airdrop487.webp`；金綠閃電魔法陣與既有紫色怪物陣有不同輪廓與符文。維持共用上方帳號橫幅、戰鬥和整備流程。

## 企劃與部署

1. 套用 `supabase/migrations/20261118043535_mist_resources487.sql`（只新增 cell kind 與企劃相容 guard，無權限放寬）。
2. 部署 game-api；未發布新規則前不生成新資源。
3. 部署前端與圖示。
4. 執行 `tools/planning/publish_mist_resources487.sql`，版本比對通過才新增規則，同時更新當季規則；不修改玩家能力、裝備、積分、HP、體力。舊企劃保留在發布歷史。

MistConfig 新欄位（Key／Value）：

| Key | Value | 用途 |
|---|---:|---|
| StaminaPackCap | 10 | 補包與預告合計上限 |
| StaminaPackWarningMinutes | 30 | 預告分鐘 |
| StaminaPackEnergy | 10 | 每包恢復量 |
| AirdropVisionRadius | 2 | 共用視野半徑；2 = 5×5 |

Excel → GS → 發布流程保留。`maintenance482.gs` 已加入預設值與驗證；新增獨立 `sync_mist_resources487.gs`，可貼到目前 Apps Script 並執行 `syncMistResources487()`，只把正式企劃中上述四個缺少的 Key 加到 MistConfig，不覆蓋既有欄位、不發布、不碰玩家資料。必須在下次從表格發布前同步，避免舊 GS 的「全部內容一致」回讀檢查因缺少新 Key 顯示差異。尚未代替使用者更新 Apps Script／工作簿。

資料庫相容 guard：舊發布包若缺少新 Key，沿用目前正式值；若表格有明確值則保留並驗證。沒有把未確認的附件企劃整包發布。賽季中的規則固定；一般後續數值編輯於下季採用。

## 驗證

- 既有完整 `test:mist` 通過；新增 PGlite 真實 SQL/RPC 測試：10 個預告、到時出現、滿體力拒領、恢復與上限、補回、多人爭搶、丟失回應重試、視野隱私、台灣午夜、未領跨日、舊表格相容、匿名拒絕。
- Chromium / WebKit：1440×900、390×844、360×640，實際 reducer 驅動的棋盤、選視野、領補包、斷線重試、傳說開箱、領取後視野移除。
- 圖示 944 張解碼與全部 961 個素材雜湊驗證；78 段 inline JS 語法檢查。介紹／排行於 1440、1024、390、360 寬度可捲動且無水平超框。
- 實機 iOS 未登入代測；WebKit 為桌面測試引擎。

## 正式後端查驗

2026-11-18：已套用 migration `20261118043535`、部署 game-api v72，health `ok=true`。前版 v71 全部五檔與 main 相符並備份；只修改資源 reducer 與 trace action 清單。RLS 仍開啟、anon/authenticated 不能直接讀棋盤或呼叫 commit RPC。

Security advisors 前後一致，未新增問題；原有服務端專用表的 [RLS 無 policy 提示](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)、[anon definer 提示](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)、[authenticated definer 提示](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) 與 [Auth 密碼外洩保護設定](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) 均未在這次變更中調整。
