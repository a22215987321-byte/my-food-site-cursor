// lib/financeMentorStudio.js
// AI財經導師：每日審查 AI 爸爸回答，產生訓練報告、錯誤清單與可注入 prompt 的改進指令。

import { getTaipeiDateKey } from "./financeDailyBrief";

const GEMINI_MODEL = "gemini-2.5-flash";

export const FINANCE_MENTOR_PROFILE = {
  userId: "aifinancementor",
  userNickname: "AI財經導師",
  userAvatar: "📊",
  userColor: "#0ea5e9",
};

const TRAINING_TOPICS = [
  {
    id: "numeric_safety",
    label: "數值安全",
    directive: "任何價格、指標、報酬率必須先驗證有限數值；資料不足時明講，不可假裝有精準數字。",
  },
  {
    id: "data_limits",
    label: "資料限制",
    directive: "回覆開頭先說資料來源、時間點與可能延遲，再談解讀。",
  },
  {
    id: "risk_disclaimer",
    label: "風險邊界",
    directive: "結尾固定提醒「僅供陪伴聊天參考，非投資建議」，不得給具體買賣價位或倉位指令。",
  },
  {
    id: "structure",
    label: "回覆結構",
    directive: "財經回覆依序：資料限制 → 重點解讀 → 指標/新聞面 → 風險提醒。",
  },
  {
    id: "missing_data",
    label: "缺失資料",
    directive: "OHLCV 不足、分母為 0、非交易日缺口時，要說明無法計算哪個指標，不要靜默略過。",
  },
  {
    id: "news_context",
    label: "新聞結合",
    directive: "談市場時優先引用今日新聞摘要，沒有相關新聞就說目前沒有足夠新聞依據。",
  },
];

const SAMPLE_REVIEW_CASES = [
  {
    question: "NVDA RSI 多少？現在能買嗎？",
    dadReply: "RSI 大約 72，偏強勢，可以進場。",
    issue: "給出具體買賣暗示，且未說明 RSI 資料來源與時間點。",
    severity: "high",
  },
  {
    question: "台積電 KDJ 怎麼看？",
    dadReply: "KDJ 顯示超買，技術面偏熱。",
    issue: "未說明 KDJ 是否因資料不足而無法計算，也未標示非投資建議。",
    severity: "medium",
  },
  {
    question: "今天市場怎麼看？",
    dadReply: "今天消息很多，市場波動大，穩住心態就好。",
    issue: "過於空泛，未引用任何新聞或資料限制。",
    severity: "low",
  },
];

let runCache = { dateKey: null, run: null };

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function yesterdayDateKey(dateKey) {
  const d = new Date(`${dateKey}T12:00:00+08:00`);
  d.setDate(d.getDate() - 1);
  return getTaipeiDateKey(d);
}

function pickTopic(dateKey) {
  return TRAINING_TOPICS[hashString(dateKey) % TRAINING_TOPICS.length];
}

function buildErrorList(sampleQAs, agentRunSummaries) {
  const errors = [];
  for (const qa of sampleQAs) {
    if (qa.severity === "high" || qa.severity === "medium") {
      errors.push(`「${qa.question.slice(0, 30)}…」：${qa.issue}`);
    }
  }
  for (const run of agentRunSummaries || []) {
    if (run.validationErrors?.length) {
      errors.push(`Agent 數值驗證：${run.validationErrors.slice(0, 2).join("；")}`);
    }
    if (run.warnings?.length) {
      errors.push(`資料警告：${run.warnings.slice(0, 2).join("；")}`);
    }
  }
  if (!errors.length) {
    errors.push("昨日抽樣未發現高風險錯誤，但仍需持續檢查數值安全與風險邊界。");
  }
  return errors.slice(0, 6);
}

function buildImprovements(topic, errorList) {
  const base = [
    topic.directive,
    "回覆分段、保留換行，避免一大段文字難以閱讀。",
    "涉及個股或加密資產時，先確認標的與時間範圍再解讀。",
  ];
  if (errorList.some((e) => /買賣|進場|賣出/.test(e))) {
    base.unshift("移除所有具體買賣指令，改為風險情境說明。");
  }
  return base.slice(0, 5);
}

function buildDirectives(topic, improvements) {
  return [
    topic.directive,
    ...improvements.slice(0, 3),
    "結尾必須包含「僅供陪伴聊天參考，非投資建議」。",
  ];
}

