export const OUTPUT_TYPES = [
  { id: "image", en: "Image Prompt", zh: "圖片提示詞" },
  { id: "video", en: "Video Prompt", zh: "影片提示詞" },
  { id: "cinematic", en: "Cinematic Prompt", zh: "電影感提示詞" },
  { id: "character", en: "Character Consistency Prompt", zh: "角色一致性提示詞" },
];

export const STYLES = [
  { id: "Realistic", en: "Realistic", zh: "寫實" },
  { id: "Anime", en: "Anime", zh: "動漫" },
  { id: "Cinematic", en: "Cinematic", zh: "電影感" },
  { id: "Horror", en: "Horror", zh: "恐怖" },
  { id: "Fantasy", en: "Fantasy", zh: "奇幻" },
  { id: "Cyberpunk", en: "Cyberpunk", zh: "賽博龐克" },
  { id: "Fitness", en: "Fitness", zh: "健身" },
  { id: "Luxury", en: "Luxury", zh: "奢華" },
];

export const USAGE_TIPS = `1. Copy the enhanced prompt / 複製完整提示詞
2. Open your AI image or video tool / 打開 AI 圖片或影片工具
3. Paste the prompt / 貼上提示詞
4. Generate your image or video / 生成圖片或影片`;

const STYLE_PROFILES = {
  Realistic: {
    look: "photorealistic, ultra-detailed, natural skin texture, lifelike proportions",
    lighting: "soft natural lighting, realistic shadows, subtle film grain",
    lens: "85mm portrait lens, shallow depth of field, crisp focus",
    mood: "authentic, grounded, documentary realism",
  },
  Anime: {
    look: "anime illustration, clean linework, expressive eyes, vibrant cel shading",
    lighting: "bright anime lighting, soft bloom, saturated colors",
    lens: "dynamic composition, hero framing, stylized perspective",
    mood: "energetic, polished, studio-quality anime art",
  },
  Cinematic: {
    look: "cinematic still frame, blockbuster production design, rich color grading",
    lighting: "dramatic rim light, volumetric haze, anamorphic highlights",
    lens: "35mm anamorphic lens, widescreen composition, depth layers",
    mood: "epic, emotional, movie-trailer intensity",
  },
  Horror: {
    look: "dark atmospheric horror, unsettling detail, eerie textures",
    lighting: "low-key lighting, cold tones, flickering shadows",
    lens: "wide-angle distortion, claustrophobic framing",
    mood: "tense, ominous, psychological dread",
  },
  Fantasy: {
    look: "high fantasy concept art, ornate details, magical atmosphere",
    lighting: "ethereal glow, enchanted particles, golden hour magic",
    lens: "epic wide composition, heroic scale, painterly depth",
    mood: "mythic, awe-inspiring, legendary adventure",
  },
  Cyberpunk: {
    look: "cyberpunk neon aesthetic, futuristic techwear, rain-slick surfaces",
    lighting: "neon reflections, magenta and cyan glow, night city ambience",
    lens: "wide urban framing, holographic accents, chrome highlights",
    mood: "edgy, futuristic, blade-runner atmosphere",
  },
  Fitness: {
    look: "athletic physique, defined muscle detail, sweat and skin realism",
    lighting: "gym spotlight, high contrast, motivational energy",
    lens: "dynamic action framing, motion-ready composition",
    mood: "powerful, disciplined, transformation energy",
  },
  Luxury: {
    look: "luxury editorial photography, premium fabrics, refined elegance",
    lighting: "soft golden hour, boutique lighting, glossy highlights",
    lens: "fashion editorial framing, polished composition",
    mood: "exclusive, aspirational, high-end lifestyle",
  },
};

const TYPE_PROFILES = {
  image: {
    prefix: "Masterpiece AI image prompt",
    motion: "single frozen moment, perfect composition, highly detailed still image",
    extras: "sharp focus, professional color grading, award-winning photography",
    tips: "Use with Midjourney, Stable Diffusion, or DALL·E. Start at --ar 16:9 or 3:4 depending on subject. Increase detail weight if faces look soft.",
  },
  video: {
    prefix: "High-quality AI video prompt",
    motion: "smooth natural motion, stable subject tracking, realistic temporal consistency",
    extras: "24fps cinematic motion, fluid camera movement, no jitter, clean transitions",
    tips: "Use with Runway, Kling, Pika, or Sora. Keep clips 4–8 seconds. Add camera direction for stronger results. Regenerate if motion warps.",
  },
  cinematic: {
    prefix: "Cinematic AI shot prompt",
    motion: "slow dramatic camera move, layered foreground and background, filmic pacing",
    extras: "anamorphic lens flare, teal-orange grade, blockbuster composition, IMAX scale",
    tips: "Best for trailer-style shots. Pair with a specific lens (35mm/50mm) and one clear camera move like dolly-in or orbit.",
  },
  character: {
    prefix: "Character consistency prompt",
    motion: "same character identity across frames, consistent face, hair, outfit, and body type",
    extras: "consistent seed-friendly description, repeatable facial features, stable wardrobe details",
    tips: "Lock face, hair, outfit, and age in every prompt. Reuse the Short Version as your character anchor across scenes.",
  },
};

