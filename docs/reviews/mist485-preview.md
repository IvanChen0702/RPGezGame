# 485：迷霧戰境圖解說明

使用者已確認採用圖解方向。本次與486動態配點按鈕一起交付。

- 入口改成六張圖解卡：出生補給、探索視野、擊敗得分、插旗奪旗、補給鍛造、死亡重生。
- 使用既有迷霧背景、兩種旗、寶箱、怪物、補給站與鐵匠鋪素材。桌面三欄、手機兩欄，保留模式內容捲動。
- 縮短主標及副文案，完整規則仍在預設收起的 details；上方帳號橫幅未修改。
- 獎勵使用現有 rankRewardTierHtml_／rankRewardLootHtml_／rank-rewards-arena58，讀取原 MistRankRewards，不更改名次與數量。手機為名次＋獎勵橫列。
- Chromium 1440px／390px：六卡、圖檔載入、無橫向溢出、四組獎勵已檢查。設計截圖為完整內容展開的拍攝畫布，實際手機維持可捲動視窗。
- 預覽圖在 /workspace/outputs/mist485/，產圖程式 tools/preview_mist485.cjs（localhost:8443）。

部署前補充驗證見 tools/tests/mist485-ui.cjs：Chromium／WebKit，1440、1024、390、360px，六張卡、完整規則展開／收合、真實高度捲動、競技場共用獎勵卡與無橫向溢出。
