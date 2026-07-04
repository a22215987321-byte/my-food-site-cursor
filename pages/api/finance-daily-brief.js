// pages/api/finance-daily-brief.js
// AI 爸爸每日財經總結；Cron 每天預先生成，CDN 快取 24 小時。
import { generateFinanceDailyBrief } from "../../lib/financeDailyBrief";

export default async function handler(req, res) {
  try {
    const brief = await generateFinanceDailyBrief(req.query.refresh === "1");
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=172800");
    res.status(200).json(brief);
  } catch (err) {
    console.error("[finance-daily-brief] error:", err);
    res.status(500).json({ error: "failed to generate daily brief", summary: "" });
  }
}
