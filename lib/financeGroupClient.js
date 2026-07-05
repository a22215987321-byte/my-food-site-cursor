// lib/financeGroupClient.js
// 客戶端：自動加入公開 AI 財經工作室群組。

import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { FINANCE_STUDIO_GROUP_ID, FINANCE_STUDIO_GROUP_META } from "./financeGroupConstants";

export { FINANCE_STUDIO_GROUP_ID, FINANCE_STUDIO_GROUP_META };

export function buildFinanceStudioGroupPlaceholder() {
  return {
    id: FINANCE_STUDIO_GROUP_ID,
    name: FINANCE_STUDIO_GROUP_META.name,
    avatar: FINANCE_STUDIO_GROUP_META.avatar,
    isPublic: true,
    isAiFinanceGroup: true,
    members: ["aifather", "aifinancementor"],
    pendingSetup: true,
  };
}

export async function ensureJoinedFinanceStudioGroup(uid) {
  if (!uid) return false;
  const ref = doc(db, "groups", FINANCE_STUDIO_GROUP_ID);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const members = snap.data().members || [];
  if (members.includes(uid)) return true;

  await updateDoc(ref, { members: arrayUnion(uid) });
  return true;
}
