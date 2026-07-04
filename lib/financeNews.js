// lib/financeNews.js
// 抓取多個公開財經 RSS，合併、去重、摘要、翻譯，供 AI 爸爸引用最新時事與看法。
import Parser from "rss-parser";

const FEEDS = [
  { name: "中央社財經", url: "https://www.cna.com.tw/rss/money.xml", lang: "zh" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", lang: "en" },
  { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/", lang: "en" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", lang: "en" },
  { name: "CNBC", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", lang: "en" },
  { name: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews", lang: "en" },
];

const parser = new Parser({ timeout: 8000 });

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of", "in", "on", "for",
  "with", "that", "this", "it", "as", "at", "by", "from", "be", "been", "has", "have", "had",
  "will", "would", "can", "could", "its", "their", "said", "says", "about", "into", "after", "over",
  "more", "than", "which", "who", "what", "when", "how", "new", "also", "one", "two", "first",
]);

const FINANCE_KEYWORDS = [
  "股", "市", "漲", "跌", "財", "經", "投", "資", "理", "財", "金", "融", "銀", "行", "利", "率",
  "通膨", "景氣", "經濟", "匯", "美元", "台幣", "人民幣", "油", "金", "原物料", "比特", "加密",
  "fed", "央行", "聯準", "nasdaq", "s&p", "道瓊", "標普", "台積", "半導體", "房", "地產", "etf",
  "基金", "債", "就業", "失業", "gdp", "新聞", "消息", "最新", "今天", "本週", "看法", "分析",
  "stock", "market", "crypto", "bitcoin", "inflation", "rate", "economy", "trade", "tariff",
];

let cache = { items: [], updatedAt: 0 };
const CACHE_TTL_MS = 55 * 60 * 1000; // 略短於 CDN 快取，確保 AI 爸爸拿到較新內容

function stripHtml(html = "") {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function extractiveSummary(rawText, maxSentences = 2, maxLen = 280) {
  const text = stripHtml(rawText);
  if (!text) return "";
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)?.map((s) => s.trim()).filter(Boolean) || [text];
  if (sentences.length <= maxSentences) return text.slice(0, maxLen);
  const freq = {};
  const allWords = text.toLowerCase().match(/[a-z\u4e00-\u9fff']+/g) || [];
  allWords.forEach((w) => {
    if (!STOPWORDS.has(w) && w.length > 1) freq[w] = (freq[w] || 0) + 1;
  });
  const scored = sentences.map((s, idx) => {
    const words = s.toLowerCase().match(/[a-z\u4e00-\u9fff']+/g) || [];
    const score = words.reduce((acc, w) => acc + (freq[w] || 0), 0) / Math.max(words.length, 1);
    return { s, idx, score: idx === 0 ? score * 1.3 : score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSentences).sort((a, b) => a.idx - b.idx).map((t) => t.s).join(" ").slice(0, maxLen);
}

async function translateToZh(text) {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-TW&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`translate http ${res.status}`);
    const data = await res.json();
    return (data?.[0] || []).map((seg) => seg?.[0] || "").join("").trim() || text;
  } catch (err) {
    console.error("[finance-news] translate failed:", err.message);
    return text;
  }
}

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
    return (result.items || []).slice(0, 10).map((item) => {
      const raw = item.contentSnippet || item.content || item.summary || "";
      const title = item.title || "";
      const summaryRaw = extractiveSummary(raw, 2);
      return {
        title,
        link: item.link || "",
        source: feed.name,
        publishedAt: item.isoDate || item.pubDate || null,
        summaryEn: feed.lang === "en" ? summaryRaw : "",
        titleZh: feed.lang === "zh" ? title : "",
        summaryZh: feed.lang === "zh" ? summaryRaw : "",
        lang: feed.lang,
      };
    });
  } catch (err) {
    console.error(`[finance-news] failed to fetch ${feed.name}:`, err.message);
    return [];
  }
}

export async function loadFinanceNews(force = false) {
  if (!force && cache.items.length && Date.now() - cache.updatedAt < CACHE_TTL_MS) {
    return cache.items;
  }

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
  items = items.slice(0, 30);

  items = await mapWithConcurrency(items, 8, async (item) => {
    if (item.lang === "zh") {
      return { ...item, titleZh: item.titleZh || item.title, summaryZh: item.summaryZh || item.summaryEn || "" };
    }
    const [titleZh, summaryZh] = await Promise.all([
      translateToZh(item.title),
      translateToZh(item.summaryEn || item.title),
    ]);
    return { ...item, titleZh, summaryZh };
  });

  cache = { items, updatedAt: Date.now() };
  return items;
}

export function isFinanceTopic(text = "") {
  const lower = text.toLowerCase();
  return FINANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function tokenize(text = "") {
  return (text.toLowerCase().match(/[a-z\u4e00-\u9fff]{2,}/g) || []);
}

export function findRelevantFinanceNews(message, items, limit = 4) {
  if (!items?.length) return [];
  const msgTokens = new Set(tokenize(message));
  const scored = items.map((item) => {
    const blob = `${item.titleZh || item.title} ${item.summaryZh || item.summaryEn || ""}`.toLowerCase();
    const itemTokens = tokenize(blob);
    let score = 0;
    itemTokens.forEach((t) => { if (msgTokens.has(t)) score += 2; });
    FINANCE_KEYWORDS.forEach((kw) => {
      if (message.includes(kw) && blob.includes(kw.toLowerCase())) score += 3;
    });
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score || new Date(b.item.publishedAt || 0) - new Date(a.item.publishedAt || 0));
  const relevant = scored.filter((s) => s.score > 0).slice(0, limit).map((s) => s.item);
  return relevant.length ? relevant : items.slice(0, Math.min(limit, 3));
}

export function formatFinanceContextForPrompt(items) {
  if (!items?.length) return "（目前暫時無法取得最新財經新聞，請依一般理財常識回覆，並提醒對方留意風險。）";
  return items.map((it, i) => {
    const when = it.publishedAt ? new Date(it.publishedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) : "未知時間";
    return `${i + 1}. [${it.source} · ${when}] ${it.titleZh || it.title}\n   摘要：${it.summaryZh || it.summaryEn || "無"}`;
  }).join("\n");
}

export function getFinanceNewsSnapshot() {
  return { updatedAt: cache.updatedAt ? new Date(cache.updatedAt).toISOString() : null, count: cache.items.length };
}
