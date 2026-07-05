const GEMINI_MODEL = "gemini-2.5-flash";

export const ART_STUDENT_PROFILE = {
  userId: "aiartstudent",
  userNickname: "AI美術生",
  userAvatar: "🎨",
  userColor: "#8b5cf6",
};

export const ART_TEACHER_PROFILE = {
  userId: "aiartteacher",
  userNickname: "AI美術師",
  userAvatar: "🖌️",
  userColor: "#06b6d4",
};

const DESIGN_TARGETS = [
  {
    name: "聊天室首頁",
    path: "components/ChatRoom.js",
    focus: "左側導覽、聊天主畫面、AI 陪伴入口",
    goal: "讓新使用者更快理解大廳、好友、群組與 AI 角色的差異。",
    suggestion: "增加更明確的區塊標籤、未讀狀態層級，以及 AI 角色的用途短句。",
  },
  {
    name: "動態消息",
    path: "components/Feed.js",
    focus: "貼文卡片、留言、AI 設計工作室貼文",
    goal: "讓一般貼文與 AI 設計作品都能清楚閱讀，並保留社群感。",
    suggestion: "為 AI 貼文加入工作室標籤、審核狀態與更清楚的文字節奏。",
  },
  {
    name: "個人頁",
    path: "pages/profile/[uid].js",
    focus: "個人資訊、貼文列表、媒體分頁",
    goal: "把個人頁做成更像創作者名片，而不只是貼文清單。",
    suggestion: "強化頭像區、統計資訊與分頁切換狀態，讓視覺重心更集中。",
  },
  {
    name: "AI 新聞頁",
    path: "components/ChatRoom.js",
    focus: "AI 新聞列表與語音播報",
    goal: "讓新聞卡片更容易掃讀，並凸顯語音播放是特色功能。",
    suggestion: "調整新聞來源標籤、摘要徽章與播放按鈕的層級，減少資訊擁擠感。",
  },
  {
    name: "電影院",
    path: "components/ChatRoom.js",
    focus: "直播房間列表、播放區、聊天室留言",
    goal: "營造更沉浸的觀看體驗，同時讓操作按鈕更清楚。",
    suggestion: "用更深的舞台背景、直播狀態膠囊與固定操作區建立劇場感。",
  },
  {
    name: "AvatarCreator",
    path: "components/AvatarCreator.js",
    focus: "像素頭像編輯器",
    goal: "讓創作工具更像可玩的小型設計台。",
    suggestion: "加入步驟提示、目前選色狀態與完成預覽，降低第一次使用門檻。",
  },
  {
    name: "CalendarMemo",
    path: "components/CalendarMemo.js",
    focus: "右側備忘錄面板",
    goal: "讓備忘錄更像聊天旁的輕量任務板。",
    suggestion: "用日期標籤、空狀態提示與更穩定的間距，提升可讀性。",
  },
];

const TRAINING_TOPICS = [
  "資訊層級：每個畫面只能有一個最主要的視覺焦點。",
  "一致性：同一種互動狀態要使用相同的顏色、間距與圓角語言。",
  "可讀性：暗色介面要避免灰字過暗，正文與次要文字需要明確對比。",
  "可實作性：每個設計提案都要能轉成具體 React/CSS 修改。",
  "動線：先讓使用者知道現在在哪裡，再提供下一步操作。",
  "節制：漸層與發光效果只能服務重點，不應該讓整個畫面都在搶注意力。",
];

let runCache = { slotKey: null, run: null };
let trainingCache = { dateKey: null, training: null };

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getTaipeiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: Number(pick("hour") || 0),
  };
}

export function getTaipeiDateKey(date = new Date()) {
  const parts = getTaipeiParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getDesignSlot(date = new Date()) {
  const parts = getTaipeiParts(date);
  const slotHour = Math.floor(parts.hour / 2) * 2;
  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    dateKey,
    slotHour,
    slotKey: `${dateKey}T${pad2(slotHour)}`,
    label: `${Number(parts.month)}月${Number(parts.day)}日 ${pad2(slotHour)}:00`,
  };
}

function pickTarget(slotKey) {
  return DESIGN_TARGETS[hashString(slotKey) % DESIGN_TARGETS.length];
}

function formatStudentPrompt(target, slot) {
  return [
    `【${slot.label} · AI美術生 EVONVCHAT 頁面設計作品】`,
    `研究頁面：${target.name}（${target.path}）`,
    "",
    "1. 今日觀察",
    `我先研究「${target.focus}」。這個區域目前已經有 EVONVCHAT 的暗色聊天風格，但還可以把使用者的第一眼焦點整理得更清楚。`,
    "",
    "2. 設計目標",
    target.goal,
    "",
    "3. 改版草案",
    `- 版面：${target.suggestion}`,
    "- 配色：保留深藍黑背景，主操作使用紫色到青色漸層，警示與審核狀態使用少量高對比色。",
    "- 互動：hover、active、loading 狀態要統一，讓使用者知道每個卡片或按鈕是否可操作。",
    "",
    "4. 可實作建議",
    "用現有 inline style 模式先做小幅調整：新增標籤、狀態膠囊、間距規則，不引入新的 UI 套件，避免影響整站穩定性。",
  ].join("\n");
}

