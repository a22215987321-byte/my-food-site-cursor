import { db } from "./firebase";
import { addDoc, collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";

function withTimestamp(profile, text, extra = {}) {
  const { imageUrl = null, videoUrl = null, ...rest } = extra;
  return {
    userId: profile.userId,
    userNickname: profile.userNickname,
    userAvatar: profile.userAvatar,
    userColor: profile.userColor,
    text,
    imageUrl,
    videoUrl,
    likes: [],
    createdAt: serverTimestamp(),
    ...rest,
  };
}

export async function publishDesignFeedFromClient(payload, { publisherProfile } = {}) {
  if (!publisherProfile?.uid) {
    throw new Error("missing publisher profile");
  }

  const results = { studentPostId: null };
  const owner = {
    userId: publisherProfile.uid,
    userNickname: payload.studentPost.userNickname,
    userAvatar: payload.studentPost.userAvatar,
    userColor: payload.studentPost.userColor,
  };
  const teacherOwner = {
    userId: publisherProfile.uid,
    userNickname: payload.reviewComment.userNickname,
    userAvatar: payload.reviewComment.userAvatar,
    userColor: payload.reviewComment.userColor,
  };

  const studentRef = await addDoc(collection(db, "posts"), withTimestamp(
    owner,
    payload.studentPost.text,
    {
      imageUrl: payload.studentPost.imageUrl || null,
      isAiDesignPost: true,
      designPostType: payload.studentPost.designPostType,
      designSlotKey: payload.studentPost.designSlotKey,
      designSlotLabel: payload.studentPost.designSlotLabel,
      designTargetName: payload.studentPost.designTargetName,
      designTargetPath: payload.studentPost.designTargetPath,
      reviewStatus: payload.studentPost.reviewStatus,
      designEngine: payload.studentPost.designEngine,
      designMockupEngine: payload.studentPost.designMockupEngine || "none",
      designAttemptNum: payload.studentPost.designAttemptNum || 1,
      designAuthor: payload.studentPost.userId,
      publishedVia: "client",
      publishedByUid: publisherProfile.uid,
    }
  ));
  results.studentPostId = studentRef.id;

  const batch = writeBatch(db);
  batch.set(doc(collection(db, "posts", studentRef.id, "comments")), withTimestamp(
    teacherOwner,
    payload.reviewComment.text,
    {
      isAiDesignReview: true,
      reviewStatus: payload.reviewComment.reviewStatus,
      designAuthor: payload.reviewComment.userId,
      publishedByUid: publisherProfile.uid,
    }
  ));
  if (payload.revisionComment) {
    batch.set(doc(collection(db, "posts", studentRef.id, "comments")), withTimestamp(
      {
        userId: publisherProfile.uid,
        userNickname: payload.revisionComment.userNickname,
        userAvatar: payload.revisionComment.userAvatar,
        userColor: payload.revisionComment.userColor,
      },
      payload.revisionComment.text,
      {
        isAiDesignRevision: true,
        revisionOfSlotKey: payload.revisionComment.revisionOfSlotKey,
        designAuthor: payload.revisionComment.userId,
        publishedByUid: publisherProfile.uid,
      }
    ));
  }
  await batch.commit();

  return results;
}
