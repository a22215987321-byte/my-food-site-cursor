// lib/financeDailyBrief.js
// AI 爸爸每日財經新聞總結：Cron 預先生成，使用者開啟聊天時自動推送。
import { loadFinanceNews, formatFinanceContextForPrompt } from "./financeNews";

const GEMINI_MODEL = "gemini-2.5-flash";

const TOPIC_OPINIONS = [
  { test: /股|市|漲|跌|標普|納斯|道瓊|stoxx|stock|market/i, opinion: "股市波動是常態，別被短期消息牽著鼻子走，穩住心態比什麼都重要。" },
  { test: /利率|通膨|fed|央行|inflation|rate/i, opinion: "利率跟通膨會影響很多資產，但對一般家庭來說，先把現金流顧好才是第一優先。" },
  { test: /油|金|原物料|beef|energy|power/i, opinion: "原物料價格起伏會間接影響生活成本，日常開銷要留一點緩衝。" },
  { test: /科技|nvidia|ai|半導體|robot/i, opinion: "科技題材很熱，但熱門不代表適合每個人，別追風投資。" },
  { test: /房|地產|mortgage|housing/i, opinion: "房地產是大決定，一定要量力而為，別被別人的節奏帶著走。" },
  { test: /就業|失業|job|workforce/i, opinion: "就業數據反映景氣，但對個人來說，持續精進技能比盯數字實際。" },
  { test: /加密|比特|bitcoin|crypto/i, opinion: "加密資產波動極大，爸爸會建議只用你虧得起的小部分去碰，別 all in。" },
  { test: /退休|401|social security|pension/i, opinion: "退休規劃要趁早，但也不用一次到位，慢慢累積比較實際。" },
];

const OVERALL_CLOSINGS = [
  "今天消息不少，但記得：資訊是參考，決定權在你手上，穩健第一。",
  "整體來看市場還是在消化各種消息，別衝動操作，有疑問隨時跟爸爸聊。",
  "爸爸每天幫你看這些，就是希望你少踩坑、多一點從容。",
];

let briefCache = { dateKey: null, brief: null };

export function getTaipeiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(date);
}

export function formatTaipeiDateLabel(dateKey) {
  const [y, m, d] = dateKey.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function pickTopicOpinion(title, summary) {
  const blob = `${title}${summary}`;
  const hit = TOPIC_OPINIONS.find((t) => t.test.test(blob));
  return hit?.opinion || "這則消息值得留意，但別急著做出重大決定，先觀察一兩天。";
}

function detectOverallMood(items) {
  const blob = items.map((i) => `${i.titleZh || i.title} ${i.summaryZh || ""}`).join(" ").toLowerCase();
  if (/漲|high|surge|rally|新高/.test(blob)) return "市場今天偏樂觀，但樂觀時更要保持清醒。";
  if (/跌|drop|fall|危機|blackout|crisis/.test(blob)) return "今天偏空的消息多一些，別慌，恐慌往往是過度反應。";
  return OVERALL_CLOSINGS[Math.floor(Math.random() * OVERALL_CLOSINGS.length)];
}

export function generateRuleBasedDailyBrief(items, dateKey) {
  const label = formatTaipeiDateLabel(dateKey);
  const top = (items || []).slice(0, 6);
  if (!top.length) {
    return `【${label} · 爸爸今日財經總結】\n\n孩子，今天暫時抓不到最新財經消息，爸爸晚點再幫你整理。有想聊的理財話題先跟我說。\n\n（以上僅供陪伴聊天參考，非投資建議。）`;
  }

  const sections = top.map((it, i) => {
    const title = it.titleZh || it.title;
    const summary = (it.summaryZh || it.summaryEn || "").slice(0, 90);
    const opinion = pickTopicOpinion(title, summary);
    const detail = summary ? `（${summary}）` : "";
    return `${i + 1}. ${title}${detail}\n   👨 爸爸看法：${opinion}`;
  });

  const overall = detectOverallMood(top);
  return (
    `【${label} · 爸爸今日財經總結】\n\n` +
    `孩子，爸爸今天讀了 ${items.length} 則財經消息，幫你整理重點：\n\n` +
    `${sections.join("\n\n")}\n\n` +
    `📌 整體來說：${overall}\n\n` +
    `有想深入的話題，直接回覆我就好。\n\n` +
    `（以上僅供陪伴聊天參考，非投資建議。）`
  );
}

async function callGeminiDailyBrief(items, dateKey, apiKey) {
  const label = formatTaipeiDateLabel(dateKey);
  const newsBlock = formatFinanceContextForPrompt(items.slice(0, 15));
  const systemInstruction = {
    parts: [{
      text:
        "你是「AI 爸爸」，穩重可靠、懂財經時事。你要寫一份給孩子的「今日財經總結」。\n" +
        "規則：\n" +
        "1. 繁體中文。\n" +
        "2. 以爸爸對孩子說話的口吻，溫暖、務實、不說教。\n" +
        "3. 挑 4～6 則最重要新聞，每則用 1～2 句說明重點 + 你的看法。\n" +
        "4. 最後一段給「整體來說」的總結。\n" +
        "5. 不要條列過長，不要給具體買賣指令，結尾提醒非投資建議。\n" +
        "6. 開頭用格式：【YYYY年M月D日 · 爸爸今日財經總結】",
    }],
  };
  const userPrompt =
    `今天是 ${label}。以下是今日最新財經新聞，請寫出你的每日總結：\n\n${newsBlock}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction,
          generationConfig: { temperature: 0.75, maxOutputTokens: 900 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`gemini http ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("gemini empty brief");
    return text;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function generateFinanceDailyBrief(force = false) {
  const dateKey = getTaipeiDateKey();
  if (!force && briefCache.dateKey === dateKey && briefCache.brief) {
    return briefCache.brief;
  }

  const items = await loadFinanceNews(force);
  const apiKey = process.env.GEMINI_API_KEY;
  let summary;
  let engine = "rule";

  if (apiKey) {
    try {
      summary = await callGeminiDailyBrief(items, dateKey, apiKey);
      engine = "gemini";
    } catch (err) {
      console.error("[finance-daily-brief] gemini failed, falling back:", err.message);
    }
  }

  if (!summary) {
    summary = generateRuleBasedDailyBrief(items, dateKey);
  }

  const brief = {
    dateKey,
    dateLabel: formatTaipeiDateLabel(dateKey),
    summary,
    engine,
    newsCount: items.length,
    highlights: items.slice(0, 5).map((it) => ({
      title: it.titleZh || it.title,
      source: it.source,
      link: it.link,
    })),
    generatedAt: new Date().toISOString(),
  };

  briefCache = { dateKey, brief };
  return brief;
}
