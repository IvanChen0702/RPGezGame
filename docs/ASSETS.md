# 素材分類與相容路徑（456）

正式 UI 的 HTML／CSS／JS 仍全部在 `index.html`。圖片改為實體檔，內嵌的 224 份 WebP 已原封不動抽出；723 個原有公開資源全部保留內容。17 張桌面戰鬥背景另外新增，沒有重新編碼既有 WebP。

| 目錄（`assets/images/` 下） | 用途 |
| --- | --- |
| `characters/player/{male,female}/{heads,bodies,actions}` | 男女頭部、防具身體與動作 |
| `characters/player/weapons` | 角色持用武器，與道具 icon 分開 |
| `characters/player/{portraits,dialogue,legacy}` | 頭像、對話立繪與保留的歷史組合圖 |
| `characters/{npcs,pets,enemies}` | NPC、寵物、敵人；寵物分頭像／動畫，敵人依模式分類 |
| `icons/equipment/{head,armor,weapon,ring,special,shared}` | 裝備 icon，依目前企劃 ItemID／Slot 分類；未能確認槽位的圖保留於 shared |
| `icons/{gems,items,skills,atlases}` | 寶石、消耗品、技能、共用圖集 |
| `backgrounds/battle/{desktop,mobile}` | 桌面重繪版、原有手機／降級版戰鬥背景 |
| `backgrounds/{town,facilities,mode-entries,mode-hubs}` | 城鎮、設施、模式入口與模式頁背景 |
| `ui/{frames,interface,leaderboard,settlement,chests,rewards}` | 框線、操作介面、排行、結算與開箱素材 |
| `branding` | 網站圖示、公開分享封面 PNG |

`assets/audio/` 原有的 music／effects／voices／ui 分類維持不變。

## 路徑與維護

- `index.html` 的 `assetRegistry393_.paths` 將原路徑直接指向新實體檔，`prefixes` 保留早期路徑前綴。動態網址一律通過 `assetSrc393_`／`assetHtml393_`。已分類的靜態網址直接使用新路徑。
- `_redirects` 保留 748 個原公開網址的單次 301，支援舊客戶端與外部引用；不可產生循環或轉址鏈。前端內部動態路徑不依賴轉址。
- `assets/images/icons/items`／`skills` 的檔名保留短內容雜湊，避免搬移時與原公開同名檔衝突。
- [catalog456.json](assets/catalog456.json) 記錄每個新路徑、搬移前來源、大小及 SHA-256，作為這次無損搬移證據。`previous: null` 代表本次新增的桌面背景。
- [battle-scenes456.json](assets/battle-scenes456.json) 記錄重繪原生尺寸及站立基準；執行時使用 index.html 中同值的 `DESKTOP_SCENES456_`，不額外下載資料檔。
- 新背景的站立基準為圖片高度 74%；等比例縮放後與 `pixelFloor203_()` 對齊，角色與陰影使用相同基準。桌面獨立靜態背景層最多約 400 萬像素，特效畫布仍約 160 萬；手機不下載桌面圖，桌面載入失敗使用原圖。
- 新舊頭部與防具由同一角色合成器處理：舊頭部含頸部、新頭部截止於下顎，混搭時校正下顎並用新防具領口遮蓋多餘頸部。待機、攻擊、施法、整備與城鎮共用此規則。

修改素材後執行 `python tools/audit_assets.py`、`python tools/package_site.py`，以及相關瀏覽器檢查。歷史素材沒有因「找不到直接引用」而被刪除。
