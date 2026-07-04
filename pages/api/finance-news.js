// pages/api/finance-news.js
// 每日彙整財經新聞 RSS，供 AI 爸爸引用；亦透過 CDN 快取與 Cron 預熱。
import { loadFinanceNews, getFinanceNewsSnapshot } from "../../lib/financeNews";

export default async function handler(req, res) {
  try {
    const items = await loadFinanceNews(req.query.refresh === "1");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({
      updatedAt: getFinanceNewsSnapshot().updatedAt || new Date().toISOString(),
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("[finance-news] error:", err);
    res.status(500).json({ error: "failed to load finance news", items: [] });
  }
}
