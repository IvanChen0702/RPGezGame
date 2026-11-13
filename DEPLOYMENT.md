# 正式站：Cloudflare Pages

正式網址：https://rpgezgame.pages.dev/

GitHub `main` 是遊戲原始碼來源；Cloudflare Pages 負責正式站部署。不再執行 GitHub Pages 工作流程。

## 首次設定

在 Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git，連接 `IvanChen0702/RPGezGame`：

| 欄位 | 值 |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | 留空（儲存庫根目錄） |
| Build command | `python3 tools/package_site.py` |
| Build output directory | `_site` |

不要把輸出目錄設為儲存庫根目錄，以免將參考文件及開發工具公開。這是靜態 Pages 專案，不需要 Workers 部署指令、Wrangler 或額外套件。

首次部署會獲得實際的 `https://<專案名稱>.pages.dev` 網址。可再於 Custom domains 綁定自訂網域。取得正式網址後，建議在 Pages 的 Production 環境變數設定非機密的 `SITE_URL`（完整正式網址，含 `https://`），再重新部署，讓分享網址和封面指向穩定的正式站。未設定時，打包程式使用已建立的穩定正式網址 `https://rpgezgame.pages.dev/`，不使用帶部署雜湊的預覽網址。

## Supabase 登入來源

在專案 `ynzaotitxntrhubwfinr` 的 Edge Functions secrets 更新 `GAME_ALLOWED_ORIGINS`：保留現有來源，新增正式站的 origin：`https://rpgezgame.pages.dev`。此值不含路徑或結尾斜線；多個 origin 用逗號分隔。自訂網域也需明確加入。每個預覽部署是不同的 origin，未列入白名單時不能登入，不應為方便預覽而放寬成任意來源。

這是後端設定，不是 Cloudflare 前端環境變數。不要將 service role key 或其他後端機密放入前端、Git 或 Pages 公開成品。若使用 OAuth／郵件登入跳轉，也要更新 Supabase Authentication → URL Configuration 的 Site URL 與 Redirect URLs。

雲端帳號沿用同一個 Supabase 專案。localStorage 依 origin 分開，舊站登入狀態、偏好及未綁定訪客存檔不會自動轉移；應先在舊站綁定帳號或使用訪客進度下載功能保存資料。

## 驗證與切換

確認 Cloudflare 部署成功並檢查登入、角色讀取、場景素材、移動、競技場頁籤和出口。驗證後再停用舊 Netlify 站台與 GitHub Pages，並清理不再使用的 Supabase origin。GitHub Pages 若曾啟用，可在 GitHub Settings → Pages 使用 Unpublish site。

之後將更新推送至 `main`，Cloudflare Git integration 會自動部署。公開成品只有遊戲 HTML、圖示、素材、資料及 Cloudflare 支援的 `_headers` 快取與 `_redirects` 舊圖片轉向規則，沒有後端參考檔或 Git 設定。

## 本機檢查

```sh
python3 tools/package_site.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory _site
```

可用 `SITE_URL=https://實際正式站網域 python3 tools/package_site.py` 檢查分享資訊；本機素材仍使用相對資源路徑，分享資訊預設指向正式站。所有檔案均檢查 Cloudflare Pages 的單檔 25 MiB 上限。後端白名單仍需允許本機 origin 才能測試登入。

## 城鎮同行寵物及權限更新（439／440）

原 436 的 presence ID 關聯已由線上盤點確認有誤；應依 [更新說明](supabase/README.md) 套用新的 439 寵物修正及 440 專案授權修正，不要重新執行歷史 436 或因 supabase_admin 權限失敗的 438。平台角色的預設授權另由具權限管理員處理 441，驗證報告會保留其待處理狀態。這些 SQL 必須由已連線的 Supabase 管理工具執行；GitHub／Cloudflare 部署不會自動套用。SQL、測試與說明不會打包至公開網站。
