# 兩個人的西班牙

evonvchat.com 的正式電子書網站。網站保留原有 GitHub repository、Vercel project、`main` 部署分支與自訂網域連線，內容已改為無後端、無登入功能的純靜態網站。

## 本機執行

```bash
npm install
npm run dev
```

Production build：

```bash
npm run build
npm start
```

預設網址為 `http://localhost:3000`，也可將連接埠作為參數傳給伺服器腳本。

## 內容結構

- `content/index.html`：電子書首頁與正文 HTML
- `content/scene-gallery.html`：15 章場景圖頁 HTML
- `content/scene-openers.html`：15 章場景首頁與句子使用時機 HTML
- `content/scene-dialogues.html`：15 章整頁場景對話 HTML
- `styles/ebook.css`：原書版面與響應式閱讀樣式
- `public/app.js`：頁碼、縮放、單／雙頁與列印控制
- `public/assets/`：電子書所需的全部圖片
- `scripts/build.mjs`：產生 `dist/` 並驗證本機路徑、大小寫及缺失資源

舊登入、聊天室、會員、付款、AI、API 與舊路由均已移除。Vercel 會依 `vercel.json` 執行 build 並發布 `dist/`。
