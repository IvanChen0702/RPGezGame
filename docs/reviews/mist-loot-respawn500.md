# 迷霧戰境：超量戰利品整理與重生提示修正

## 行為

- 返回棋盤且存在待收戰利品時，先完成寶箱／資源結果提示，再顯示行囊空間不足提示，開啟既有整備視窗的「背包 → 戰利品」。頁內保留整理說明。
- 同次棋盤停留不重複強制開窗；部分整理後關閉也不重開。再次返回棋盤或新增待收物品時重新提醒。
- 收取、卸裝（包含手機選裝視窗）、拔寶石與容量顯示統一讀取 API inventoryCapacity499，備援讀企劃，預設 20。移除殘留的前端 10 格判斷。
- 死亡與重生清除 chestReveals471、supplyReceipt481、resourceReceipt487、roadChestReceipt492。重生再次清理可處理舊版本已死亡但仍留有提示的角色；不重設 supplied_on 或其他每日領取限制。
- 前端不顯示已不在背包／待收區的舊寶石提示；寶箱動畫完成、確認操作前均驗證當前角色存活與 receipt 存在。資料更新使 receipt 失效時移除舊視窗，新重生補給仍照常開啟。

## 驗證

- `npm run test:mist`：完整迷霧回歸（含戰鬥、狀態、重試、掉落、容量、企劃發布）。擴充 respawn484：勝負／同歸於盡、死亡清理、舊死亡紀錄重生、每日補給限制保留、新補給箱四件裝備。
- `tools/tests/mist500-ui.cjs`：Chromium / WebKit，1440×900、390×844、320×568；超量提醒、返回再提示、滿 20 格停收、騰出一格後收取、開箱優先、舊寶石排除、動畫中死亡、新重生開箱。
- `tools/tests/mist495-ui.cjs`：Chromium / WebKit 四種尺寸，既有戰後返回／整備、重試與開箱銜接回歸。
- `tools/tests/mist499-ui.cjs`：Chromium 三種尺寸，20 格與容量標示。
- 共享戰鬥生成器無變動；網站封裝 1020 檔；`git diff --check` 通過。

## 部署

僅更新前端與 game-api 的 mist-runtime468.js；無 SQL migration、企劃欄位或 .gs 修改。部署前確認線上 game-api v76 的五個檔案與 main 相同，備份於執行環境 `/workspace/backups/game-api500`。既有驗證方式與其餘後端檔案保持一致。
