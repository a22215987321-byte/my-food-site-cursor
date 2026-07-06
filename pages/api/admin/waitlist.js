import { verifyAdminRequest } from "../../../lib/adminAuth";
import { getAdminDb } from "../../../lib/firebaseAdmin";
import { intentLabel } from "../../../lib/waitlist";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await verifyAdminRequest(req);
  if (!admin) {
    return res.status(403).json({ error: "無權限" });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("waitlist").orderBy("createdAt", "desc").limit(500).get();

    const entries = snap.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || null;
      return {
        id: doc.id,
        email: data.email || "",
        intent: data.intent || "notify",
        intentLabel: intentLabel(data.intent),
        userId: data.userId || null,
        source: data.source || "",
        createdAt: createdAt ? createdAt.toISOString() : null,
      };
    });

    return res.status(200).json({ entries, total: entries.length });
  } catch (err) {
    console.error("[admin/waitlist] read failed:", err.message);
    return res.status(500).json({ error: "讀取失敗" });
  }
}
