// pages/api/ai-news.js
// 每天自動彙整 AI 新聞：抓取多個公開 RSS 來源，合併、去重、依時間排序，
// 透過 CDN 邊緣快取（s-maxage）達到「每日更新」效果，不需要額外的資料庫或金鑰。
import Parser from "rss-parser";

const FEEDS = [
  { name: "TechCrunch AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/" },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { name: "AI News", url: "https://www.artificialintelligence-news.com/feed/" },
];

const parser = new Parser({ timeout: 8000 });

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).slice(0, 8).map((item) => ({
      title: item.title || "",
      link: item.link || "",
      source: feed.name,
      publishedAt: item.isoDate || item.pubDate || null,
      summary: stripHtml(item.contentSnippet || item.content || item.summary || "").slice(0, 220),
    }));
  } catch (err) {
    console.error(`[ai-news] failed to fetch ${feed.name}:`, err.message);
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    let items = results.flat().filter((item) => item.title && item.link);

    // 去重（同標題只留一則）
    const seen = new Set();
    items = items.filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    items = items.slice(0, 20);

    // 邊緣快取 1 小時，背景重新驗證最多 24 小時 → 平台每天都能拿到新內容，
    // 又不會每次請求都重新抓取所有 RSS 來源。
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (err) {
    console.error("[ai-news] error:", err);
    res.status(500).json({ error: "failed to load AI news", items: [] });
  }
}
