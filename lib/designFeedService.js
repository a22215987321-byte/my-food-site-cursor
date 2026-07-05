import { getAdminDb, FieldValue } from "./firebaseAdmin";
import {
  ART_STUDENT_PROFILE,
  ART_TEACHER_PROFILE,
  generateDailyTraining,
  generateDesignRun,
} from "./designStudio";

const TRAINING_COMMAND = /訓練|開課|交作品|開始訓練|出題|讓美術生|安排美術生|今日訓練|開始吧|交稿/i;
const STUDENT_SUBMIT_COMMAND = /交作品|交設計稿|交稿|我要交|提交作品/i;
const FORCE_REPOST_COMMAND = /再交|重做|重新交|再打回|再訓練一次/i;

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

async function writeDesignRun(db, run, { forceWrite = false } = {}) {
  const runKey = forceWrite ? `${run.slot.slotKey}-manual-${Date.now()}` : run.slot.slotKey;
  const runRef = db.collection("design_runs").doc(runKey);
  const postRef = db.collection("posts").doc();
  const reviewRef = postRef.collection("comments").doc();
  const revisionRef = run.revisionText ? postRef.collection("comments").doc() : null;

  if (!forceWrite) {
    const existing = await runRef.get();
    if (existing.exists) {
      return { skipped: true, postId: existing.data()?.postId || null, runKey };
    }
  }

  const batch = db.batch();
  batch.set(postRef, postPayload(ART_STUDENT_PROFILE, run.studentText, {
    isAiDesignPost: true,
    designPostType: "student_submission",
    designSlotKey: run.slot.slotKey,
    designSlotLabel: run.slot.label,
    designTargetName: run.target.name,
    designTargetPath: run.target.path,
    reviewStatus: run.reviewStatus,
    designEngine: run.engine,
    triggeredByChat: forceWrite,
  }));
  batch.set(reviewRef, commentPayload(ART_TEACHER_PROFILE, run.reviewText, {
    isAiDesignReview: true,
    reviewStatus: run.reviewStatus,
  }));
  if (revisionRef) {
    batch.set(revisionRef, commentPayload(ART_STUDENT_PROFILE, run.revisionText, {
      isAiDesignRevision: true,
      revisionOfSlotKey: run.slot.slotKey,
    }));
  }
  batch.set(runRef, {
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
  await batch.commit();
  return { skipped: false, postId: postRef.id, runKey };
}

export function isDesignTrainingCommand(message) {
  return TRAINING_COMMAND.test(String(message || "").trim());
}

export function isDesignStudentSubmitCommand(message) {
  return STUDENT_SUBMIT_COMMAND.test(String(message || "").trim());
}

export function isDesignForceRepostCommand(message) {
  return FORCE_REPOST_COMMAND.test(String(message || "").trim());
}

export function shouldTriggerDesignFeed(role, message) {
  const text = String(message || "").trim();
  if (!text) return { trigger: false, forceWrite: false };
  if (role === "artteacher") {
    return {
      trigger: isDesignTrainingCommand(text) || isDesignForceRepostCommand(text),
      forceWrite: isDesignForceRepostCommand(text),
    };
  }
  if (role === "artstudent") {
    return { trigger: isDesignStudentSubmitCommand(text), forceWrite: false };
  }
  return { trigger: false, forceWrite: false };
}

export function formatDesignFeedContextForPrompt(result) {
  if (!result) return "";
  const { run, trainingWrite, designRun } = result;
  const statusLabel =
    run.reviewStatus === "approved" ? "通過" : run.reviewStatus === "revision_required" ? "打回重做" : "審核中";

  let block =
    `\n\n【系統狀態：你剛剛已真正安排 AI美術生 去動態消息交作品】\n` +
    `研究頁面：${run.target.name}\n` +
    `時段：${run.slot.label}\n` +
    `審核結果：${statusLabel}\n`;

  if (designRun?.skipped) {
    block += "本時段作品已存在，請引導使用者到「動態消息」查看現有作品。\n";
  } else if (designRun?.postId) {
    block += "新作品已成功發佈到動態消息，請明確告知使用者去動態消息查看。\n";
  }

  if (trainingWrite?.skipped) {
    block += "今日訓練貼文已發過。\n";
  } else if (trainingWrite?.postId) {
    block += "今日訓練方向也已同步發到動態消息。\n";
  }

  block += "回覆時不要編造咖啡館海報等無關題目，要聚焦 EVONVCHAT 頁面設計訓練。";
  return block;
}

export function buildDesignTrainingFallbackReply(result, nickname, role = "artteacher") {
  const prefix = nickname ? `${nickname}，` : "";
  if (!result?.run) {
    return `${prefix}我這邊安排美術生交作品時出了狀況，稍後再試一次，或直接去動態消息看看。`;
  }

  const { run, designRun } = result;
  const statusLabel = run.reviewStatus === "approved" ? "通過" : "打回重做";
  if (role === "artstudent") {
    if (designRun?.skipped) {
      return `${prefix}這個時段我已經交過「${run.target.name}」的設計作品了，請到動態消息查看老師的審核。`;
    }
    return `${prefix}好，我已完成「${run.target.name}」的設計草案，已交到動態消息，等 AI美術師審核（目前：${statusLabel}）。`;
  }

  if (designRun?.skipped) {
    return `${prefix}本時段 AI美術生 已經交過「${run.target.name}」的設計作品了，請到動態消息查看，我會依現有作品繼續訓練。`;
  }
  return `${prefix}好，我已安排 AI美術生 去研究「${run.target.name}」，作品已交到動態消息。審核結果：${statusLabel}，請去動態消息查看。`;
}

export async function executeDesignFeedRun({ force = false, preview = false, forceWrite = false } = {}) {
  const [training, run] = await Promise.all([
    generateDailyTraining({ force }),
    generateDesignRun({ force }),
  ]);

  if (preview) {
    return { preview: true, training, run };
  }

  const db = getAdminDb();
  const [trainingWrite, designRun] = await Promise.all([
    writeDailyTraining(db, training),
    writeDesignRun(db, run, { forceWrite }),
  ]);

  return {
    ok: true,
    training,
    run,
    trainingWrite,
    designRun,
    slotKey: run.slot.slotKey,
    reviewStatus: run.reviewStatus,
  };
}
