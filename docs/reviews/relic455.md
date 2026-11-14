# 遺物探險手機遭遇預覽空節點錯誤（455）

## 根因與重現

`relicContinue144_()` 在 ready 階段進入手機版 `relicInfo144_()`。它先建立視窗，`relicModal144_()` 的 v429 外觀處理隨即重建 header，將舊 `.relic-eyebrow149` 換成 `.r429-header-copy > small`。預覽接著仍用舊 selector 直接設定 `textContent`，因此拋出 null 錯誤，外層動作保護顯示「操作尚未完成」。桌面版另有預覽流程，因此較不容易觸發。

本機在修正前重現 `Cannot set properties of null (setting 'textContent')`，且當時舊節點不存在、新副標題存在。此結構衝突可追溯至 `2d2a7008`（2026-11-13）的 `relicSkin429_`，不是裝備形象或伺服器鎖問題。

## 修正

- 新舊 header 均提供穩定的 `data-relic-eyebrow455` 標記，預覽沿標記更新並保留舊 selector 備援。
- 守衛圖取代新版 header 的原圖示，避免再追加大型圖片擠出手機視窗。
- 外觀重套不重建已完成的 header，保留遭遇文字、守衛圖及關閉控制。
- 沒有改動 relic 請求、伺服器序號、獎勵、HP／CD 規則或正式玩家資料。

## 驗證

`node tools/check_relic455.cjs` 使用本機 fixture 取代 relic 請求回應，外部網路全部封鎖；手機 390×844、320×568、844×390 與桌面 1440×900 均通過遭遇預覽、重套外觀、視窗邊界、進入整備／取消、保存／續玩、進入戰鬥、恢復戰鬥、戰鬥中禁止撤離、下一層、補給與成功撤離。

同時修正 `check_avatar454.cjs` 的測試設定：明確設定版面偏好，避免自動偵測覆蓋指定模式。重新跑過整套角色與技能測試，桌面及真正 mobile-ui 模式均通過，另以觸控事件確認 E／F 可施放。測試未使用正式帳號或正式後端交易；未宣稱 iOS 實機結果。
