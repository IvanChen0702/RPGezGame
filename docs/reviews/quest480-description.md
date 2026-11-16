# 任務說明 480 修正

使用者回報「重要的搭檔」目標為第 5 層，說明仍為第 20 層。

確認公開企劃版本 20261116-033425-energy478：lily_partner 的 main_clear.TargetID=5，Quests 未填 Description。index.html 的 questDescription373 因此使用 v373 寫死的第 20 層說明。先前 475 修正 QuestDialogues 與目標標籤，但漏掉此 HTML 備用說明。

移除六筆按 QuestID 寫死的條件、物品數量與獎勵敘述。Description／description／Summary 仍優先採用企劃自訂文字，空白時改從相同的 QuestObjectives 自動產生；共用 questGoalLabel368，區分已通關可計入、接取後累積及交付物品。獎勵繼續直接使用 QuestRewards，選擇數亦改按群組實際項目計算。

驗證 check_quest480.cjs、check_quest475.cjs、正式企劃資料的桌面／手機實際對話窗及 package_site.py。任務目標、判定、獎勵與既有玩家進度未更動，無後端部署或 .gs 操作。
