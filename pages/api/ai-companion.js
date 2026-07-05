// pages/api/ai-companion.js
// AI 陪伴角色（AI 爸爸／AI 媽媽／AI 哥哥）的回覆產生 API。
// AI 爸爸會自動吸收最新財經新聞作為對話上下文；AI 哥哥會讀取訊息中的網址並整理重點。
import { generateCompanionReply, COMPANION_META } from "../../lib/aiCompanion";
import {
  loadFinanceNews,
  findRelevantFinanceNews,
  formatFinanceContextForPrompt,
  isFinanceTopic,
} from "../../lib/financeNews";
import { extractFirstUrl, fetchUrlSummaryData, buildRuleBasedUrlSummary } from "../../lib/urlSummary";
import { callFinanceAgent } from "../../lib/financeAgentClient";
import { formatMentorContextForPrompt, buildMentorContextPayload, loadActiveMentorDirective } from "../../lib/financeMentorMemory";
import {
  buildDesignTrainingFallbackReply,
  executeDesignFeedRun,
  formatDesignFeedContextForPrompt,
  isDesignForceRepostCommand,
  isDesignTrainingCommand,
} from "../../lib/designFeedService";

const GEMINI_MODEL = "gemini-2.5-flash";

const PERSONA_PROMPT = {
  father:
    "你是使用者的「AI 爸爸」，穩重可靠、懂財經時事。你每天閱讀大量財經新聞（台灣與國際），" +
    "聊天時會引用最新資訊並給出務實、像真正爸爸會講的看法。語氣溫暖但不說教。",
  mother:
    "你是使用者的「AI 媽媽」，一個溫暖、細膩、體貼的母親角色。說話關心、有耐心，像真正的媽媽在聊天。",
  brother:
    "你是使用者的「AI 哥哥」，年紀比使用者稍長、講話直接又帶點幽默的哥哥類型，像真的兄弟聊天一樣輕鬆，不拘謹、不說教。" +
    "你有一個特殊專長：如果對方貼網址給你，你會讀懂網頁的重點、講清楚這個網址大概是做什麼用的，並補充你自己直白的看法或建議。",
  artstudent:
    "你是 EVONVCHAT 的「AI美術生」，每天學習聊天室、動態消息、個人頁與其他頁面設計。" +
    "你會用學生但認真的語氣提出文字版設計草案，內容要包含觀察、設計目標、版面/配色/互動建議與可實作的 React/CSS 方向。",
  artteacher:
    "你是 EVONVCHAT 的「AI美術師」，負責每天訓練 AI美術生，像專業設計總監一樣審核作品。" +
    "你重視視覺一致性、使用者體驗、資訊層級與可實作性；不滿意的作品要明確指出問題並要求重做。",
};

const ROLE_EXTRA_RULE = {
  father:
    "5. 若對方問財經、投資、市場，優先結合上方新聞摘要回應；沒有相關新聞時用一般理財常識，並提醒非投資建議。",
  brother:
    "5. 若下方有「網址內容摘要」，請先用 1～2 句說明這個網址的用途／主題，接著條列 2～3 個重點，最後用一句「哥哥看法：」給你自己直白的意見。\n" +
    "6. 若下方顯示網址讀取失敗，直接跟對方說你打不開這個連結（可能對方網站擋了自動讀取），請他貼文字重點或多講一點背景，不要假裝你看過內容。",
  artstudent:
    "5. 回覆要像設計學生日誌，不要空泛稱讚；至少提出 2 個具體畫面改進點。\n" +
    "6. 若對方問頁面設計，請用「觀察 / 改版方向 / 可實作建議」三段簡短回覆。",
  artteacher:
    "5. 回覆要像嚴格但願意教的設計老師；先判斷是否合格，再列出要修改的重點。\n" +
    "6. 不要只說好看或不好看，必須說明理由，並給出下一次訓練要求。\n" +
    "7. 若下方有「系統狀態：你剛剛已真正安排 AI美術生 去動態消息交作品」，代表訓練已執行，請明確叫使用者去「動態消息」查看，不要只口頭出題。",
};

