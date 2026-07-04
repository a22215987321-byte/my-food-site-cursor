# EvonVChat

www.evonvchat.com — 由 Cursor 管理。

## 產品定位

**EvonVChat 是一個即時社交聊天平台**，核心是「人與人之間的即時互動」：

- 即時聊天（公共大廳、好友私訊、群組）
- 好友系統（邀請、搜尋、狀態）
- 動態消息（貼文、圖片、影片、按讚）
- 個人檔案頁
- 打賞（Stripe）
- 螢幕分享直播（電影院）
- AI 新聞（每日自動彙整）

**不包含**語言學習／字典／單字卡功能——這些與「社交聊天」定位不符，已從產品中移除，讓核心體驗更聚焦。

## 開發

```bash
npm install
npm run dev
```

## AI 新聞功能

`pages/api/ai-news.js` 會即時抓取多個公開 RSS 來源（TechCrunch AI、VentureBeat AI、MIT Technology Review、The Verge AI、AI News），合併、去重、依發布時間排序後取最新 20 則，並對每一則做：

1. **AI 摘要**：用詞頻＋首句加權的抽取式摘要演算法，從原文中挑出最具代表性的 1-2 句話，不需要任何付費 LLM API。
2. **中文翻譯**：標題與摘要都會翻譯成繁體中文（透過翻譯服務），失敗時自動退回英文原文，不會讓整個功能掛掉。

其他設計考量：

- 不需要任何 API 金鑰或資料庫，純抓取公開資源。
- 翻譯請求有併發限制（同時最多 10 個），避免短時間內送出過多請求被擋。
- 透過 HTTP `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` 讓 Vercel 邊緣網路快取結果，兼顧「每日更新」與效能，也避免每次請求都重新跑一次翻譯流程。
- `vercel.json` 設定了每日 00:00 UTC 的 Cron Job 主動打一次這個 API，確保使用者一早打開就有當天最新內容；同時把這個 API 的 `maxDuration` 設為 30 秒，讓翻譯有足夠時間完成。

## 部署

Push 到 `main` 後，Vercel 專案 `my-food-site-cursor` 會自動部署。
