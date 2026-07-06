import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../lib/firebaseAdmin";
import { isValidEmail, normalizeEmail, parseWaitlistIntent } from "../../lib/waitlist";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, intent, source } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const parsedIntent = parseWaitlistIntent(intent);

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: "請輸入有效的電子郵件" });
  }
  if (!parsedIntent) {
    return res.status(400).json({ error: "無效的登記類型" });
  }

  let userId = null;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (token) {
    try {
      getAdminDb();
      const decoded = await getAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      // 訪客提交仍允許，只是不綁定 uid
    }
  }

  try {
    const db = getAdminDb();
    const existing = await db
      .collection("waitlist")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    await db.collection("waitlist").add({
      email: normalizedEmail,
      intent: parsedIntent,
      userId,
      source: String(source || "community").slice(0, 32),
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ ok: true, duplicate: false });
  } catch (err) {
    console.error("[waitlist] write failed:", err.message);
    return res.status(500).json({ error: "登記失敗，請稍後再試" });
  }
}