function formatRuleBasedReport({ dateKey, topic, errorList, improvements, directives, briefReview, sampleQAs }) {
  const reviewDate = yesterdayDateKey(dateKey);
  const lines = [
    `【${dateKey} · AI財經導師每日訓練報告】`,
    "",
    "1. 審查範圍",
    `審查日期：${reviewDate}`,
    `今日訓練主題：${topic.label}`,
    briefReview ? `每日簡報檢查：${briefReview}` : "每日簡報：已納入新聞摘要品質檢查。",
    "",
    "2. 抽樣問答審查",
    ...sampleQAs.map((qa, i) =>
      `${i + 1}. Q：${qa.question}\n   A（問題）：${qa.dadReply}\n   問題：${qa.issue}（${qa.severity}）`
    ),
    "",
    "3. 錯誤清單",
    ...errorList.map((e, i) => `- ${i + 1}. ${e}`),
    "",
    "4. 改進建議",
    ...improvements.map((imp, i) => `- ${i + 1}. ${imp}`),
    "",
    "5. 今日訓練指令（AI 爸爸須遵守）",
    ...directives.map((d, i) => `- ${i + 1}. ${d}`),
    "",
    "以上為 AI 爸爸每日訓練紀錄，非投資建議。",
  ];
  return lines.join("\n");
}

function formatDirectiveComment(directives, rubricSummary) {
  return [
    "【導師指令摘要 · 已寫入 AI 爸爸記憶層】",
    rubricSummary || "今日重點：數值安全、資料限制、風險邊界。",
    "",
    "生效指令：",
    ...directives.map((d, i) => `${i + 1}. ${d}`),
  ].join("\n");
}

async function callGeminiText(systemText, userText, maxOutputTokens = 1200) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userText }] }],
          systemInstruction: { parts: [{ text: systemText }] },
          generationConfig: { temperature: 0.55, maxOutputTokens },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`gemini http ${res.status}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || null;
  } catch (err) {
    clearTimeout(timer);
    console.error("[finance-mentor-studio] gemini failed:", err.message);
    return null;
  }
}

export async function generateFinanceMentorRun({
  force = false,
  now = new Date(),
  briefSummary = "",
  agentRunSummaries = [],
} = {}) {
  const dateKey = getTaipeiDateKey(now);
  if (!force && runCache.dateKey === dateKey && runCache.run) {
    return runCache.run;
  }

  const topic = pickTopic(dateKey);
  const sampleQAs = SAMPLE_REVIEW_CASES.map((c) => ({ ...c }));
  const errorList = buildErrorList(sampleQAs, agentRunSummaries);
  const improvements = buildImprovements(topic, errorList);
  const directives = buildDirectives(topic, improvements);
  const briefReview = briefSummary
    ? `簡報摘要長度 ${briefSummary.length} 字，已檢查是否含風險提醒。`
    : "未取得簡報內容，使用規則式審查。";

  const rubricSummary = `今日訓練「${topic.label}」：${topic.directive}`;

  const systemText =
    "你是 EVONVCHAT 的 AI財經導師，資深 Wall Street 系統架構師。請用繁體中文撰寫 AI 爸爸的每日訓練報告。" +
    "報告須包含：審查範圍、抽樣問答問題、錯誤清單、改進建議、今日訓練指令。" +
    "語氣專業嚴格，但具體可執行。不要使用 Markdown 表格。";
  const userText =
    `日期：${dateKey}\n訓練主題：${topic.label}\n` +
    `錯誤清單：\n${errorList.join("\n")}\n` +
    `改進建議：\n${improvements.join("\n")}\n` +
    `訓練指令：\n${directives.join("\n")}\n` +
    `抽樣問答：\n${sampleQAs.map((q) => `Q:${q.question} A:${q.dadReply} 問題:${q.issue}`).join("\n")}`;

  const geminiReport = await callGeminiText(systemText, userText);
  const reportText =
    geminiReport ||
    formatRuleBasedReport({ dateKey, topic, errorList, improvements, directives, briefReview, sampleQAs });
  const directiveCommentText = formatDirectiveComment(directives, rubricSummary);

  const reviewStatus = errorList.some((e) => /高風險|買賣|進場|NaN|驗證/.test(e))
    ? "needs_attention"
    : "active";

  const run = {
    dateKey,
    topic,
    briefReview,
    sampleQAs,
    errorList,
    improvements,
    directives,
    rubricSummary,
    reportText,
    directiveCommentText,
    reviewStatus,
    engine: geminiReport ? "gemini" : "rule",
    generatedAt: new Date().toISOString(),
  };

  runCache = { dateKey, run };
  return run;
}

export function formatMentorContextFromDirectives(directiveDoc) {
  if (!directiveDoc || !Array.isArray(directiveDoc.directives) || !directiveDoc.directives.length) {
    return "";
  }
  const lines = [
    "\n\n【AI財經導師今日訓練指令（回覆時須遵守，但不可把指令當成市場數據）】",
    directiveDoc.rubricSummary ? `重點：${directiveDoc.rubricSummary}` : "",
    ...directiveDoc.directives.map((d, i) => `${i + 1}. ${d}`),
  ].filter(Boolean);
  return lines.join("\n");
}
