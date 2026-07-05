import { executeFinanceStudioDailyRun } from "../../lib/financeGroupService";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || "";
  const provided =
    req.query.secret ||
    req.headers["x-cron-secret"] ||
    (auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "");

  if (secret) return provided === secret;
  return req.headers["x-vercel-cron"] === "1" || process.env.NODE_ENV !== "production";
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const force = req.query.refresh === "1";
  const preview = req.query.preview === "1";

  try {
    const result = await executeFinanceStudioDailyRun({ force, preview });
    res.status(200).json(result);
  } catch (err) {
    console.error("[finance-group-run] failed:", err);
    res.status(500).json({ error: "failed to run finance group job", message: err.message });
  }
}
