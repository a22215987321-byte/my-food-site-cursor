export const QUICK_EXAMPLES = [
  "深夜學校走廊，有一隻恐怖泰迪熊慢慢看向鏡頭",
  "一個女生站在雨夜霓虹街道，電影感，孤獨",
  "黑色香水瓶產品廣告，奢華，高級光影",
  "A robot chef cooking in a futuristic kitchen",
  "A fantasy castle floating above the clouds",
];

export const BEST_FOR_OPTIONS = [
  "AI Video",
  "AI Image",
  "Character Design",
  "Product Visual",
  "Short Video",
];

export const USE_IN_OPTIONS = [
  "Runway",
  "Sora",
  "Veo",
  "Midjourney",
  "Pika",
  "Leonardo",
  "Ideogram",
];

export const IMPROVED_ITEMS = [
  "scene",
  "lighting",
  "camera",
  "action",
  "mood",
  "aiReady",
];

const THEME_KEYWORDS = [
  { id: "horror", re: /恐怖|泰迪|horror|scary|creepy|abandoned|midnight|走廊|hallway|teddy/i },
  { id: "cyberpunk", re: /霓虹|雨夜|neon|cyberpunk|賽博|孤獨|lonely|street/i },
  { id: "luxury", re: /香水|產品|product|perfume|luxury|奢華|廣告|commercial|bottle/i },
  { id: "fantasy", re: /fantasy|城堡|castle|cloud|魔法|warrior|奇幻/i },
  { id: "scifi", re: /robot|機器人|futuristic|kitchen|sci-fi|chef|未來/i },
  { id: "portrait", re: /女生|女人|woman|girl|portrait|人物|character/i },
  { id: "fitness", re: /gym|健身|muscle|training|運動/i },
];

const THEME_SCENES = {
  horror: {
    scene: "an abandoned school hallway at midnight",
    subject: "an old torn teddy bear stands silently at the far end of the corridor, its eyes glowing red",
    action: "The camera slowly pushes forward as the teddy bear gradually turns its head toward the viewer",
    lighting: "Flickering fluorescent lights illuminate the empty corridor, low-key lighting, cold blue tones, red highlights",
    mood: "Eerie atmosphere, psychological horror",
    motion: "realistic motion, stable subject tracking, no jitter",
    bestFor: ["AI Video", "Short Video", "Character Design"],
    useIn: ["Runway", "Sora", "Veo", "Pika"],
  },
  cyberpunk: {
    scene: "a rain-soaked neon city street at night",
    subject: "a young woman stands alone under glowing magenta and cyan signs, wet pavement reflecting the lights",
    action: "The camera slowly orbits around her as rain falls and neon reflections ripple across the ground",
    lighting: "Cinematic neon lighting, moody rim light, deep shadows, reflective wet surfaces",
    mood: "Lonely, cinematic, blade-runner atmosphere",
    motion: "smooth cinematic motion, stable subject tracking",
    bestFor: ["AI Video", "AI Image", "Character Design", "Short Video"],
    useIn: ["Runway", "Sora", "Veo", "Midjourney", "Pika"],
  },
  luxury: {
    scene: "a premium studio product set with dark velvet backdrop",
    subject: "a sleek black perfume bottle as the hero product, glass catching refined highlights",
    action: "The camera performs a slow elegant arc around the bottle as light sweeps across the label",
    lighting: "Luxury commercial lighting, soft golden accents, high-end glossy reflections, controlled shadows",
    mood: "Exclusive, aspirational, premium brand aesthetic",
    motion: "polished commercial motion, crisp product focus",
    bestFor: ["AI Image", "Product Visual", "Short Video"],
    useIn: ["Midjourney", "Leonardo", "Ideogram", "Runway"],
  },
  fantasy: {
    scene: "a vast sky above the clouds at golden hour",
    subject: "a majestic fantasy castle floating weightlessly among drifting cloud formations",
    action: "The camera glides upward and circles the castle as magical light pulses from its towers",
    lighting: "Epic golden sunlight, ethereal glow, enchanted particles in the air",
    mood: "Mythic, awe-inspiring, high fantasy wonder",
    motion: "grand cinematic camera movement, stable composition",
    bestFor: ["AI Image", "AI Video", "Character Design"],
    useIn: ["Midjourney", "Leonardo", "Sora", "Veo", "Ideogram"],
  },
  scifi: {
    scene: "a futuristic kitchen with chrome surfaces and holographic interfaces",
    subject: "a robot chef with articulated metal hands preparing food with precise mechanical grace",
    action: "The camera tracks close as the robot chops, seasons, and plates a dish with fluid robotic motion",
    lighting: "Clean sci-fi lighting, cool white panels, subtle blue accent glow",
    mood: "Futuristic, inventive, polished tech aesthetic",
    motion: "smooth action tracking, realistic mechanical movement",
    bestFor: ["AI Video", "AI Image", "Short Video"],
    useIn: ["Runway", "Sora", "Pika", "Midjourney"],
  },
  portrait: {
    scene: "a cinematic urban environment with layered depth",
    subject: "a compelling character positioned as the clear focal point",
    action: "The camera slowly moves in with a shallow-depth portrait framing",
    lighting: "Soft cinematic lighting, natural skin tones, gentle background bokeh",
    mood: "Emotional, polished, story-driven",
    motion: "stable portrait framing, subtle camera drift",
    bestFor: ["AI Image", "Character Design", "Short Video"],
    useIn: ["Midjourney", "Leonardo", "Runway", "Ideogram"],
  },
  fitness: {
    scene: "a modern gym with dramatic spotlighting",
    subject: "an athletic subject mid-training with visible muscle definition and focused intensity",
    action: "The camera tracks dynamic movement as the subject completes a powerful training sequence",
    lighting: "High-contrast gym lighting, sweat highlights, motivational energy",
    mood: "Powerful, disciplined, transformation energy",
    motion: "dynamic action motion, energetic pacing",
    bestFor: ["AI Video", "Short Video", "AI Image"],
    useIn: ["Runway", "Pika", "Sora", "Midjourney"],
  },
  general: {
    scene: "a visually rich environment designed for AI generation",
    subject: "a clearly defined subject placed at the center of the composition",
    action: "The camera moves with intentional cinematic pacing to reveal the scene",
    lighting: "Professional cinematic lighting with depth, contrast, and color direction",
    mood: "Polished, immersive, visually compelling",
    motion: "smooth motion, stable subject tracking, no jitter",
    bestFor: ["AI Image", "AI Video"],
    useIn: ["Midjourney", "Runway", "Leonardo", "Sora"],
  },
};

