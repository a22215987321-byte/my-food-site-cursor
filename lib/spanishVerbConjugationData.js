export const PERSONS = [
  { key: "yo", label: "yo", zh: "我", region: "通用" },
  { key: "tu", label: "tú", zh: "你", region: "通用 / 非正式" },
  { key: "el", label: "él / ella / usted", zh: "他 / 她 / 您", region: "通用 / 正式" },
  { key: "nosotros", label: "nosotros / nosotras", zh: "我們", region: "通用" },
  { key: "vosotros", label: "vosotros / vosotras", zh: "你們", region: "西班牙常用" },
  { key: "ellos", label: "ellos / ellas / ustedes", zh: "他們 / 她們 / 你們", region: "通用；拉丁美洲常用 ustedes" },
];

export const TENSES = [
  { key: "presente", zh: "現在時", es: "Presente", hint: "描述現在、習慣或一般事實。" },
  { key: "preterito", zh: "簡單過去時", es: "Pretérito indefinido", hint: "描述已完成的過去動作。" },
  { key: "imperfecto", zh: "未完成過去時", es: "Pretérito imperfecto", hint: "描述過去習慣、背景或持續狀態。" },
  { key: "perfecto", zh: "現在完成時", es: "Pretérito perfecto", hint: "haber + 過去分詞，常表示到現在仍相關的經驗。" },
  { key: "futuro", zh: "將來時", es: "Futuro simple", hint: "描述未來會發生的事。" },
  { key: "condicional", zh: "條件式", es: "Condicional", hint: "表示會、想要、禮貌請求或假設。" },
  { key: "subjuntivo", zh: "現在虛擬式", es: "Presente de subjuntivo", hint: "常用於願望、情緒、懷疑與建議。" },
  { key: "imperativo", zh: "命令式", es: "Imperativo", hint: "用來提出命令、請求或建議；yo 通常無命令式。" },
];

export const VERB_TYPES = [
  "最常用動詞",
  "不規則動詞",
  "規則 -ar 動詞",
  "規則 -er 動詞",
  "規則 -ir 動詞",
  "反身動詞",
  "移動類動詞",
  "日常生活動詞",
  "工作與學習動詞",
  "情緒與想法動詞",
];

export const verbMetadata = {
  ser: {
    infinitive: "ser",
    zh: "是；本質上是",
    en: "to be",
    regularity: "不規則動詞",
    auxiliary: "haber",
    participle: "sido",
    gerund: "siendo",
    frequency: 5,
    cefr: "A1",
    ending: "完全不規則",
    categories: ["最常用動詞", "不規則動詞", "日常生活動詞"],
  },
  estar: {
    infinitive: "estar",
    zh: "在；處於某狀態",
    en: "to be; to be located",
    regularity: "不規則動詞",
    auxiliary: "haber",
    participle: "estado",
    gerund: "estando",
    frequency: 5,
    cefr: "A1",
    ending: "-ar",
    categories: ["最常用動詞", "不規則動詞", "日常生活動詞", "情緒與想法動詞"],
  },
  tener: {
    infinitive: "tener",
    zh: "有；擁有",
    en: "to have",
    regularity: "不規則動詞",
    auxiliary: "haber",
    participle: "tenido",
    gerund: "teniendo",
    frequency: 5,
    cefr: "A1",
    ending: "-er",
    categories: ["最常用動詞", "不規則動詞", "日常生活動詞"],
  },
  hablar: {
    infinitive: "hablar",
    zh: "說話；談論",
    en: "to speak; to talk",
    regularity: "規則動詞",
    auxiliary: "haber",
    participle: "hablado",
    gerund: "hablando",
    frequency: 4,
    cefr: "A1",
    ending: "-ar",
    categories: ["規則 -ar 動詞", "日常生活動詞", "工作與學習動詞"],
  },
  comer: {
    infinitive: "comer",
    zh: "吃",
    en: "to eat",
    regularity: "規則動詞",
    auxiliary: "haber",
    participle: "comido",
    gerund: "comiendo",
    frequency: 4,
    cefr: "A1",
    ending: "-er",
    categories: ["規則 -er 動詞", "日常生活動詞"],
  },
  vivir: {
    infinitive: "vivir",
    zh: "住；生活",
    en: "to live",
    regularity: "規則動詞",
    auxiliary: "haber",
    participle: "vivido",
    gerund: "viviendo",
    frequency: 4,
    cefr: "A1",
    ending: "-ir",
    categories: ["規則 -ir 動詞", "日常生活動詞"],
  },
  ir: {
    infinitive: "ir",
    zh: "去",
    en: "to go",
    regularity: "不規則動詞",
    auxiliary: "haber",
    participle: "ido",
    gerund: "yendo",
    frequency: 5,
    cefr: "A1",
    ending: "完全不規則",
    categories: ["最常用動詞", "不規則動詞", "移動類動詞"],
  },
  hacer: {
    infinitive: "hacer",
    zh: "做；製作",
    en: "to do; to make",
    regularity: "不規則動詞",
    auxiliary: "haber",
    participle: "hecho",
    gerund: "haciendo",
    frequency: 5,
    cefr: "A1",
    ending: "-er",
    categories: ["最常用動詞", "不規則動詞", "工作與學習動詞", "日常生活動詞"],
  },
  levantarse: {
    infinitive: "levantarse",
    zh: "起床",
    en: "to get up",
    regularity: "規則動詞",
    auxiliary: "haber",
    participle: "levantado",
    gerund: "levantándose",
    frequency: 3,
    cefr: "A1",
    ending: "-ar",
    categories: ["反身動詞", "日常生活動詞", "規則 -ar 動詞"],
  },
  pensar: {
    infinitive: "pensar",
    zh: "想；認為",
    en: "to think",
    regularity: "詞幹變化動詞",
    auxiliary: "haber",
    participle: "pensado",
    gerund: "pensando",
    frequency: 4,
    cefr: "A2",
    ending: "-ar",
    categories: ["情緒與想法動詞", "不規則動詞"],
  },
};

