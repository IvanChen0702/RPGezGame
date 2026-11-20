# v507：迷霧棋盤同步卡住與物件點擊

## 可重現原因

- JSON 傳輸層遇到 HTTP 200、`ok:false` 會直接拋出帶有 `code/httpStatus` 的例外。迷霧原本只在收到回傳值時清除被拒絕的請求，實際例外路徑卻保留 pending，導致對手交戰中、六小時冷卻等拒絕後一直顯示同步中。
- 手動更新狀態清空錯誤訊息但沒有移除 pending，重試按鈕隨錯誤一起消失。
- 棋盤點擊在 loading/pending 時直接 return，因此連查閱玩家、怪物、旗幟或建築資訊都無反應。
- 設定 loading 後的第一次繪圖在 try/finally 外，若繪圖失敗也無法釋放 loading。

這些路徑已以本機測試重現；沒有取得該玩家當下的網路紀錄，因此不推定截圖一定是哪一個伺服器拒絕原因。

## 修正

- 明確的 MIST 業務拒絕解除 pending；MIST_RETRY、連線中斷與不明結果仍保留原請求編號、原 payload/revision，不產生新操作。
- 狀態更新保留待確認錯誤，pending 且未傳送中時也一定顯示重試入口；行動按鈕區分「同步中」與「待確認」。
- 同步時可查閱物件資訊，實際操作仍受原本的同步、距離、保護、體力規則限制；讀取完成後更新已開啟資訊窗的按鈕與內容。
- 初次繪圖納入 try/finally，確保釋放 loading。

## 驗證

- `BASELINE=1 node tools/tests/mist507-sync.cjs`：舊 main 在明確拒絕後未解鎖斷言失敗，確認重現。
- `node tools/tests/mist507-sync.cjs`：Chromium、WebKit；桌面與手機。涵蓋真實 JSON 傳輸層的 ok:false 拋錯、對手忙碌、冷卻、MIST_RETRY、未知結果保留、更新後重試入口、相同請求編號重試、玩家／怪物／旗幟／建築查閱、慢速讀取完成後按鈕恢復、繪圖錯誤釋放。
- `node tools/tests/mist506-prep.cjs`：三個桌面尺寸與手機整備回歸。
- 共用戰鬥產生器、網站打包與 diff 檢查通過。無後端或正式玩家資料修改。
