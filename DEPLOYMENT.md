# 正式站：GitHub Pages

網址：https://ivanchen0702.github.io/RPGezGame/

## 首次啟用

1. 在 GitHub 儲存庫 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。
2. 確認 **Actions → Deploy GitHub Pages** 成功。若設定完成前流程曾失敗，使用 **Run workflow** 重新執行 main。
3. 在 Supabase 專案 `ynzaotitxntrhubwfinr` 的 Edge Functions secrets 更新 `GAME_ALLOWED_ORIGINS`。保留現有允許來源，新增 `https://ivanchen0702.github.io`；這是 origin，不含 `/RPGezGame/` 或結尾斜線。例如遷移期間可保留 `https://rpgwebezgame.netlify.app,https://ivanchen0702.github.io`。不要將後端 service role key 加入前端或 GitHub Pages。
4. 若使用 OAuth／郵件登入跳轉，在 Supabase Authentication → URL Configuration 設定新站 Site URL 及允許的 Redirect URLs。現有帳密登入仍需第 3 步的 API 來源白名單。
5. 驗證新站的登入、角色讀取、素材、戰鬥和返回城鎮，再停用 Netlify 站台及其自動部署，並移除舊 origin。

雲端帳號仍使用同一個 Supabase 專案。瀏覽器 localStorage 依 origin 分開，舊站的登入狀態、偏好及未綁定訪客存檔不會自動出現在新站；遷移前應在舊站綁定帳號或使用遊戲的訪客進度下載功能保存資料。

## 後續更新

將遊戲變更推送至 `main`，工作流程會自動部署。公開成品只包含 `index.html`、`favicon.ico`、`assets/`、`data/` 和 `.nojekyll`，後端參考檔、Git 設定及文件不會被打包。

## 本機驗證

```sh
python3 .github/scripts/package_site.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace
```

在瀏覽器以專案子路徑開啟 `/RPGezGame/_site/`，檢查資源不依賴網域根目錄或 Netlify 轉址。登入還需要後端允許本機開發 origin。GitHub Pages 不支援 Netlify `_headers`／`_redirects`；目前遊戲使用內嵌素材解析表與直接素材網址。