const HABER = {
  presente: ["he", "has", "ha", "hemos", "habéis", "han"],
  subjuntivo: ["haya", "hayas", "haya", "hayamos", "hayáis", "hayan"],
};

function regularConjugations(infinitive, participle, ending) {
  const stem = infinitive.slice(0, -2);
  const isAr = ending === "-ar";
  const isEr = ending === "-er";
  return {
    presente: isAr
      ? [`${stem}o`, `${stem}as`, `${stem}a`, `${stem}amos`, `${stem}áis`, `${stem}an`]
      : [`${stem}o`, `${stem}${isEr ? "es" : "es"}`, `${stem}${isEr ? "e" : "e"}`, `${stem}${isEr ? "emos" : "imos"}`, `${stem}${isEr ? "éis" : "ís"}`, `${stem}${isEr ? "en" : "en"}`],
    preterito: isAr
      ? [`${stem}é`, `${stem}aste`, `${stem}ó`, `${stem}amos`, `${stem}asteis`, `${stem}aron`]
      : [`${stem}í`, `${stem}iste`, `${stem}ió`, `${stem}${isEr ? "imos" : "imos"}`, `${stem}isteis`, `${stem}ieron`],
    imperfecto: isAr
      ? [`${stem}aba`, `${stem}abas`, `${stem}aba`, `${stem}ábamos`, `${stem}abais`, `${stem}aban`]
      : [`${stem}ía`, `${stem}ías`, `${stem}ía`, `${stem}íamos`, `${stem}íais`, `${stem}ían`],
    perfecto: HABER.presente.map((aux) => `${aux} ${participle}`),
    futuro: ["é", "ás", "á", "emos", "éis", "án"].map((suffix) => `${infinitive}${suffix}`),
    condicional: ["ía", "ías", "ía", "íamos", "íais", "ían"].map((suffix) => `${infinitive}${suffix}`),
    subjuntivo: isAr
      ? [`${stem}e`, `${stem}es`, `${stem}e`, `${stem}emos`, `${stem}éis`, `${stem}en`]
      : [`${stem}a`, `${stem}as`, `${stem}a`, `${stem}amos`, `${stem}áis`, `${stem}an`],
    imperativo: isAr
      ? ["-", `${stem}a`, `${stem}e`, `${stem}emos`, `${stem}ad`, `${stem}en`]
      : ["-", `${stem}${isEr ? "e" : "e"}`, `${stem}a`, `${stem}amos`, `${stem}${isEr ? "ed" : "id"}`, `${stem}an`],
  };
}