function formatTeacherReview(target, slot, approved) {
  if (approved) {
    return [
      `【${slot.label} · AI美術師審核】`,
      "結果：通過。",
      `理由：這份作品有清楚指出「${target.name}」的設計目標，也有可落地的版面、配色與互動方向。`,
      "下一次訓練：把每個改版點再補上優先級，先做最能改善使用者理解的部分。",
    ].join("\n");
  }

  return [
    `【${slot.label} · AI美術師審核】`,
    "結果：打回重做。",
    "問題：作品方向可行，但還不夠像專業設計交付，缺少明確的優先順序與驗收標準。",
    "重做要求：下一版要補上「第一優先修改區塊」、「使用者會感受到的差異」、「開發時要改的元件或樣式」。",
  ].join("\n");
}

function formatRevision(target, slot) {
  return [
    `【${slot.label} · AI美術生修正版】`,
    "收到 AI美術師打回，我補交修正版：",
    `第一優先修改區塊：${target.focus}。`,
    `使用者差異：進入「${target.name}」時，可以更快知道目前畫面重點與下一步操作。`,
    `開發改法：在 ${target.path} 內先新增狀態標籤與卡片層級樣式，沿用現有深色背景、紫色主色與 12-16px 圓角。`,
  ].join("\n");
}

function formatDailyTraining(dateKey) {
  const topic = TRAINING_TOPICS[hashString(dateKey) % TRAINING_TOPICS.length];
  return [
    `【${dateKey} · AI美術師每日訓練】`,
    `今日課題：${topic}`,
    "訓練規則：AI美術生今天每份作品都要先說清楚畫面問題，再提出具體的版面、配色、互動與可實作建議。",
    "審核標準：不具體、不符合 EVONVCHAT 暗色聊天風格、或無法轉成程式修改的作品，一律打回重做。",
  ].join("\n");
}

async function callGeminiText(systemText, userText, maxOutputTokens = 900) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userText }] }],
          systemInstruction: { parts: [{ text: systemText }] },
          generationConfig: { temperature: 0.78, maxOutputTokens },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`gemini http ${res.status}`);
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || null;
  } catch (err) {
    clearTimeout(timer);
    console.error("[design-studio] gemini failed:", err.message);
    return null;
  }
}

export async function generateDesignRun({ force = false, now = new Date() } = {}) {
  const slot = getDesignSlot(now);
  if (!force && runCache.slotKey === slot.slotKey && runCache.run) {
    return runCache.run;
  }

  const target = pickTarget(slot.slotKey);
  const approved = hashString(`${slot.slotKey}:${target.name}`) % 4 !== 0;

  const studentSystem =
    "你是 EVONVCHAT 的 AI美術生。請用繁體中文產出文字版頁面設計作品，語氣認真、有學習感，但內容必須具體可實作。不要使用 Markdown 表格。";
  const studentUser =
    `時段：${slot.label}\n頁面：${target.name}\n檔案：${target.path}\n焦點：${target.focus}\n目標：${target.goal}\n建議方向：${target.suggestion}\n` +
    "請輸出 4 段：今日觀察、設計目標、改版草案、可實作建議。";
  const geminiStudentText = await callGeminiText(studentSystem, studentUser);

  const studentText = geminiStudentText || formatStudentPrompt(target, slot);
  const teacherSystem =
    "你是 EVONVCHAT 的 AI美術師。請用繁體中文審核 AI美術生作品。你要嚴格但具體，必須給出通過或打回重做與理由。不要使用 Markdown 表格。";
  const teacherUser =
    `審核結果預設：${approved ? "通過" : "打回重做"}\n頁面：${target.name}\n作品：\n${studentText}\n` +
    "請輸出審核結果、理由、下一次訓練或重做要求。";
  const geminiReviewText = await callGeminiText(teacherSystem, teacherUser, 700);

  const reviewText = geminiReviewText || formatTeacherReview(target, slot, approved);
  const revisionText = approved ? "" : formatRevision(target, slot);

  const run = {
    slot,
    target,
    studentText,
    reviewText,
    revisionText,
    reviewStatus: approved ? "approved" : "revision_required",
    engine: geminiStudentText || geminiReviewText ? "gemini" : "rule",
    generatedAt: new Date().toISOString(),
  };

  runCache = { slotKey: slot.slotKey, run };
  return run;
}

export async function generateDailyTraining({ force = false, now = new Date() } = {}) {
  const dateKey = getTaipeiDateKey(now);
  if (!force && trainingCache.dateKey === dateKey && trainingCache.training) {
    return trainingCache.training;
  }

  const systemText =
    "你是 EVONVCHAT 的 AI美術師。請用繁體中文寫一則每日設計訓練貼文給 AI美術生，短而具體，不要使用 Markdown 表格。";
  const topic = TRAINING_TOPICS[hashString(dateKey) % TRAINING_TOPICS.length];
  const geminiText = await callGeminiText(
    systemText,
    `日期：${dateKey}\n今日課題：${topic}\n請輸出每日訓練、交稿規則、審核標準。`,
    600
  );

  const training = {
    dateKey,
    text: geminiText || formatDailyTraining(dateKey),
    engine: geminiText ? "gemini" : "rule",
    generatedAt: new Date().toISOString(),
  };

  trainingCache = { dateKey, training };
  return training;
}
