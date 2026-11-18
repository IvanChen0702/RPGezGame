# 試算表仍要求 BoxingUnlockFloor

使用者截圖的錯誤為「企劃驗證未通過：缺少遊戲設定：BoxingUnlockFloor」。這表示執行中的驗證器仍含退役拳擊機設定的必填檢查；不能據此判定其他企劃資料有錯。

目前 main 的 `tools/planning/maintenance482.gs` 已移除這項要求。網站更新不會更新 Google Apps Script；只貼入獨立的清理／資源同步 helper，也不會替換主程式內的舊驗證器。尚未取得使用者 Apps Script 原始碼，無法區分是整份主程式尚未換版，或另有舊檔案覆蓋定義。

## 處理方式

1. 先備份既有 Apps Script 主程式，再以目前 main 的 `tools/planning/maintenance482.gs` **整份替換**舊主程式，不要追加為第二份主程式。保留 Script Properties、現有觸發器與其他非重複的輔助檔。
2. 全專案搜尋 `BoxingUnlockFloor`，確認沒有另一份舊驗證器；也檢查 `RPG411`、`validatePlanningDataForPublish` 是否有重複的主程式定義。不要直接刪除整個含共用功能的檔案。
3. 儲存後執行 `validatePlanningDataForPublish()`。此步只驗證，不發布。此次排錯不需要執行裝備等級回填或一次性刪除工具。
4. 若尚未同步 487 的四項迷霧資源設定，先依 `mist487-resources.md` 執行獨立 `syncMistResources487()`，再驗證。主程式完整替換與四項設定同步是不同工作。
5. 若仍有相容 Web App 呼叫，需將原部署切換至新的版本；試算表選單／編輯器直接執行則使用已儲存程式，不需要為了驗證另建部署網址。

不要為繞過錯誤將 `BoxingUnlockFloor` 填回 GameConfig，也不要停用全部企劃驗證。

## 本機核對

- 最新完整 GS 語法解析通過。
- 實際執行 GS 中的 RPG411 驗證器：沒有 BoxingUnlockFloor 的 65 關合成企劃通過；刪除仍使用的 WorldBossUnlockFloor 後正確拒絕。
- 未讀取或變更使用者的 Apps Script、試算表、憑證、排程與正式企劃；完整工作簿是否另有錯誤，需更新 GS 後執行驗證確認。