export const conjugationTables = {
  ser: {
    presente: ["soy", "eres", "es", "somos", "sois", "son"],
    preterito: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
    imperfecto: ["era", "eras", "era", "éramos", "erais", "eran"],
    perfecto: HABER.presente.map((aux) => `${aux} sido`),
    futuro: ["seré", "serás", "será", "seremos", "seréis", "serán"],
    condicional: ["sería", "serías", "sería", "seríamos", "seríais", "serían"],
    subjuntivo: ["sea", "seas", "sea", "seamos", "seáis", "sean"],
    imperativo: ["-", "sé", "sea", "seamos", "sed", "sean"],
  },
  estar: {
    presente: ["estoy", "estás", "está", "estamos", "estáis", "están"],
    preterito: ["estuve", "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron"],
    imperfecto: ["estaba", "estabas", "estaba", "estábamos", "estabais", "estaban"],
    perfecto: HABER.presente.map((aux) => `${aux} estado`),
    futuro: ["estaré", "estarás", "estará", "estaremos", "estaréis", "estarán"],
    condicional: ["estaría", "estarías", "estaría", "estaríamos", "estaríais", "estarían"],
    subjuntivo: ["esté", "estés", "esté", "estemos", "estéis", "estén"],
    imperativo: ["-", "está", "esté", "estemos", "estad", "estén"],
  },
  tener: {
    presente: ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"],
    preterito: ["tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"],
    imperfecto: ["tenía", "tenías", "tenía", "teníamos", "teníais", "tenían"],
    perfecto: HABER.presente.map((aux) => `${aux} tenido`),
    futuro: ["tendré", "tendrás", "tendrá", "tendremos", "tendréis", "tendrán"],
    condicional: ["tendría", "tendrías", "tendría", "tendríamos", "tendríais", "tendrían"],
    subjuntivo: ["tenga", "tengas", "tenga", "tengamos", "tengáis", "tengan"],
    imperativo: ["-", "ten", "tenga", "tengamos", "tened", "tengan"],
  },
  hablar: regularConjugations("hablar", "hablado", "-ar"),
  comer: regularConjugations("comer", "comido", "-er"),
  vivir: regularConjugations("vivir", "vivido", "-ir"),
  ir: {
    presente: ["voy", "vas", "va", "vamos", "vais", "van"],
    preterito: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
    imperfecto: ["iba", "ibas", "iba", "íbamos", "ibais", "iban"],
    perfecto: HABER.presente.map((aux) => `${aux} ido`),
    futuro: ["iré", "irás", "irá", "iremos", "iréis", "irán"],
    condicional: ["iría", "irías", "iría", "iríamos", "iríais", "irían"],
    subjuntivo: ["vaya", "vayas", "vaya", "vayamos", "vayáis", "vayan"],
    imperativo: ["-", "ve", "vaya", "vayamos", "id", "vayan"],
  },
  hacer: {
    presente: ["hago", "haces", "hace", "hacemos", "hacéis", "hacen"],
    preterito: ["hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"],
    imperfecto: ["hacía", "hacías", "hacía", "hacíamos", "hacíais", "hacían"],
    perfecto: HABER.presente.map((aux) => `${aux} hecho`),
    futuro: ["haré", "harás", "hará", "haremos", "haréis", "harán"],
    condicional: ["haría", "harías", "haría", "haríamos", "haríais", "harían"],
    subjuntivo: ["haga", "hagas", "haga", "hagamos", "hagáis", "hagan"],
    imperativo: ["-", "haz", "haga", "hagamos", "haced", "hagan"],
  },
  levantarse: regularConjugations("levantar", "levantado", "-ar"),
  pensar: {
    ...regularConjugations("pensar", "pensado", "-ar"),
    presente: ["pienso", "piensas", "piensa", "pensamos", "pensáis", "piensan"],
    subjuntivo: ["piense", "pienses", "piense", "pensemos", "penséis", "piensen"],
    imperativo: ["-", "piensa", "piense", "pensemos", "pensad", "piensen"],
  },
};

const subjectExamples = {
  yo: { es: "Yo", zh: "我" },
  tu: { es: "Tú", zh: "你" },
  el: { es: "Ella", zh: "她" },
  nosotros: { es: "Nosotros", zh: "我們" },
  vosotros: { es: "Vosotros", zh: "你們（西班牙）" },
  ellos: { es: "Ustedes", zh: "你們（拉丁美洲）" },
};

const complements = {
  ser: { es: "estudiante de español", zh: "是西班牙語學生" },
  estar: { es: "en casa", zh: "在家" },
  tener: { es: "tiempo hoy", zh: "今天有時間" },
  hablar: { es: "español en clase", zh: "在課堂上說西班牙語" },
  comer: { es: "pan con café", zh: "吃麵包配咖啡" },
  vivir: { es: "en Madrid", zh: "住在馬德里" },
  ir: { es: "a la escuela", zh: "去學校" },
  hacer: { es: "la tarea", zh: "做作業" },
  levantarse: { es: "temprano", zh: "早起" },
  pensar: { es: "en la respuesta", zh: "思考答案" },
};

export function getExample(verbKey, tenseKey, personKey, form) {
  if (form === "-") {
    return {
      es: "No se usa normalmente con yo.",
      zh: "yo 通常沒有命令式。",
    };
  }
  const subject = subjectExamples[personKey];
  const complement = complements[verbKey] || complements.hablar;
  const intro = tenseKey === "subjuntivo" ? "Espero que " : "";
  const subjectEs = tenseKey === "subjuntivo" ? subject.es.toLowerCase() : subject.es;
  return {
    es: `${intro}${subjectEs} ${form} ${complement.es}.`,
    zh: `${tenseKey === "subjuntivo" ? "我希望" : ""}${subject.zh}${complement.zh}。`,
  };
}

export function getVerbList() {
  return Object.values(verbMetadata);
}

export function normalizeVerb(value) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function findVerb(input) {
  const normalized = normalizeVerb(input);
  return Object.keys(verbMetadata).find((key) => normalizeVerb(key) === normalized);
}

export function suggestVerbs(input) {
  const normalized = normalizeVerb(input);
  const verbs = Object.keys(verbMetadata);
  if (!normalized) return verbs.slice(0, 6);
  return verbs
    .map((verb) => ({
      verb,
      score: [...normalizeVerb(verb)].filter((char) => normalized.includes(char)).length,
    }))
    .sort((a, b) => b.score - a.score || a.verb.localeCompare(b.verb))
    .slice(0, 5)
    .map((item) => item.verb);
}

export const teachingExamples = {
  regular: ["hablar", "comer", "vivir"],
  irregular: ["ser", "estar", "tener", "ir", "hacer"],
};
