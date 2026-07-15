export const A1_EXAM_SECTIONS = [
  { key: "reading", label: "閱讀理解", es: "Comprensión de lectura", duration: "45 分鐘", description: "4 個任務 · 10 題" },
  { key: "listening", label: "聽力理解", es: "Comprensión auditiva", duration: "約 25 分鐘", description: "4 個任務 · 8 題" },
  { key: "writing", label: "書面表達", es: "Expresión e interacción escritas", duration: "25 分鐘", description: "2 個寫作任務" },
  { key: "speaking", label: "口語表達", es: "Expresión e interacción orales", duration: "20 分鐘", description: "10 分鐘準備 + 10 分鐘考試" },
];

const choice = (id, section, task, prompt, options, answer, explanation, extra = {}) => ({
  id, section, task, type: "choice", prompt, options, answer, explanation, ...extra,
});

export const A1_EXAM_QUESTIONS = [
  choice("r1", "reading", "Tarea 1 · 閱讀公告", "¿Cuándo abre la biblioteca?", ["Todos los días hasta las 18:00", "De lunes a viernes de 9:00 a 18:00", "Solo los sábados por la mañana"], "De lunes a viernes de 9:00 a 18:00", "公告直接寫明週一至週五 9:00 到 18:00。", { passage: "La biblioteca abre de lunes a viernes de 9:00 a 18:00. Los sábados cierra a las 14:00." }),
  choice("r2", "reading", "Tarea 1 · 閱讀公告", "¿Qué pasa hoy?", ["La clase empieza más tarde", "No hay clase", "La profesora llega a las 9:00"], "No hay clase", "No hay clase 表示今天沒有課。", { passage: "Hoy no hay clase de español. La profesora está enferma." }),
  choice("r3", "reading", "Tarea 2 · 短訊息", "¿Dónde está Luis?", ["En casa", "En el supermercado", "En la escuela"], "En el supermercado", "Luis 說 Estoy en el supermercado。", { passage: "Hola Marta: Estoy en el supermercado. Compro pan, leche y manzanas. Después voy a casa. Nos vemos a las siete. Luis" }),
  choice("r4", "reading", "Tarea 2 · 短訊息", "¿Qué compra Luis?", ["Pan, leche y manzanas", "Café, té y arroz", "Carne, pescado y agua"], "Pan, leche y manzanas", "訊息中的購物品項是麵包、牛奶和蘋果。", { passage: "Hola Marta: Estoy en el supermercado. Compro pan, leche y manzanas. Después voy a casa. Nos vemos a las siete. Luis" }),
  choice("r5", "reading", "Tarea 2 · 短訊息", "¿A qué hora ve a Marta?", ["A las seis", "A las siete", "A las ocho"], "A las siete", "Nos vemos a las siete 表示七點見。", { passage: "Hola Marta: Estoy en el supermercado. Compro pan, leche y manzanas. Después voy a casa. Nos vemos a las siete. Luis" }),
  choice("r6", "reading", "Tarea 3 · 人物與地點配對", "Ana quiere tomar un café y comer algo dulce. ¿Adónde va?", ["Oficina de correos", "Cafetería", "Tienda de ropa"], "Cafetería", "咖啡與甜點可在 cafetería 購買。"),
  choice("r7", "reading", "Tarea 3 · 人物與地點配對", "Pedro necesita comprar una camisa blanca. ¿Adónde va?", ["Oficina de correos", "Cafetería", "Tienda de ropa"], "Tienda de ropa", "camisa 是襯衫，應去服飾店。"),
  choice("r8", "reading", "Tarea 3 · 人物與地點配對", "Laura quiere enviar una carta. ¿Adónde va?", ["Oficina de correos", "Cafetería", "Tienda de ropa"], "Oficina de correos", "寄信要到 oficina de correos（郵局）。"),
  choice("r9", "reading", "Tarea 4 · 課程資訊", "¿Dónde es el curso?", ["En Escuela Sol", "En una biblioteca", "En una universidad"], "En Escuela Sol", "Lugar 欄位寫的是 Escuela Sol。", { passage: "Curso de español A1 · Lugar: Escuela Sol · Horario: lunes y miércoles, 18:00-19:30 · Precio: 120 euros · Profesor: Carlos Ruiz" }),
  choice("r10", "reading", "Tarea 4 · 課程資訊", "¿Cuándo es el curso?", ["Lunes y miércoles", "Martes y jueves", "Sábado y domingo"], "Lunes y miércoles", "Horario 欄位寫的是 lunes y miércoles。", { passage: "Curso de español A1 · Lugar: Escuela Sol · Horario: lunes y miércoles, 18:00-19:30 · Precio: 120 euros · Profesor: Carlos Ruiz" }),

  choice("l1", "listening", "Tarea 1 · 簡短對話", "¿Qué quiere tomar la mujer?", ["Café", "Agua", "Té"], "Café", "她說 Quiero un café。", { audioText: "Mujer: Quiero un café, por favor.", audioSrc: "/audio/spanish-a1-mock/listening-1.mp3" }),
  choice("l2", "listening", "Tarea 1 · 簡短對話", "¿Dónde está el hombre?", ["En el banco", "En la estación", "En el restaurante"], "En la estación", "他正在車站等火車。", { audioText: "Hombre: Estoy en la estación. Espero el tren.", audioSrc: "/audio/spanish-a1-mock/listening-1.mp3" }),
  choice("l3", "listening", "Tarea 2 · 時間與購物", "¿A qué hora es la cita?", ["A las cuatro", "A las cinco", "A las seis"], "A las cinco", "回答是 A las cinco。", { audioText: "Mujer: ¿A qué hora es la cita? Hombre: A las cinco.", audioSrc: "/audio/spanish-a1-mock/listening-2.mp3" }),
  choice("l4", "listening", "Tarea 2 · 時間與購物", "¿Qué compra el chico?", ["Un pantalón negro", "Una camisa blanca", "Unos zapatos rojos"], "Una camisa blanca", "他想買一件白襯衫。", { audioText: "Chico: Quiero comprar una camisa blanca.", audioSrc: "/audio/spanish-a1-mock/listening-2.mp3" }),
  choice("l5", "listening", "Tarea 3 · 電話留言", "¿Quién llama?", ["Carlos", "Ana", "María"], "Carlos", "留言開頭是 Hola, soy Carlos。", { audioText: "Hola, soy Carlos. Mi número es seis cinco cuatro, uno dos tres, ocho nueve cero. Llámame esta tarde.", audioSrc: "/audio/spanish-a1-mock/listening-3.mp3" }),
  choice("l6", "listening", "Tarea 3 · 電話留言", "¿Cuál es el número de teléfono?", ["654 123 890", "645 213 980", "654 231 809"], "654 123 890", "音訊中的號碼是 654 123 890。", { audioText: "Hola, soy Carlos. Mi número es seis cinco cuatro, uno dos tres, ocho nueve cero. Llámame esta tarde.", audioSrc: "/audio/spanish-a1-mock/listening-3.mp3" }),
  choice("l7", "listening", "Tarea 4 · 地點與營業時間", "¿Dónde está la farmacia?", ["A la derecha", "A la izquierda", "Cerca del parque"], "A la derecha", "音訊說 farmacia está a la derecha。", { audioText: "La farmacia está a la derecha, cerca del banco.", audioSrc: "/audio/spanish-a1-mock/listening-4.mp3" }),
  choice("l8", "listening", "Tarea 4 · 地點與營業時間", "¿Cuándo abre el museo?", ["A las nueve", "A las diez", "A las once"], "A las diez", "博物館早上十點開門。", { audioText: "El museo abre a las diez de la mañana.", audioSrc: "/audio/spanish-a1-mock/listening-4.mp3" }),

  {
    id: "w1", section: "writing", task: "Tarea 1 · 填寫表格", type: "text",
    prompt: "用完整句子寫下姓名、國籍、年齡、職業、城市、電子郵件，並回答：¿Qué te gusta hacer los fines de semana?",
    placeholder: "Me llamo... Soy de... Tengo... años...",
    sample: "Me llamo Ana García. Soy española, tengo 20 años y soy estudiante. Vivo en Madrid. Mi correo es ana@example.com. Los fines de semana me gusta escuchar música y salir con mis amigos.",
    checklist: ["七項個人資料完整", "正確使用 ser / tener / vivir", "回答週末喜好", "拼字與標點清楚"],
  },
  {
    id: "w2", section: "writing", task: "Tarea 2 · 電子郵件", type: "text",
    prompt: "寫一封 30-40 字的電子郵件給朋友：問候、說明住處、介紹家庭、描述週末活動並道別。",
    placeholder: "Hola Marta:\nVivo en...",
    sample: "Hola Marta: Vivo en Madrid con mi familia. Tengo un hermano y una hermana. Los fines de semana estudio español, escucho música y salgo con mis amigos. Un abrazo, Ana",
    checklist: ["30-40 個西語單字", "包含問候與道別", "介紹住處與家庭", "描述週末活動"],
  },
  {
    id: "s1", section: "speaking", task: "Tarea 1 · 自我介紹", type: "speaking",
    prompt: "請介紹姓名、年齡、國籍、城市、職業或學業，以及興趣。",
    sample: "Hola, me llamo Ana. Tengo veinte años. Soy de España y vivo en Madrid. Soy estudiante. Me gusta la música, el cine y estudiar español.",
    checklist: ["涵蓋六項指定資訊", "使用第一人稱動詞", "發音清楚", "能自然持續說話"],
  },
  {
    id: "s2", section: "speaking", task: "Tarea 2 · 主題描述", type: "speaking",
    prompt: "選擇「Mi familia」或「Mi ciudad」，準備後說約 2 分鐘。可回答：¿Cómo es? ¿Dónde está? ¿Qué personas hay? ¿Qué te gusta?",
    sample: "Mi familia es pequeña. Tengo un padre, una madre y un hermano. Mi padre trabaja en una oficina. Mi madre es profesora. Me gusta estar con mi familia los domingos.",
    checklist: ["內容有開始與結尾", "至少使用五個完整句子", "形容人物或地方", "能表達自己的喜好"],
  },
  {
    id: "s3", section: "speaking", task: "Tarea 3 · 考官問答", type: "speaking",
    prompt: "依序回答：¿Dónde vives? ¿Qué haces los fines de semana? ¿Qué comida te gusta? ¿Tienes hermanos? ¿Por qué estudias español?",
    sample: "Vivo en Madrid. Los fines de semana estudio español. Me gusta la paella. Sí, tengo un hermano. Estudio español porque quiero viajar a España.",
    checklist: ["回答全部五題", "答案切合問題", "人稱與動詞基本正確", "不依賴中文完成回答"],
  },
];

export const A1_AUTO_QUESTION_COUNT = A1_EXAM_QUESTIONS.filter((question) => question.type === "choice").length;
