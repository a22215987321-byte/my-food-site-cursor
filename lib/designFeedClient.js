import { db } from "./firebase";
import { addDoc, collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";

function withTimestamp(profile, text, extra = {}) {
  return {
    userId: profile.userId,
    userNickname: profile.userNickname,
    userAvatar: profile.userAvatar,
    userColor: profile.userColor,
    text,
    imageUrl: null,
    videoUrl: null,
    likes: [],
    createdAt: serverTimestamp(),
    ...extra,
  };
}

export async function publishDesignFeedFromClient(payload, { includeTraining = false } = {}) {
  const results = { studentPostId: null, trainingPostId: null };

  const studentRef = await addDoc(collection(db, "posts"), withTimestamp(
    {
      userId: payload.studentPost.userId,
      userNickname: payload.studentPost.userNickname,
      userAvatar: payload.studentPost.userAvatar,
      userColor: payload.studentPost.userColor,
    },
    payload.studentPost.text,
    {
      isAiDesignPost: payload.studentPost.isAiDesignPost,
      designPostType: payload.studentPost.designPostType,
      designSlotKey: payload.studentPost.designSlotKey,
      designSlotLabel: payload.studentPost.designSlotLabel,
      designTargetName: payload.studentPost.designTargetName,
      designTargetPath: payload.studentPost.designTargetPath,
      reviewStatus: payload.studentPost.reviewStatus,
      designEngine: payload.studentPost.designEngine,
      publishedVia: "client",
    }
  ));
  results.studentPostId = studentRef.id;

  const batch = writeBatch(db);
  batch.set(doc(collection(db, "posts", studentRef.id, "comments")), withTimestamp(
    {
      userId: payload.reviewComment.userId,
      userNickname: payload.reviewComment.userNickname,
      userAvatar: payload.reviewComment.userAvatar,
      userColor: payload.reviewComment.userColor,
    },
    payload.reviewComment.text,
    {
      isAiDesignReview: payload.reviewComment.isAiDesignReview,
      reviewStatus: payload.reviewComment.reviewStatus,
    }
  ));
  if (payload.revisionComment) {
    batch.set(doc(collection(db, "posts", studentRef.id, "comments")), withTimestamp(
      {
        userId: payload.revisionComment.userId,
        userNickname: payload.revisionComment.userNickname,
        userAvatar: payload.revisionComment.userAvatar,
        userColor: payload.revisionComment.userColor,
      },
      payload.revisionComment.text,
      {
        isAiDesignRevision: payload.revisionComment.isAiDesignRevision,
        revisionOfSlotKey: payload.revisionComment.revisionOfSlotKey,
      }
    ));
  }
  await batch.commit();

  if (includeTraining && payload.trainingPost) {
    const trainingRef = await addDoc(collection(db, "posts"), withTimestamp(
      {
        userId: payload.trainingPost.userId,
        userNickname: payload.trainingPost.userNickname,
        userAvatar: payload.trainingPost.userAvatar,
        userColor: payload.trainingPost.userColor,
      },
      payload.trainingPost.text,
      {
        isAiDesignPost: payload.trainingPost.isAiDesignPost,
        designPostType: payload.trainingPost.designPostType,
        designTrainingDateKey: payload.trainingPost.designTrainingDateKey,
        designEngine: payload.trainingPost.designEngine,
        publishedVia: "client",
      }
    ));
    results.trainingPostId = trainingRef.id;
  }

  return results;
}
