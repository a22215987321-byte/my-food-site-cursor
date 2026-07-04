// pages/api/ai-companion.js
// AI 陪伴角色（AI 爸爸／AI 媽媽）的回覆產生 API。
//
// 預設不需要任何金鑰：直接使用 lib/aiCompanion.js 裡的規則式回覆。
// 如果在 Vercel 專案設定了環境變數 GEMINI_API_KEY（免費在 https://aistudio.google.com/apikey 申請），
// 會自動改用 Google Gemini 生成更自然、真正「聽得懂」上下文的回覆；
// 如果 Gemini 呼叫失敗（金鑰錯誤、額度用完、逾時等），會自動優雅退回規則式回覆，不會讓聊天中斷。
import { generateCompanionReply, COMPANION_META } from "../../lib/aiCompanion";

const GEMINI_MODEL = "gemini-2.5-flash";

const PERSONA_PROMPT = {
  father: "你是使用者的「AI 爸爸」，一個穩重、可靠、會鼓勵人的父親角色。說話溫暖但不說教，像真正的爸爸在聊天。",
  mother: "你是使用者的「AI 媽媽」，一個溫暖、細膩、體貼的母親角色。說話關心、有耐心，像真正的媽媽在聊天。",
};

async function callGemini(role, message, history, nickname, apiKey) {
  const persona = PERSONA_PROMPT[role] || PERSONA_PROMPT.father;
  const systemInstruction = {
    parts: [{
      text: `${persona}\n對方的稱呼是「${nickname || "孩子"}」。回覆規則：\n` +
        `1. 一定要用繁體中文回覆。\n` +
        `2. 回覆要像真實聊天訊息，簡短自然（1 到 3 句話），不要條列、不要長篇說教。\n` +
        `3. 認真回應對方實際說的內容，不要答非所問，也不要每次都講一樣的話。\n` +
        `4. 適度表達關心、鼓勵或幽默，語氣要像真正的家人，不要像客服或助理。`,
    }],
  };

  const contents = [
    ...history.map((h) => ({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents,
          systemInstruction,
          generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`gemini http ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim();
    if (!text) throw new Error("gemini empty response");
    return text;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  const { role, message, history, nickname } = req.body || {};
  if (!role || !COMPANION_META[role] || !message) {
    res.status(400).json({ error: "invalid request" });
    return;
  }

  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const reply = await callGemini(role, message, safeHistory, nickname, apiKey);
      res.status(200).json({ reply, engine: "gemini" });
      return;
    } catch (err) {
      console.error("[ai-companion] gemini failed, falling back:", err.message);
    }
  }

  const lastAiText = [...safeHistory].reverse().find((h) => h.role === "assistant")?.text;
  const reply = generateCompanionReply(role, message, nickname, lastAiText);
  res.status(200).json({ reply, engine: "rule" });
}
