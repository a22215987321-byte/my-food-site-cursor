// lib/financeAgentClient.js
// Optional bridge from Next.js API routes to the Python finance_agent.py service.

const DEFAULT_TIMEOUT_MS = 10000;

function isValidFinanceAgentReply(data) {
  return (
    data &&
    typeof data.reply === "string" &&
    Array.isArray(data.usedTools) &&
    data.numericValidation &&
    data.numericValidation.noNaN === true
  );
}

export async function callFinanceAgent({ userId, message, history, nickname, financeNews, mentorContext }) {
  const baseUrl = process.env.FINANCE_AGENT_URL;
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.FINANCE_AGENT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/finance-agent/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        message,
        locale: "zh-TW",
        nickname,
        history: Array.isArray(history) ? history.slice(-12) : [],
        financeNews: Array.isArray(financeNews) ? financeNews.slice(0, 8) : [],
        mentorContext: mentorContext || null,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`finance agent http ${res.status}`);
    const data = await res.json();
    if (!isValidFinanceAgentReply(data)) {
      throw new Error("finance agent returned invalid contract");
    }
    return data;
  } catch (err) {
    clearTimeout(timer);
    console.error("[finance-agent] unavailable, falling back:", err.message);
    return null;
  }
}
