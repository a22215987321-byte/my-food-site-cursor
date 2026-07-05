import { getAdminDb, FieldValue } from "./firebaseAdmin";
import { generateFinanceDailyBrief } from "./financeDailyBrief";
import { generateFinanceMentorRun } from "./financeMentorStudio";
import {
  buildFinanceMentorDirectiveDoc,
  buildFinanceMentorRunDoc,
  FINANCE_MENTOR_COLLECTIONS,
} from "./financeFirestoreSchema";
import {
  FINANCE_FATHER_GROUP_PROFILE,
  FINANCE_MENTOR_GROUP_PROFILE,
  FINANCE_STUDIO_AI_MEMBERS,
  FINANCE_STUDIO_GROUP_ID,
  FINANCE_STUDIO_GROUP_META,
} from "./financeGroupConstants";

export const FINANCE_GROUP_SESSIONS = "financeGroupSessions";

function groupMessagePayload(profile, text, extra = {}) {
  return {
    senderId: profile.userId,
    sender: profile.userNickname,
    avatar: profile.userAvatar,
    senderAvatarImage: "",
    text,
    isAiFinanceGroupPost: true,
    createdAt: FieldValue.serverTimestamp(),
    ...extra,
  };
}

export async function ensureFinanceStudioGroup(db) {
  const groupRef = db.collection("groups").doc(FINANCE_STUDIO_GROUP_ID);
  const snap = await groupRef.get();
  if (snap.exists) return { created: false, groupId: FINANCE_STUDIO_GROUP_ID };

  await groupRef.set({
    name: FINANCE_STUDIO_GROUP_META.name,
    avatar: FINANCE_STUDIO_GROUP_META.avatar,
    description: FINANCE_STUDIO_GROUP_META.description,
    isPublic: true,
    isAiFinanceGroup: true,
    members: [...FINANCE_STUDIO_AI_MEMBERS],
    aiMembers: [...FINANCE_STUDIO_AI_MEMBERS],
    createdBy: "system",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { created: true, groupId: FINANCE_STUDIO_GROUP_ID };
}

async function writeMentorDirectives(db, run) {
  const trainingRef = db.collection(FINANCE_MENTOR_COLLECTIONS.trainings).doc(run.dateKey);
  const runRef = db.collection(FINANCE_MENTOR_COLLECTIONS.runs).doc(run.dateKey);
  const directiveRef = db.collection(FINANCE_MENTOR_COLLECTIONS.directives).doc(run.dateKey);

  const existing = await trainingRef.get();
  if (existing.exists) {
    return { skipped: true };
  }

  const priorDirectives = await db
    .collection(FINANCE_MENTOR_COLLECTIONS.directives)
    .where("status", "==", "active")
    .get();

  const batch = db.batch();
  batch.set(trainingRef, {
    dateKey: run.dateKey,
    groupId: FINANCE_STUDIO_GROUP_ID,
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
  return { skipped: false };
}

async function writeGroupDailySession(db, run, brief) {
  const sessionRef = db.collection(FINANCE_GROUP_SESSIONS).doc(run.dateKey);
  const existing = await sessionRef.get();
  if (existing.exists && existing.data()?.groupPosted) {
    return { skipped: true, messageCount: existing.data()?.messageCount || 0 };
  }

  await ensureFinanceStudioGroup(db);

  const parts = Array.isArray(brief.parts) && brief.parts.length
    ? brief.parts
    : brief.summary
    ? [brief.summary]
    : [];

  const messagesRef = db.collection("groups").doc(FINANCE_STUDIO_GROUP_ID).collection("messages");
  const batch = db.batch();
  let messageCount = 0;

  const mentorIntro = groupMessagePayload(
    FINANCE_MENTOR_GROUP_PROFILE,
    `【${run.dateKey} · AI財經導師每日訓練】\n各位好，以下是今天對 AI 爸爸的訓練報告與改進指令。`,
    {
      financeGroupPostType: "mentor_intro",
      financeSessionDateKey: run.dateKey,
      financeMentorEngine: run.engine,
    }
  );
  batch.set(messagesRef.doc(), mentorIntro);
  messageCount += 1;

  batch.set(
    messagesRef.doc(),
    groupMessagePayload(FINANCE_MENTOR_GROUP_PROFILE, run.reportText, {
      financeGroupPostType: "mentor_training",
      financeSessionDateKey: run.dateKey,
      reviewStatus: run.reviewStatus,
      financeMentorEngine: run.engine,
    })
  );
  messageCount += 1;

  batch.set(
    messagesRef.doc(),
    groupMessagePayload(FINANCE_MENTOR_GROUP_PROFILE, run.directiveCommentText, {
      financeGroupPostType: "mentor_directive",
      financeSessionDateKey: run.dateKey,
    })
  );
  messageCount += 1;

  for (const part of parts) {
    batch.set(
      messagesRef.doc(),
      groupMessagePayload(FINANCE_FATHER_GROUP_PROFILE, part, {
        financeGroupPostType: "dad_daily_brief",
        financeSessionDateKey: brief.dateKey || run.dateKey,
        dailyBrief: true,
        briefDate: brief.dateKey || run.dateKey,
      })
    );
    messageCount += 1;
  }

  batch.set(sessionRef, {
    dateKey: run.dateKey,
    groupId: FINANCE_STUDIO_GROUP_ID,
    groupPosted: true,
    messageCount,
    reviewStatus: run.reviewStatus,
    briefEngine: brief.engine || "rule",
    mentorEngine: run.engine || "rule",
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return { skipped: false, messageCount };
}

export async function executeFinanceStudioDailyRun({
  force = false,
  preview = false,
} = {}) {
  let briefSummary = "";
  let brief = null;
  try {
    brief = await generateFinanceDailyBrief(force);
    briefSummary = brief?.summary || (Array.isArray(brief?.parts) ? brief.parts.join("\n") : "");
  } catch (err) {
    console.error("[finance-group] brief load failed:", err.message);
  }

  const run = await generateFinanceMentorRun({
    force,
    briefSummary,
    agentRunSummaries: [],
  });

  if (preview) {
    return {
      preview: true,
      groupId: FINANCE_STUDIO_GROUP_ID,
      run,
      brief,
    };
  }

  const db = getAdminDb();
  await ensureFinanceStudioGroup(db);
  const [directivesWrite, groupWrite] = await Promise.all([
    writeMentorDirectives(db, run),
    writeGroupDailySession(db, run, brief || { parts: [], dateKey: run.dateKey, engine: "rule" }),
  ]);

  return {
    ok: true,
    groupId: FINANCE_STUDIO_GROUP_ID,
    dateKey: run.dateKey,
    reviewStatus: run.reviewStatus,
    mentorEngine: run.engine,
    briefEngine: brief?.engine || "rule",
    directivesWrite,
    groupWrite,
  };
}