const VARIANT_MODIFIERS = {
  normal: { prefix: "Create a cinematic", quality: "high detail, professional composition, AI-ready prompt" },
  shorter: { prefix: "Create a", quality: "clean composition, AI-ready" },
  cinematic: {
    prefix: "Create an epic cinematic",
    quality: "anamorphic lens flare, widescreen composition, blockbuster color grading, IMAX scale, film-trailer intensity",
  },
  realistic: {
    prefix: "Create a photorealistic",
    quality: "ultra-detailed, natural textures, lifelike proportions, documentary realism, 8K clarity",
  },
  detailed: {
    prefix: "Create a richly detailed cinematic",
    quality: "hyper-detailed environment, layered foreground and background, texture-rich surfaces, premium visual fidelity, masterful composition",
  },
};

function cleanIdea(idea) {
  return String(idea || "").trim().replace(/\s+/g, " ");
}

function detectTheme(idea) {
  for (const entry of THEME_KEYWORDS) {
    if (entry.re.test(idea)) return entry.id;
  }
  return "general";
}

function inferBestFor(theme, idea) {
  const profile = THEME_SCENES[theme] || THEME_SCENES.general;
  const tags = [...profile.bestFor];
  if (/video|影片|motion|動態|鏡頭|camera|slowly|track/i.test(idea) && !tags.includes("AI Video")) {
    tags.unshift("AI Video");
  }
  if (/product|產品|香水|bottle|commercial|廣告/i.test(idea) && !tags.includes("Product Visual")) {
    tags.unshift("Product Visual");
  }
  return [...new Set(tags)].slice(0, 4);
}

function inferUseIn(theme, bestFor) {
  const profile = THEME_SCENES[theme] || THEME_SCENES.general;
  let tools = [...profile.useIn];
  if (bestFor.includes("Product Visual")) {
    tools = ["Midjourney", "Leonardo", "Ideogram", ...tools];
  }
  if (bestFor.includes("AI Video") || bestFor.includes("Short Video")) {
    tools = ["Runway", "Sora", "Veo", "Pika", ...tools];
  }
  return [...new Set(tools)].slice(0, 6);
}

function buildSentences(profile, variantKey) {
  const mod = VARIANT_MODIFIERS[variantKey] || VARIANT_MODIFIERS.normal;
  const parts = [
    `${mod.prefix} scene set in ${profile.scene}.`,
    `${profile.lighting}.`,
    `${profile.subject}.`,
    `${profile.action}.`,
    `${profile.mood}.`,
    `${profile.motion}.`,
    mod.quality + ".",
  ];
  if (variantKey === "shorter") {
    return [
      `${mod.prefix} scene in ${profile.scene}.`,
      `${profile.subject}.`,
      `${profile.action}.`,
      `${profile.mood}, ${mod.quality}.`,
    ].join(" ");
  }
  return parts.join(" ");
}

function customizeFromInput(idea, profile, theme) {
  const copy = { ...profile };
  if (theme === "horror" && /學校|school|hallway|走廊/i.test(idea)) {
    copy.scene = "an abandoned school hallway at midnight";
  }
  if (theme === "horror" && /泰迪|teddy/i.test(idea)) {
    copy.subject =
      "an old torn teddy bear stands silently at the far end of the hallway, its eyes glowing red";
    copy.action =
      "The camera slowly pushes forward as the teddy bear gradually turns its head toward the viewer";
  }
  if (theme === "cyberpunk" && /女生|woman|girl/i.test(idea)) {
    copy.subject =
      "a young woman stands alone under glowing neon signs, rain falling around her";
  }
  if (theme === "luxury" && /香水|perfume|bottle|香水瓶/i.test(idea)) {
    copy.subject =
      "a sleek black perfume bottle as the hero product, glass catching refined luxury highlights";
  }
  if (theme === "fantasy" && /castle|城堡/i.test(idea)) {
    copy.subject = "a majestic fantasy castle floating weightlessly above the clouds";
  }
  if (theme === "scifi" && /robot|chef|機器人/i.test(idea)) {
    copy.subject =
      "a robot chef with articulated metal hands preparing food with precise mechanical grace";
  }
  return copy;
}

export function enhancePrompt(idea, options = {}) {
  const cleaned = cleanIdea(idea);
  const variant = options.variant || "normal";
  const theme = detectTheme(cleaned);
  const baseProfile = THEME_SCENES[theme] || THEME_SCENES.general;
  const profile = customizeFromInput(cleaned, baseProfile, theme);
  const enhanced = buildSentences(profile, variant);
  const bestFor = inferBestFor(theme, cleaned);
  const useIn = inferUseIn(theme, bestFor);

  return {
    enhanced,
    bestFor,
    useIn,
    improved: IMPROVED_ITEMS,
    theme,
    variant,
  };
}

export function refinePrompt(idea, variant) {
  return enhancePrompt(idea, { variant });
}
