import { generateDesignMockupImage } from "./designMockupImage";

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

function pickTarget(seed) {
  return DESIGN_TARGETS[hashString(seed) % DESIGN_TARGETS.length];
}

function getAttemptMeta(submissionSeq = 0) {
  const seq = Number(submissionSeq) || Date.now();
  const attemptNum = (hashString(String(seq)) % 4) + 1;
  const angle = TRAINING_ANGLES[hashString(`angle-${seq}`) % TRAINING_ANGLES.length];
  const variant = hashString(`variant-${seq}`) % 3;
  return { attemptNum, angle, variant, seq };
}

const TRAINING_ANGLES = [
  "資訊層級：先讓使用者 3 秒內看懂畫面主標與主要操作",
  "間距節奏：統一 8/12/16px 間距，避免卡片擠在一起",
  "色彩對比：正文 #e2e8f0、次要 #94a3b8、重點用紫青漸層",
  "互動回饋：hover / active / disabled 三態要一致",
  "空狀態引導：沒內容時也要告訴使用者下一步",
  "行動版可讀性：窄螢幕下主欄位不能被側欄擠壓",
];

const STUDENT_OBSERVATIONS = [
  (target, angle) =>
    `我重新檢視「${target.name}」，目前最大問題是 ${angle.split("：")[0]} 還不夠清楚，使用者容易迷失在 ${target.focus.split("、")[0]}。`,
  (target, angle) =>
    `這次我不重複上次方向，改從「${angle}」切入 ${target.name}，先找出第一眼會看到的元素。`,
  (target, angle) =>
    `比對 EVONVCHAT 現有暗色風格後，我發現 ${target.name} 的 ${target.focus.split("、").pop()} 仍缺少明確層級。`,
];

const DEV_CHANGES = {
  聊天室首頁: [
    "ChatRoom.js：sidebar 項目加 padding 12px 16px、active 左側 3px #8b5cf6 指示條",
    "ChatRoom.js：AI 角色列加 11px 灰色說明字，未讀 badge 改 min-width 18px",
    "ChatRoom.js：大廳/私訊/群組分區標題改 font-size 11px、letter-spacing 0.5",
  ],
  動態消息: [
    "Feed.js：PostCard 標題區 padding 改 16px、AI 標籤與審核標籤 gap 8px",
    "Feed.js：貼文正文 line-height 1.65、圖片區 max-height 420px 統一",
    "Feed.js：留言區 input border-radius 20px、送出按鈕高度 36px",
  ],
  個人頁: [
    "profile/[uid].js：頭像區 min-height 180px、統計數字 font-size 20px",
    "profile/[uid].js：分頁 tab active 底線 2px #8b5cf6",
    "profile/[uid].js：貼文卡片間距 margin-bottom 16px",
  ],
  "AI 新聞頁": [
    "ChatRoom.js 新聞卡：來源標籤 font-size 10px、摘要最多 2 行 ellipsis",
    "ChatRoom.js 新聞卡：播放按鈕固定 40x40、與標題垂直置中",
    "ChatRoom.js 新聞列表 item gap 12px",
  ],
  電影院: [
    "ChatRoom.js 影院：播放區 background #020617、控制列 sticky bottom",
    "ChatRoom.js 影院：直播 badge 紅點 + LIVE 字樣",
    "ChatRoom.js 影院：留言區 max-height 240px scroll",
  ],
  AvatarCreator: [
    "AvatarCreator.js：色票區加選中框 2px #22d3ee",
    "AvatarCreator.js：像素格 hover 顯示預覽色",
    "AvatarCreator.js：步驟提示 sticky top 0",
  ],
  CalendarMemo: [
    "CalendarMemo.js：日期格 today 邊框 #8b5cf6",
    "CalendarMemo.js：空日期顯示「點擊新增」hint",
    "CalendarMemo.js：備忘 textarea min-height 120px",
  ],
};

function getDevChange(target, variant) {
  const list = DEV_CHANGES[target.name] || [
    `${target.path}：調整 padding / border-radius / 字級`,
    `${target.path}：主按鈕改 linear-gradient(135deg,#8b5cf6,#22d3ee)`,
    `${target.path}：次要文字 color #94a3b8`,
  ];
  return list[variant % list.length];
}

function formatStudentPrompt(target, slot, meta = {}) {
  const { attemptNum = 1, angle, variant = 0 } = meta;
  const observe = STUDENT_OBSERVATIONS[variant % STUDENT_OBSERVATIONS.length](target, angle);
  const devChange = getDevChange(target, variant);

  return [
    `【${slot.label} · AI美術生 設計作品 v${attemptNum}】`,
    `研究頁面：${target.name}（${target.path}）`,
    `本版切入角度：${angle}`,
    "",
    "1. 今日觀察",
    observe,
    "",
    "2. 設計目標",
    target.goal,
    "",
    "3. 改版草案（具體）",
    `- 版面：${target.suggestion}`,
    `- 本版重点：${angle.split("：")[1] || angle}`,
    `- 元件：${devChange.split("：")[0]}`,
    "",
    "4. 可實作建議",
    `- ${devChange}`,
    "- 驗收：使用者能在 3 秒內找到主要操作；暗色底 #0a0f1e 不變。",
  ].join("\n");
}

