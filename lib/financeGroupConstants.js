// lib/financeGroupConstants.js
// 公開 AI 財經工作室群組的固定 ID 與 AI 成員資料。

export const FINANCE_STUDIO_GROUP_ID = "ai_finance_studio";

export const FINANCE_STUDIO_GROUP_META = {
  name: "AI財經工作室",
  avatar: "📈",
  description: "AI財經導師每天訓練 AI 爸爸，並在群組公開每日財經總結。",
};

export const FINANCE_FATHER_GROUP_PROFILE = {
  userId: "aifather",
  userNickname: "AI 爸爸",
  userAvatar: "👨",
  userColor: "#3b82f6",
};

export const FINANCE_MENTOR_GROUP_PROFILE = {
  userId: "aifinancementor",
  userNickname: "AI財經導師",
  userAvatar: "📊",
  userColor: "#0ea5e9",
};

export const FINANCE_STUDIO_AI_MEMBERS = [
  FINANCE_FATHER_GROUP_PROFILE.userId,
  FINANCE_MENTOR_GROUP_PROFILE.userId,
];
