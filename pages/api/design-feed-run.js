import { getAdminDb, FieldValue } from "../../lib/firebaseAdmin";
import {
  ART_STUDENT_PROFILE,
  ART_TEACHER_PROFILE,
  generateDailyTraining,
  generateDesignRun,
} from "../../lib/designStudio";

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

async function writeDailyTraining(db, training) {
  const trainingRef = db.collection("design_trainings").doc(training.dateKey);
  const postRef = db.collection("posts").doc();

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(trainingRef);
    if (existing.exists) {
      return { skipped: true, postId: existing.data()?.postId || null };
    }

    tx.set(postRef, postPayload(ART_TEACHER_PROFILE, training.text, {
      isAiDesignPost: true,
      designPostType: "teacher_training",
      designTrainingDateKey: training.dateKey,
      designEngine: training.engine,
    }));
    tx.set(trainingRef, {
      postId: postRef.id,
      dateKey: training.dateKey,
      engine: training.engine,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { skipped: false, postId: postRef.id };
  });
}

async function writeDesignRun(db, run) {
  const runRef = db.collection("design_runs").doc(run.slot.slotKey);
  const postRef = db.collection("posts").doc();
  const reviewRef = postRef.collection("comments").doc();
  const revisionRef = run.revisionText ? postRef.collection("comments").doc() : null;

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(runRef);
    if (existing.exists) {
      return { skipped: true, postId: existing.data()?.postId || null };
    }

    tx.set(postRef, postPayload(ART_STUDENT_PROFILE, run.studentText, {
      isAiDesignPost: true,
      designPostType: "student_submission",
      designSlotKey: run.slot.slotKey,
      designSlotLabel: run.slot.label,
      designTargetName: run.target.name,
      designTargetPath: run.target.path,
      reviewStatus: run.reviewStatus,
      designEngine: run.engine,
    }));
    tx.set(reviewRef, commentPayload(ART_TEACHER_PROFILE, run.reviewText, {
      isAiDesignReview: true,
      reviewStatus: run.reviewStatus,
    }));
    if (revisionRef) {
      tx.set(revisionRef, commentPayload(ART_STUDENT_PROFILE, run.revisionText, {
        isAiDesignRevision: true,
        revisionOfSlotKey: run.slot.slotKey,
      }));
    }
    tx.set(runRef, {
      postId: postRef.id,
      slotKey: run.slot.slotKey,
      dateKey: run.slot.dateKey,
      slotHour: run.slot.slotHour,
      targetName: run.target.name,
      targetPath: run.target.path,
      reviewStatus: run.reviewStatus,
      engine: run.engine,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { skipped: false, postId: postRef.id };
  });
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
    const [training, run] = await Promise.all([
      generateDailyTraining({ force }),
      generateDesignRun({ force }),
    ]);

    if (preview) {
      res.status(200).json({ preview: true, training, run });
      return;
    }

    const db = getAdminDb();
    const [trainingWrite, runWrite] = await Promise.all([
      writeDailyTraining(db, training),
      writeDesignRun(db, run),
    ]);

    res.status(200).json({
      ok: true,
      training: trainingWrite,
      designRun: runWrite,
      slotKey: run.slot.slotKey,
      reviewStatus: run.reviewStatus,
    });
  } catch (err) {
    console.error("[design-feed-run] failed:", err);
    res.status(500).json({ error: "failed to run design feed job", message: err.message });
  }
}
