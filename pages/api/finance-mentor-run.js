import { getAdminDb, FieldValue } from "../../lib/firebaseAdmin";
import { generateFinanceDailyBrief, getTaipeiDateKey } from "../../lib/financeDailyBrief";
import {
  FINANCE_MENTOR_PROFILE,
  generateFinanceMentorRun,
} from "../../lib/financeMentorStudio";
import {
  buildFinanceMentorDirectiveDoc,
  buildFinanceMentorRunDoc,
  FINANCE_MENTOR_COLLECTIONS,
} from "../../lib/financeFirestoreSchema";

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

function postPayload(profile, text, extra = {}) {
  return {
    userId: profile.userId,
    userNickname: profile.userNickname,
    userAvatar: profile.userAvatar,
    userColor: profile.userColor,
    text,
    imageUrl: null,
    videoUrl: null,
    likes: [],
    createdAt: FieldValue.serverTimestamp(),
    ...extra,
  };
}

function commentPayload(profile, text, extra = {}) {
  return {
    userId: profile.userId,
    userNickname: profile.userNickname,
    userAvatar: profile.userAvatar,
    userColor: profile.userColor,
    text,
    createdAt: FieldValue.serverTimestamp(),
    ...extra,
  };
}

async function collectAgentRunSummaries(db, dateKey) {
  try {
    const snap = await db
      .collection(FINANCE_MENTOR_COLLECTIONS.runs)
      .doc(dateKey)
      .collection("agentSamples")
      .limit(10)
      .get();
    return snap.docs.map((d) => d.data());
  } catch {
    return [];
  }
}

async function writeMentorRun(db, run) {
  const trainingRef = db.collection(FINANCE_MENTOR_COLLECTIONS.trainings).doc(run.dateKey);
  const runRef = db.collection(FINANCE_MENTOR_COLLECTIONS.runs).doc(run.dateKey);
  const directiveRef = db.collection(FINANCE_MENTOR_COLLECTIONS.directives).doc(run.dateKey);

  const existing = await trainingRef.get();
  if (existing.exists) {
    return { skipped: true, postId: existing.data()?.postId || null };
  }

  const priorDirectives = await db
    .collection(FINANCE_MENTOR_COLLECTIONS.directives)
    .where("status", "==", "active")
    .get();

  const postRef = db.collection("posts").doc();
  const commentRef = postRef.collection("comments").doc();
  const batch = db.batch();

  batch.set(postRef, postPayload(FINANCE_MENTOR_PROFILE, run.reportText, {
    isAiFinanceMentorPost: true,
    financePostType: "mentor_training",
    financeMentorDateKey: run.dateKey,
    financeMentorEngine: run.engine,
    reviewStatus: run.reviewStatus,
  }));
  batch.set(commentRef, commentPayload(FINANCE_MENTOR_PROFILE, run.directiveCommentText, {
    isAiFinanceMentorComment: true,
    financeMentorDateKey: run.dateKey,
  }));
  batch.set(trainingRef, {
    postId: postRef.id,
    dateKey: run.dateKey,
    engine: run.engine,
    reviewStatus: run.reviewStatus,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(runRef, buildFinanceMentorRunDoc(run));
  batch.set(directiveRef, buildFinanceMentorDirectiveDoc(run));

  for (const doc of priorDirectives.docs) {
    if (doc.id !== run.dateKey) {
      batch.update(doc.ref, { status: "superseded" });
    }
  }

  await batch.commit();
  return { skipped: false, postId: postRef.id };
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
    let briefSummary = "";
    try {
      const brief = await generateFinanceDailyBrief(force);
      briefSummary = brief?.summary || (Array.isArray(brief?.parts) ? brief.parts.join("\n") : "");
    } catch (err) {
      console.error("[finance-mentor-run] brief load failed:", err.message);
    }

    let agentRunSummaries = [];
    try {
      const db = getAdminDb();
      const dateKey = getTaipeiDateKey();
      agentRunSummaries = await collectAgentRunSummaries(db, dateKey);
    } catch {
      // missing credentials in dev — use built-in sample cases only
    }

    const run = await generateFinanceMentorRun({
      force,
      briefSummary,
      agentRunSummaries,
    });

    if (preview) {
      res.status(200).json({ preview: true, run });
      return;
    }

    const db = getAdminDb();
    const writeResult = await writeMentorRun(db, run);

    res.status(200).json({
      ok: true,
      mentorRun: writeResult,
      dateKey: run.dateKey,
      reviewStatus: run.reviewStatus,
      engine: run.engine,
    });
  } catch (err) {
    console.error("[finance-mentor-run] failed:", err);
    res.status(500).json({ error: "failed to run finance mentor job", message: err.message });
  }
}
