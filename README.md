# RPGezGame

正式站：<https://rpgezgame.pages.dev/>。GitHub `main` 更新後由 Cloudflare Pages 部署；既有 Supabase 專案負責 Auth、玩家資料及 `game-api`。

| 位置 | 用途 |
| --- | --- |
| `index.html` | 正式 UI、樣式及遊戲前端程式，維持單一來源 |
| `assets/` | 正式遊戲使用的外部圖片與音效 |
| `tools/` | 打包、素材路徑檢查與裁切工具 |
| `tools/source-assets/relics/` | 重建敵人裁切素材的原圖，不部署 |
| `docs/asset-history/` | 歷史素材清單與設計參考，不部署 |
| `supabase/migrations/` | 需要核對線上狀態再套用的 SQL 更新 |
| `supabase/review/` | 資料庫唯讀盤點工具及待確認事項 |

- [專案架構與企劃資料流程](PROJECT_CONTEXT.md)
- [介面固定規則](AGENTS.md)
- [Cloudflare 部署設定](DEPLOYMENT.md)
- [本次清理結果](docs/cleanup437.md)
- [Supabase 唯讀盤點與限制](supabase/review/README.md)

## 維護檢查

```sh
python3 tools/audit_assets.py
python3 tools/package_site.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory _site
```

素材檢查涵蓋相容別名、固定路徑及 SVG 依賴；「沒有字面引用」只是待查清單，不能直接刪除。部分武器、場景路徑由程式組合，寵物立繪則由 Excel／`.gs` 發布的資料指定。

如需重建已修復的遺物敵人素材，可執行 `python3 tools/clip_relic_sprites436.py`；保留原始 WebP 編碼，以 SVG 裁切排除相鄰敵人碎片。

`_site/` 是可重建的輸出目錄，不提交 Git。打包只包含 HTML、favicon、`assets/`、必要時的執行期 `data/`、`_headers` 及 `_redirects`，不發布維護文件、後端 SQL、參考原圖或工具。`_redirects` 為 Cloudflare Pages 的舊圖片網址轉向規則，保護仍開著舊版頁面的玩家。