const BASE_NEGATIVES = [
  "blurry",
  "low quality",
  "deformed",
  "bad anatomy",
  "extra limbs",
  "watermark",
  "text",
  "logo",
  "oversaturated",
  "jpeg artifacts",
];

const STYLE_NEGATIVES = {
  Realistic: ["cartoon", "anime", "plastic skin", "uncanny face"],
  Anime: ["photorealistic", "3D render", "western comic"],
  Cinematic: ["flat lighting", "amateur snapshot", "cluttered frame"],
  Horror: ["bright cheerful mood", "comedy tone"],
  Fantasy: ["modern city", "sci-fi chrome"],
  Cyberpunk: ["medieval", "pastoral", "daylight picnic"],
  Fitness: ["obese", "weak posture", "sloppy form"],
  Luxury: ["gritty poverty", "cheap materials", "messy background"],
};

function cleanIdea(idea) {
  return String(idea || "")
    .trim()
    .replace(/\s+/g, " ");
}

function translateIdeaHint(idea) {
  const hints = [
    ["白人", "Caucasian"],
    ["瘦", "slim"],
    ["胖子", "overweight"],
    ["鏡子", "mirror"],
    ["電影感", "cinematic feel"],
    ["逼真", "hyper-realistic"],
    ["動態", "dynamic motion"],
    ["女孩", "young woman"],
    ["男孩", "young man"],
    ["機器人", "robot"],
    ["戰士", "warrior"],
    ["城市", "city street"],
    ["健身房", "gym"],
    ["霓虹", "neon-lit"],
    ["機械", "mechanical"],
    ["情感", "emotional expression"],
    ["特寫", "close-up"],
    ["變身", "transformation"],
    ["走路", "walking"],
  ];
  let result = idea;
  hints.forEach(([zh, en]) => {
    if (result.includes(zh) && !result.toLowerCase().includes(en.toLowerCase())) {
      result = `${result} (${en})`;
    }
  });
  return result;
}

export function enhancePrompt(idea, outputType = "image", style = "Realistic") {
  const cleaned = cleanIdea(idea);
  const subject = cleaned || "a compelling subject in a visually striking scene";
  const enriched = translateIdeaHint(subject);
  const styleProfile = STYLE_PROFILES[style] || STYLE_PROFILES.Realistic;
  const typeProfile = TYPE_PROFILES[outputType] || TYPE_PROFILES.image;

  const enhanced = [
    `${typeProfile.prefix}: ${enriched}.`,
    `${styleProfile.look}.`,
    `${styleProfile.lighting}.`,
    `${styleProfile.lens}.`,
    `${typeProfile.motion}.`,
    `${styleProfile.mood}.`,
    typeProfile.extras + ".",
  ].join(" ");

  const short = `${enriched}, ${style.toLowerCase()} style, ${styleProfile.look.split(",")[0]}, ${typeProfile.motion.split(",")[0]}`;

  const negative = [...BASE_NEGATIVES, ...(STYLE_NEGATIVES[style] || [])].join(", ");

  return { enhanced, short, negative, tips: USAGE_TIPS };
}

export const PROMPT_EXAMPLES = [
  {
    id: "mirror",
    title: "Skinny guy mirror transformation",
    before: "一個白人瘦子對著鏡子，逼真動態，有電影感",
    outputType: "video",
    style: "Cinematic",
  },
  {
    id: "luxury",
    title: "Luxury woman walking in city",
    before: "時尚女人在紐約街頭走路，高級感，夕陽",
    outputType: "image",
    style: "Luxury",
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk girl in neon street",
    before: "賽博朋克女孩站在霓虹雨夜街道，藍紫光",
    outputType: "cinematic",
    style: "Cyberpunk",
  },
  {
    id: "gym",
    title: "Realistic gym transformation",
    before: "健身房裡肌肉線條明顯的男人訓練，汗水，特寫",
    outputType: "video",
    style: "Fitness",
  },
  {
    id: "warrior",
    title: "Fantasy warrior portrait",
    before: " fantasy 女戰士肖像，盔甲，魔法光",
    outputType: "image",
    style: "Fantasy",
  },
  {
    id: "robot",
    title: "AI robot emotional close-up",
    before: "機器人臉部特寫，有情感，逼真，微距",
    outputType: "character",
    style: "Realistic",
  },
];

export function getExampleResult(example) {
  return enhancePrompt(example.before, example.outputType, example.style);
}
