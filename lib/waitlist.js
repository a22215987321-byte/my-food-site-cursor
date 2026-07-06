const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const WAITLIST_INTENTS = ["notify", "pro"];

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && normalized.length <= 320 && EMAIL_RE.test(normalized);
}

export function parseWaitlistIntent(intent) {
  const value = String(intent || "notify").trim().toLowerCase();
  return WAITLIST_INTENTS.includes(value) ? value : null;
}

export function intentLabel(intent) {
  return intent === "pro" ? "想試用 Pro" : "加入等待名單";
}
