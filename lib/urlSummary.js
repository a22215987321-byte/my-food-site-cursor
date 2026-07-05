// lib/urlSummary.js
// 「AI 哥哥」的網址讀取小工具：抓取網頁基本資訊（標題、描述、內文節錄），
// 讓沒有設定 GEMINI_API_KEY 時，也能做出基本的重點整理與看法（規則式備援）。

const UA = "Mozilla/5.0 (compatible; EvonVChatBot/1.0)";

export function extractFirstUrl(text) {
  const match = (text || "").match(/https?:\/\/[^\s<>"'）】]+/i);
  if (!match) return null;
  return match[0].replace(/[.,)\]】、。]+$/, "");
}

function decodeEntities(str) {
  return (str || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export async function fetchUrlSummaryData(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return { url, title: url, description: "", bodyText: "", ok: false, reason: `http ${res.status}` };

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html") && !contentType.includes("text")) {
      return { url, title: url, description: "", bodyText: "", ok: false, reason: "non-html" };
    }

    const html = (await res.text()).slice(0, 400000);
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i);
    const descMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i);

    const title = decodeEntities((ogTitleMatch?.[1] || titleMatch?.[1] || url).trim()).slice(0, 200);
    const description = decodeEntities((descMatch?.[1] || "").trim()).slice(0, 400);
    const bodyText = stripTags(html).slice(0, 3000);

    return { url, title, description, bodyText, ok: true };
  } catch (err) {
    clearTimeout(timer);
    return { url, title: url, description: "", bodyText: "", ok: false, reason: err.message };
  }
}

const CATEGORY_HINTS = [
  { test: /github\.com/i, label: "GitHub 專案", opinion: "如果是要拿來學習或參考架構，記得先看 README 跟授權條款再決定怎麼用，別整包直接搬。" },
  { test: /youtube\.com|youtu\.be/i, label: "YouTube 影片", opinion: "影片哥哥沒辦法直接看畫面，先從標題跟描述抓重點給你參考，想深入還是要自己點開看。" },
  { test: /news|新聞|times\.com|bbc|cnn|reuters|udn|ltn|chinatimes/i, label: "新聞報導", opinion: "新聞這種東西記得多看幾個來源，單一報導有時候會有立場，別只看一篇就下結論。" },
  { test: /shop|buy|product|amazon|momo|shopee|pchome/i, label: "商品／購物頁", opinion: "買東西前記得比價一下，也看看評價，別只看賣家自己寫的介紹。" },
  { test: /docs|documentation|developer|api\.|readme/i, label: "技術文件", opinion: "技術文件建議直接找範例程式碼對照著看，比整篇讀完更快抓到重點。" },
  { test: /blog|medium\.com|substack|方格子/i, label: "部落格文章", opinion: "部落格文章通常是個人觀點，讀起來當參考就好，實際情況還是要自己驗證。" },
];

export function pickUrlCategory(url, title) {
  const blob = `${url} ${title}`;
  return CATEGORY_HINTS.find((c) => c.test.test(blob)) || {
    label: "網頁內容",
    opinion: "哥哥看了一下大概內容，如果有你特別想知道的重點可以直接問我，我再幫你挖細節。",
  };
}

export function buildRuleBasedUrlSummary(data) {
  const { url, title, description, bodyText, ok } = data;
  if (!ok) {
    return (
      `這個連結哥哥暫時讀不到內容耶（可能對方網站擋了自動讀取，或需要登入才能看）。` +
      `你可以貼一下重點文字，或告訴我大概是什麼主題，哥哥幫你聊聊看法！\n🔗 ${url}`
    );
  }
  const category = pickUrlCategory(url, title);
  const gist = description || bodyText.slice(0, 140);
  const lines = [`哥哥幫你看了這個連結，大概是「${category.label}」：`, `📌 標題：${title}`];
  if (gist) lines.push(`📝 大意：${gist}${gist.length >= 140 ? "…" : ""}`);
  lines.push(`💬 哥哥看法：${category.opinion}`);
  return lines.join("\n");
}
