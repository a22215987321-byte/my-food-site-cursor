import { uploadBufferToR2 } from "./r2Upload.js";

const GEMINI_IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation";

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sidebarNav(items) {
  return items
    .map(
      (item, i) =>
        `<rect x="16" y="${56 + i * 44}" width="208" height="36" rx="10" fill="${i === 0 ? "#1e293b" : "#0f172a"}" stroke="${i === 0 ? "#8b5cf6" : "#334155"}" stroke-width="1"/>
         <text x="32" y="${79 + i * 44}" fill="${i === 0 ? "#e2e8f0" : "#64748b"}" font-size="13" font-family="Inter,sans-serif">${escapeXml(item)}</text>`
    )
    .join("");
}

function cardBlock(x, y, w, h, title, lines = []) {
  const lineSvg = lines
    .map(
      (line, i) =>
        `<rect x="${x + 16}" y="${y + 48 + i * 22}" width="${w - 32}" height="10" rx="4" fill="#334155" opacity="${0.45 + (i % 3) * 0.15}"/>`
    )
    .join("");
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="${x + 16}" y="${y + 28}" fill="#e2e8f0" font-size="14" font-weight="700" font-family="Inter,sans-serif">${escapeXml(title)}</text>
    ${lineSvg}
  `;
}

function layoutForTarget(target) {
  const name = target?.name || "EVONVCHAT";
  if (name.includes("動態")) {
    return {
      nav: ["💬 聊天室", "📋 動態消息", "👤 個人頁"],
      main: cardBlock(280, 120, 860, 180, "貼文卡片 · AI 設計工作室", [1, 2, 3, 4]) +
        cardBlock(280, 320, 860, 140, "審核狀態與標籤層級", [1, 2, 3]),
    };
  }
  if (name.includes("個人")) {
    return {
      nav: ["貼文", "媒體", "關於"],
      main: `<circle cx="420" cy="170" r="42" fill="#8b5cf6"/>
             <rect x="480" y="130" width="220" height="16" rx="6" fill="#e2e8f0"/>
             <rect x="480" y="160" width="160" height="12" rx="4" fill="#64748b"/>
             ${cardBlock(280, 240, 860, 220, "創作者名片與貼文列表", [1, 2, 3, 4, 5])}`,
    };
  }
  if (name.includes("電影院")) {
    return {
      nav: ["🎬 直播房", "🔥 熱門", "📺 我的房間"],
      main: `<rect x="280" y="100" width="560" height="300" rx="16" fill="#020617" stroke="#334155"/>
             <rect x="860" y="100" width="280" height="300" rx="16" fill="#1e293b" stroke="#334155"/>
             <text x="300" y="130" fill="#94a3b8" font-size="12" font-family="Inter,sans-serif">播放區 · 舞台背景</text>
             <text x="880" y="130" fill="#94a3b8" font-size="12" font-family="Inter,sans-serif">即時留言</text>`,
    };
  }
  if (name.includes("Avatar")) {
    return {
      nav: ["色票", "像素格", "預覽"],
      main: `<rect x="300" y="110" width="360" height="360" rx="12" fill="#0f172a" stroke="#334155"/>
             ${cardBlock(700, 110, 440, 160, "步驟提示與選色狀態", [1, 2, 3])}
             ${cardBlock(700, 290, 440, 180, "完成預覽", [1, 2, 3, 4])}`,
    };
  }
  if (name.includes("Calendar") || name.includes("備忘")) {
    return {
      nav: ["本月", "下月", "備忘"],
      main: cardBlock(280, 100, 420, 360, "日曆格子", [1, 2, 3, 4, 5, 6, 7, 8]) +
        cardBlock(720, 100, 420, 360, "備忘錄編輯區", [1, 2, 3, 4, 5]),
    };
  }
  if (name.includes("新聞")) {
    return {
      nav: ["AI 新聞", "語音", "收藏"],
      main: cardBlock(280, 100, 860, 120, "新聞卡片 · 來源標籤", [1, 2, 3]) +
        cardBlock(280, 240, 860, 120, "摘要徽章 · 播放按鈕", [1, 2, 3]) +
        cardBlock(280, 380, 860, 80, "掃讀層級優化", [1, 2]),
    };
  }
  return {
    nav: ["🏛 大廳", "👥 好友", "🤖 AI 陪伴"],
    main: cardBlock(280, 100, 560, 380, "聊天主畫面", [1, 2, 3, 4, 5, 6, 7, 8]) +
      cardBlock(860, 100, 280, 180, "AI 角色入口", [1, 2, 3]) +
      cardBlock(860, 300, 280, 180, "未讀狀態", [1, 2, 3]),
  };
}

export function buildWireframeSvg(target, slot) {
  const layout = layoutForTarget(target);
  const title = target?.name || "EVONVCHAT";
  const slotLabel = slot?.label || "";
  const focus = target?.focus || "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="#0a0f1e"/>
  <rect x="0" y="0" width="1200" height="56" fill="#0f172a" stroke="#1e293b"/>
  <text x="24" y="36" fill="#e2e8f0" font-size="18" font-weight="700" font-family="Inter,sans-serif">EVONVCHAT · 設計 mockup</text>
  <text x="900" y="36" fill="#64748b" font-size="13" font-family="Inter,sans-serif">${escapeXml(slotLabel)}</text>
  <rect x="0" y="56" width="240" height="619" fill="#0f172a" stroke="#1e293b"/>
  ${sidebarNav(layout.nav)}
  <rect x="240" y="56" width="960" height="619" fill="#0a0f1e"/>
  <text x="280" y="92" fill="#e2e8f0" font-size="20" font-weight="700" font-family="Inter,sans-serif">${escapeXml(title)}</text>
  <text x="280" y="114" fill="#64748b" font-size="12" font-family="Inter,sans-serif">${escapeXml(focus)}</text>
  <rect x="980" y="72" width="180" height="36" rx="10" fill="url(#accent)"/>
  <text x="1010" y="95" fill="#fff" font-size="12" font-weight="700" font-family="Inter,sans-serif">主要操作</text>
  ${layout.main}
  <text x="24" y="660" fill="#475569" font-size="11" font-family="Inter,sans-serif">AI美術生 · 線框 mockup · ${escapeXml(title)}</text>
</svg>`;
}

