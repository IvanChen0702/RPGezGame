# 484：背包特效、戰報時區、連戰與重生體力

- 一般／迷霧背包的裝備格接入 `decorateItemBorders_` 與整備 `prepare-flow238` 同一組 CSS；稀有度邊框、強化反光速度／透明度、3px 框及減少動態設定共用。寶石、消耗品與商店不受新增標記影響；棋盤與條列都適用。
- 迷霧戰報使用 `Asia/Taipei`、24 小時制與秒數；儲存時間仍為 UTC。無法解析的舊標籤保留原文。
- 連戰根因：`ensureSupabaseAccess_` 正常更新 access token，但控制器、結果歸屬及重試入口拿 token 字串判定身分，導致提前停止或無法接續。改用既有 accountId + characterSessionGeneration；登出／換帳號仍失效。不更動戰鬥／獎勵結算與請求恢復協定；網路錯誤仍循原有安全停止流程。
- 迷霧 PvP 死亡（主動挑戰失敗、防守被擊敗、雙方同歸於盡）標記一次性的重生補體力。確認重生時使用企劃 EnergyCap（正式為20）並重置恢復時計，消耗標記。NOT_DEAD 及原有請求收據防重送；怪物戰敗不補滿。舊版已死亡且沒有新標記的紀錄不追溯修改。
- 不需要資料庫 migration 或 `.gs` 更新；部署 `game-api` 原5個檔案，只變更 mist-runtime468.js，保留原verify_jwt與內部身分驗證。

驗證：series484 主線／副本每場結算及開戰換token仍10/10，登出／換帳號停止；equipment484 Chromium/WebKit 手機與桌面一般整備／兩種背包／條列的computed style相同、減少動態、跨日台灣時間；preparation471 原整備操作與隔離；test:mist 全套（含320共用戰鬥組合）；mist-respawn484 20體力、死亡類型、重複重生不補體力。所有內嵌JS語法與正式打包檢查。
