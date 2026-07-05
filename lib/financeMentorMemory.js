// lib/financeMentorMemory.js
// 從 Firestore 讀取最新 active 導師指令，供 AI 爸爸 runtime 注入 prompt。

import { getAdminDb } from "./firebaseAdmin";
import { FINANCE_MENTOR_COLLECTIONS } from "./financeFirestoreSchema";
import { formatMentorContextFromDirectives } from "./financeMentorStudio";

let memoryCache = { loadedAt: 0, directive: null };
const CACHE_TTL_MS = 5 * 60 * 1000;

export function formatMentorContextForPrompt(directiveDoc) {
  return formatMentorContextFromDirectives(directiveDoc);
}

export async function loadActiveMentorDirective({ force = false } = {}) {
  const now = Date.now();
  if (!force && memoryCache.directive && now - memoryCache.loadedAt < CACHE_TTL_MS) {
    return memoryCache.directive;
  }

  try {
    const db = getAdminDb();
    const snap = await db
      .collection(FINANCE_MENTOR_COLLECTIONS.directives)
      .orderBy("dateKey", "desc")
      .limit(5)
      .get();

    const activeDoc = snap.docs.find((d) => d.data().status === "active");
    const directive = activeDoc ? { id: activeDoc.id, ...activeDoc.data() } : null;
    memoryCache = { loadedAt: now, directive };
    return directive;
  } catch (err) {
    console.error("[finance-mentor-memory] load failed:", err.message);
    return memoryCache.directive;
  }
}

export async function loadMentorContextForPrompt({ force = false } = {}) {
  const directive = await loadActiveMentorDirective({ force });
  return formatMentorContextForPrompt(directive);
}

export function buildMentorContextPayload(directiveDoc) {
  if (!directiveDoc) return null;
  return {
    dateKey: directiveDoc.dateKey,
    rubricSummary: directiveDoc.rubricSummary || "",
    directives: Array.isArray(directiveDoc.directives) ? directiveDoc.directives : [],
    errorList: Array.isArray(directiveDoc.errorList) ? directiveDoc.errorList : [],
    improvements: Array.isArray(directiveDoc.improvements) ? directiveDoc.improvements : [],
  };
}
