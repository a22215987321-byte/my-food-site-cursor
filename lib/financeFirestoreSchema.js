// lib/financeFirestoreSchema.js
// Firestore path helpers and schema guards for the Finance AI Dad memory layer.

export const FINANCE_COLLECTIONS = {
  assets: "financeAssets",
  quotes: "financeQuotes",
  indicators: "financeIndicators",
  fundamentals: "financeFundamentals",
  newsSnapshots: "financeNewsSnapshots",
  briefs: "financeBriefs",
};

export const FINANCE_MENTOR_COLLECTIONS = {
  trainings: "financeMentorTrainings",
  runs: "financeMentorRuns",
  directives: "financeMentorDirectives",
};

export function financeProfilePath(uid) {
  return ["users", uid, "financeProfile", "default"];
}

export function dadMemoryPath(uid, memoryId) {
  return ["users", uid, "dadMemory", memoryId];
}

export function financeAgentRunPath(uid, runId) {
  return ["users", uid, "financeAgentRuns", runId];
}

export function briefDeliveryPath(uid, dateKey) {
  return ["users", uid, "briefDeliveries", dateKey];
}

export function assetPath(assetId) {
  return [FINANCE_COLLECTIONS.assets, assetId];
}

export function dailyQuotePath(assetId, dateKey) {
  return [FINANCE_COLLECTIONS.quotes, assetId, "daily", dateKey];
}

export function dailyIndicatorPath(assetId, dateKey) {
  return [FINANCE_COLLECTIONS.indicators, assetId, "daily", dateKey];
}

export function fundamentalPeriodPath(assetId, periodId) {
  return [FINANCE_COLLECTIONS.fundamentals, assetId, "periods", periodId];
}

export function validateFiniteNumber(value, fieldName) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid finance number for ${fieldName}: ${value}`);
  }
  return n;
}

export function normalizeFinanceQuote(raw) {
  return {
    assetId: raw.assetId,
    open: validateFiniteNumber(raw.open, "open"),
    high: validateFiniteNumber(raw.high, "high"),
    low: validateFiniteNumber(raw.low, "low"),
    close: validateFiniteNumber(raw.close, "close"),
    volume: validateFiniteNumber(raw.volume ?? 0, "volume"),
    currency: raw.currency,
    source: raw.source,
    validatedAt: raw.validatedAt || new Date().toISOString(),
  };
}

export function buildFinanceAgentRunDoc(result, message) {
  return {
    message: String(message || "").slice(0, 2000),
    intent: result.intent || "unknown",
    assetIds: Array.isArray(result.assetIds) ? result.assetIds : [],
    toolsUsed: Array.isArray(result.usedTools) ? result.usedTools : [],
    validationErrors: result.numericValidation?.errors || [],
    citations: Array.isArray(result.citations) ? result.citations : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    numericValidation: {
      ok: result.numericValidation?.ok === true,
      noNaN: result.numericValidation?.noNaN === true,
    },
    createdAt: new Date().toISOString(),
  };
}

export function financeMentorTrainingPath(dateKey) {
  return [FINANCE_MENTOR_COLLECTIONS.trainings, dateKey];
}

export function financeMentorRunPath(dateKey) {
  return [FINANCE_MENTOR_COLLECTIONS.runs, dateKey];
}

export function financeMentorDirectivePath(dateKey) {
  return [FINANCE_MENTOR_COLLECTIONS.directives, dateKey];
}

export function buildFinanceMentorDirectiveDoc(run) {
  return {
    dateKey: run.dateKey,
    status: "active",
    directives: Array.isArray(run.directives) ? run.directives : [],
    errorList: Array.isArray(run.errorList) ? run.errorList : [],
    improvements: Array.isArray(run.improvements) ? run.improvements : [],
    rubricSummary: run.rubricSummary || "",
    topicId: run.topic?.id || "general",
    topicLabel: run.topic?.label || "一般訓練",
    reviewStatus: run.reviewStatus || "active",
    version: 1,
    engine: run.engine || "rule",
    createdAt: new Date().toISOString(),
  };
}

export function buildFinanceMentorRunDoc(run) {
  return {
    dateKey: run.dateKey,
    briefReview: run.briefReview || "",
    sampleQAs: Array.isArray(run.sampleQAs) ? run.sampleQAs : [],
    errorList: Array.isArray(run.errorList) ? run.errorList : [],
    improvements: Array.isArray(run.improvements) ? run.improvements : [],
    reviewStatus: run.reviewStatus || "active",
    engine: run.engine || "rule",
    createdAt: new Date().toISOString(),
  };
}