function formatTeacherReview(target, slot, approved, meta = {}, studentText = "") {
  const { attemptNum = 1, angle, variant = 0 } = meta;
  const snippet = String(studentText || "").split("\n").find((l) => l.trim().length > 12)?.trim() || target.suggestion;
  const devChange = getDevChange(target, variant);

  if (approved) {
    return [
      `【${slot.label} · AI美術師審核 · 第${attemptNum}次】`,
      "結果：通過。",
      `做得好的地方：你有針對「${angle.split("：")[0]}」提出可落地修改，且引用了 ${target.path}。`,
      `具體肯定：${snippet.slice(0, 60)}…`,
      `下一課：維持通過品質，下次改做「${TRAINING_ANGLES[(variant + 1) % TRAINING_ANGLES.length].split("：")[0]}」。`,
    ].join("\n");
  }

  return [
    `【${slot.label} · AI美術師審核 · 第${attemptNum}次】`,
    "結果：打回重做。",
    `問題 1：${target.name} 仍缺可量化的驗收標準（例如主 CTA 位置、字級 px 值）。`,
    `問題 2：你寫到「${snippet.slice(0, 40)}…」但沒說要改哪個元件的哪個 style 屬性。`,
    `問題 3：${angle.split("：")[0]} 尚未在本版落實。`,
    `重做要求：下一版只改 ${devChange}，並補「改前/改後」各一行。`,
  ].join("\n");
}

function formatRevision(target, slot, meta = {}, reviewText = "") {
  const { attemptNum = 1, angle, variant = 0 } = meta;
  const nextVariant = (variant + 1) % 3;
  const devChange = getDevChange(target, nextVariant);
  const userDiff = [
    `主標題與第一個可點按鈕的距離縮短，進入 ${target.name} 不再覺得空`,
    `卡片邊界更清楚，${target.focus.split("、")[0]} 一眼可掃描`,
    `次要資訊變淡（#64748b），重點操作更突出`,
  ][nextVariant];

  return [
    `【${slot.label} · AI美術生修正版 v${attemptNum + 1}】`,
    "收到 AI美術師打回，以下是針對審核意見的修正（不是重交同一版）：",
    "",
    "第一優先修改區塊",
    `- ${target.focus.split("、")[0]}（${target.path}）`,
    "",
    "使用者會感受到的差異",
    `- ${userDiff}`,
    "",
    "開發改法（可直接貼給工程師）",
    `- ${devChange}`,
    `- 本版聚焦：${angle}`,
    "",
    "改前 → 改後",
    `- 改前：元素層級扁平、重點不明`,
    `- 改後：${devChange.split("：").pop() || "間距與字級統一"}`,
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

export async function generateDesignRun({ force = false, submissionSeq = 0, now = new Date() } = {}) {
  const slot = getDesignSlot(now);
  const meta = getAttemptMeta(force ? submissionSeq || Date.now() : slot.slotKey);
  const targetSeed = force ? `${slot.slotKey}-${meta.seq}` : slot.slotKey;

  if (!force && runCache.slotKey === slot.slotKey && runCache.run) {
    const cached = runCache.run;
    if (cached.mockupImageUrl) return cached;
  }

  const target = pickTarget(targetSeed);
  const approved = meta.attemptNum >= 3 || hashString(`${targetSeed}:${target.name}`) % 4 !== 0;

  const studentSystem =
    "你是 EVONVCHAT 的 AI美術生。請用繁體中文產出文字版頁面設計作品，每版必須與上一版不同，要寫具體 px/色碼/元件名，禁止空話。不要使用 Markdown 表格。";
  const studentUser =
    `第 ${meta.attemptNum} 次交稿\n時段：${slot.label}\n切入角度：${meta.angle}\n頁面：${target.name}\n檔案：${target.path}\n焦點：${target.focus}\n目標：${target.goal}\n` +
    `具體改法參考：${getDevChange(target, meta.variant)}\n請輸出 4 段：今日觀察、設計目標、改版草案、可實作建議。`;
  const geminiStudentText = await callGeminiText(studentSystem, studentUser);

  const studentText = geminiStudentText || formatStudentPrompt(target, slot, meta);
  const teacherSystem =
    "你是 EVONVCHAT 的 AI美術師。請用繁體中文審核作品。必須引用學生原文指出 2-3 個具體問題或優點，給 px/元件/色碼級別的回饋，禁止套話。不要使用 Markdown 表格。";
  const teacherUser =
    `第 ${meta.attemptNum} 次審核\n結果：${approved ? "通過" : "打回重做"}\n角度：${meta.angle}\n頁面：${target.name}\n作品：\n${studentText}\n` +
    "請輸出：審核結果、2-3 條具體理由、下一版可執行的修改指令。";
  const geminiReviewText = await callGeminiText(teacherSystem, teacherUser, 700);

  const reviewText = geminiReviewText || formatTeacherReview(target, slot, approved, meta, studentText);
  const revisionText = approved ? "" : formatRevision(target, slot, meta, reviewText);

  const { mockupImageUrl, mockupEngine } = await generateDesignMockupImage({
    target,
    slot,
    studentText,
  });

  const run = {
    slot,
    target,
    studentText,
    reviewText,
    revisionText,
    reviewStatus: approved ? "approved" : "revision_required",
    engine: geminiStudentText || geminiReviewText ? "gemini" : "rule",
    attemptNum: meta.attemptNum,
    trainingAngle: meta.angle,
    mockupImageUrl,
    mockupEngine,
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