async function callGeminiDesignImage(target, studentText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt =
    `Generate a UI design mockup image for a dark-themed social chat web app called EVONVCHAT. ` +
    `Page: ${target.name}. Focus: ${target.focus}. ` +
    `Style: deep navy background (#0a0f1e), purple-to-cyan gradient accents, modern cards, Traditional Chinese labels where appropriate. ` +
    `Show a wireframe-style redesign concept, not a photo. No real brand logos. ` +
    `Design brief excerpt: ${String(studentText || "").slice(0, 400)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`gemini image http ${res.status}`);
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart) return null;

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const ext = mimeType.includes("jpeg") ? "jpg" : mimeType.includes("webp") ? "webp" : "png";
    const buffer = Buffer.from(imagePart.inlineData.data, "base64");
    const url = await uploadBufferToR2(buffer, { fileName: `mockup.${ext}`, contentType: mimeType, prefix: "design-mockups" });
    return url;
  } catch (err) {
    clearTimeout(timer);
    console.error("[design-mockup] gemini image failed:", err.message);
    return null;
  }
}

export function wireframeDataUrl(target, slot) {
  const svg = buildWireframeSvg(target, slot);
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

async function uploadWireframeMockup(target, slot) {
  const svg = buildWireframeSvg(target, slot);
  const buffer = Buffer.from(svg, "utf-8");
  try {
    return await uploadBufferToR2(buffer, {
      fileName: "mockup.svg",
      contentType: "image/svg+xml",
      prefix: "design-mockups",
    });
  } catch (err) {
    console.error("[design-mockup] r2 wireframe failed, using data url:", err.message);
    return wireframeDataUrl(target, slot);
  }
}

export async function generateDesignMockupImage({ target, slot, studentText }) {
  try {
    const geminiUrl = await callGeminiDesignImage(target, studentText);
    if (geminiUrl) {
      return { mockupImageUrl: geminiUrl, mockupEngine: "gemini" };
    }

    const wireframeUrl = await uploadWireframeMockup(target, slot);
    return {
      mockupImageUrl: wireframeUrl,
      mockupEngine: wireframeUrl.startsWith("data:") ? "wireframe-inline" : "wireframe",
    };
  } catch (err) {
    console.error("[design-mockup] generate failed:", err.message);
    return {
      mockupImageUrl: wireframeDataUrl(target, slot),
      mockupEngine: "wireframe-inline",
    };
  }
}
