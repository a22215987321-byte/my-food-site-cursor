// pages/api/ai-news.js
// 每天自動彙整 AI 新聞：抓取多個公開 RSS 來源，合併、去重、依時間排序，
// 對每篇文章做重點摘要（AI 總結）並翻譯成中文，
// 透過 CDN 邊緣快取（s-maxage）達到「每日更新」效果，不需要任何 API 金鑰或資料庫。
import Parser from "rss-parser";

const FEEDS = [
  { name: "TechCrunch AI", url: "https://techcrunch.com/tag/artificial-intelligence/feed/" },
  { name: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
  { name: "MIT Tech Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" },
  { name: "The Verge AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { name: "AI News", url: "https://www.artificialintelligence-news.com/feed/" },
];

const parser = new Parser({ timeout: 8000 });

const STOPWORDS = new Set([
  "the","a","an","and","or","but","is","are","was","were","to","of","in","on","for",
  "with","that","this","it","as","at","by","from","be","been","has","have","had",
  "will","would","can","could","its","their","he","she","they","we","you","i","not",
  "said","says","about","into","after","over","more","than","which","who","what",
  "when","how","new","also","one","two","first",
]);

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// 簡易「AI 總結」：以詞頻＋首句加權挑出最具代表性的 1-2 句，做成摘要。
// 不依賴任何付費 LLM API，避免使用者需要額外申請、管理金鑰。
function extractiveSummary(rawText, maxSentences = 2, maxLen = 320) {
  const text = stripHtml(rawText);
  if (!text) return "";

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [text];
  if (sentences.length <= maxSentences) return text.slice(0, maxLen);

  const freq = {};
  const allWords = text.toLowerCase().match(/[a-z']+/g) || [];
  allWords.forEach((w) => {
    if (!STOPWORDS.has(w) && w.length > 2) freq[w] = (freq[w] || 0) + 1;
  });

  const scored = sentences.map((s, idx) => {
    const words = s.toLowerCase().match(/[a-z']+/g) || [];
    const score = words.reduce((acc, w) => acc + (freq[w] || 0), 0) / Math.max(words.length, 1);
    return { s, idx, score: idx === 0 ? score * 1.3 : score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, maxSentences).sort((a, b) => a.idx - b.idx);
  return top.map((t) => t.s).join(" ").slice(0, maxLen);
}

async function translateToZh(text) {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`translate http ${res.status}`);
    const data = await res.json();
    const translated = (data?.[0] || []).map((seg) => seg?.[0] || "").join("");
    return translated.trim() || text;
  } catch (err) {
    console.error("[ai-news] translate failed:", err.message);
    return text; // 翻譯失敗時優雅退回英文原文，不讓整個功能掛掉
  }
}

// 限制同時翻譯請求數量，避免瞬間對翻譯服務發送過多請求被擋
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function fetchFeed(feed) {
  try {
    const result = await parser.parseURL(feed.url);
    return (result.items || []).slice(0, 8).map((item) => {
      const raw = item.contentSnippet || item.content || item.summary || "";
      return {
        title: item.title || "",
        link: item.link || "",
        source: feed.name,
        publishedAt: item.isoDate || item.pubDate || null,
        summaryEn: extractiveSummary(raw, 2),
      };
    });
  } catch (err) {
    console.error(`[ai-news] failed to fetch ${feed.name}:`, err.message);
    return [];
  }
}

export default async function handler(req, res) {
  try {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    let items = results.flat().filter((item) => item.title && item.link);

    const seen = new Set();
    items = items.filter((item) => {
      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    items = items.slice(0, 20);

    items = await mapWithConcurrency(items, 10, async (item) => {
      const [titleZh, summaryZh] = await Promise.all([
        translateToZh(item.title),
        translateToZh(item.summaryEn),
      ]);
      return { ...item, titleZh, summaryZh };
    });

    // 邊緣快取 1 小時，背景重新驗證最多 24 小時 → 平台每天都能拿到新內容，
    // 也讓耗時的翻譯／摘要流程不需要每次請求都重新跑一次。
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ updatedAt: new Date().toISOString(), items });
  } catch (err) {
    console.error("[ai-news] error:", err);
    res.status(500).json({ error: "failed to load AI news", items: [] });
  }
}