async function callGemini(role, message, history, nickname, apiKey, extraContext) {
  const persona = PERSONA_PROMPT[role] || PERSONA_PROMPT.father;
  const extraRule = ROLE_EXTRA_RULE[role] || "";
  const nick = nickname || (role === "brother" ? "你" : "孩子");

  const systemInstruction = {
    parts: [{
      text:
        `${persona}\n對方的稱呼是「${nick}」。${extraContext || ""}\n回覆規則：\n` +
        "1. 一定要用繁體中文回覆。\n" +
        "2. 回覆要像真實聊天訊息，簡短自然，不要長篇說教（做網址重點整理時例外，可以條列 2～3 點）。\n" +
        "3. 認真回應對方實際說的內容，不要答非所問，也不要每次都講一樣的話。\n" +
        "4. 適度表達關心、鼓勵或幽默，語氣要像真正的家人，不要像客服或助理。\n" +
        extraRule,
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
          generationConfig: { temperature: 0.85, maxOutputTokens: 380 },
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

  const { role, message, history, nickname, userId } = req.body || {};
  if (!role || !COMPANION_META[role] || !message) {
    res.status(400).json({ error: "invalid request" });
    return;
  }

  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
  const apiKey = process.env.GEMINI_API_KEY;

  let financeNews = [];
  let urlData = null;
  let extraContext = "";
  let designFeedResult = null;

  if (role === "artteacher" && userId && (isDesignTrainingCommand(message) || isDesignForceRepostCommand(message))) {
    try {
      designFeedResult = await executeDesignFeedRun({
        force: true,
        forceWrite: isDesignForceRepostCommand(message),
      });
      extraContext += formatDesignFeedContextForPrompt(designFeedResult);
    } catch (err) {
      console.error("[ai-companion] design feed trigger failed:", err.message);
      extraContext +=
        "\n\n【系統狀態：安排 AI美術生 交作品失敗】請告知使用者稍後再試，或請站長確認 Firebase Admin 設定。";
    }
  }

  if (role === "father") {
    let mentorContextPayload = null;
    try {
      const directive = await loadActiveMentorDirective();
      mentorContextPayload = buildMentorContextPayload(directive);
      const mentorPrompt = formatMentorContextForPrompt(directive);
      if (mentorPrompt) extraContext += mentorPrompt;
    } catch (err) {
      console.error("[ai-companion] mentor context load failed:", err.message);
    }

    try {
      const allNews = await loadFinanceNews();
      const relevant = findRelevantFinanceNews(message, allNews, 5);
      financeNews = relevant.length ? relevant : allNews.slice(0, 5);
      const financeContext = formatFinanceContextForPrompt(financeNews);
      if (financeContext) {
        extraContext +=
          `\n\n【今日最新財經新聞摘要（請在相關時引用，並給出你的看法）】\n${financeContext}\n` +
          "回覆時若涉及投資或市場，務必提醒風險、不要給具體買賣指令，僅供陪伴聊天參考。";
      }
    } catch (err) {
      console.error("[ai-companion] finance news load failed:", err.message);
    }

    const agentResult = await callFinanceAgent({
      userId,
      message,
      history: safeHistory,
      nickname,
      financeNews,
      mentorContext: mentorContextPayload,
    });
    if (agentResult?.reply) {
      res.status(200).json({
        reply: agentResult.reply,
        engine: "finance-agent",
        financeAware: true,
        citations: agentResult.citations || [],
        usedTools: agentResult.usedTools || [],
        warnings: agentResult.warnings || [],
        numericValidation: agentResult.numericValidation,
      });
      return;
    }
  } else if (role === "brother") {
    const url = extractFirstUrl(message);
    if (url) {
      urlData = await fetchUrlSummaryData(url);
      if (urlData.ok) {
        extraContext =
          `\n\n【使用者分享的網址內容摘要】\n網址：${urlData.url}\n標題：${urlData.title}\n` +
          `描述：${urlData.description || "（無）"}\n內文節錄：${urlData.bodyText.slice(0, 1500)}\n`;
      } else {
        extraContext =
          `\n\n【網址讀取狀態】對方分享的網址 ${urlData.url} 自動讀取失敗（原因：${urlData.reason || "未知"}）。`;
      }
    }
  }

  if (apiKey) {
    try {
      const reply = await callGemini(role, message, safeHistory, nickname, apiKey, extraContext);
      res.status(200).json({
        reply,
        engine: "gemini",
        financeAware: role === "father" && !!financeNews.length,
        urlAware: role === "brother" && !!urlData,
        designFeedTriggered: !!designFeedResult,
        designFeed: designFeedResult
          ? {
              slotKey: designFeedResult.slotKey,
              reviewStatus: designFeedResult.reviewStatus,
              targetName: designFeedResult.run?.target?.name,
              posted: !designFeedResult.designRun?.skipped,
            }
          : null,
      });
      return;
    } catch (err) {
      console.error("[ai-companion] gemini failed, falling back:", err.message);
    }
  }

  if (role === "brother" && urlData) {
    const reply = buildRuleBasedUrlSummary(urlData);
    res.status(200).json({ reply, engine: "rule", urlAware: true });
    return;
  }

  if (role === "artteacher" && designFeedResult) {
    res.status(200).json({
      reply: buildDesignTrainingFallbackReply(designFeedResult, nickname),
      engine: "rule",
      designFeedTriggered: true,
      designFeed: {
        slotKey: designFeedResult.slotKey,
        reviewStatus: designFeedResult.reviewStatus,
        targetName: designFeedResult.run?.target?.name,
        posted: !designFeedResult.designRun?.skipped,
      },
    });
    return;
  }

  const lastAiText = [...safeHistory].reverse().find((h) => h.role === "assistant")?.text;
  const useFinance =
    role === "father" && financeNews.length && (isFinanceTopic(message) || /新聞|消息|看法|分析/.test(message));
  const reply = generateCompanionReply(
    role,
    message,
    nickname,
    lastAiText,
    useFinance ? financeNews : []
  );
  res.status(200).json({
    reply,
    engine: "rule",
    financeAware: useFinance,
    designFeedTriggered: !!designFeedResult,
  });
}
