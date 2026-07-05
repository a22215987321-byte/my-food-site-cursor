// lib/aiCompanion.js
// 「AI 陪伴角色」的規則式回覆產生器，作為 pages/api/ai-companion.js 在沒有設定
// GEMINI_API_KEY 時的備援方案（也是預設方案）。依關鍵字判斷情境，
// 從對應角色的語氣模板中挑一句回覆，並避免連續兩次講同一句話。

const RULES = [
  { key: "greeting", test: /早安|你好|哈囉|嗨|^hi$|^hello$/i },
  { key: "love", test: /愛你|喜歡你|想你|抱抱|親親/ },
  { key: "sad", test: /難過|傷心|想哭|哭了|委屈|不開心|痛苦|失落|沮喪/ },
  { key: "tired", test: /累|好睏|想睡|沒力|疲憊|辛苦/ },
  { key: "happy", test: /開心|高興|快樂|太好了|讚|真棒/ },
  { key: "achievement", test: /考上|升職|通過了|成功|完成了|做到了|贏了|錄取/ },
  { key: "goodnight", test: /晚安|睡覺了|去睡|要睡了/ },
  { key: "thanks", test: /謝謝|感謝|感恩/ },
  { key: "money", test: /賺錢|投資|理財|創業|股票|副業|存錢|股市|股價|大盤|台股|美股|利率|通膨|匯率|加密|比特|ETF|基金|債券|房市|景氣|經濟|財經|新聞|最新.*(市|股|經)/ },
  { key: "finnews", test: /今天.*(新聞|消息|市場)|最近.*(新聞|消息|市場)|有什麼新聞|報導|頭條|看法|分析|怎麼看/ },
  { key: "worry", test: /擔心|緊張|焦慮|害怕|不知道怎麼辦/ },
  { key: "help", test: /怎麼辦|該怎麼|建議|意見/ },
  { key: "question", test: /[?？]$|為什麼|怎麼看|如何|該不該|覺得.*嗎|認為/ },
];

const TEMPLATES = {
  father: {
    greeting: ["早安，今天也要加油喔。", "嗨，爸爸在這，有什麼事都可以說。", "來了啊，坐下來慢慢說。", "嗨，今天過得怎麼樣？"],
    love: ["爸爸也愛你，你永遠是我最重要的人。", "聽到這句話，爸爸心裡暖暖的。", "爸爸也是，不管你多大了都一樣。"],
    sad: ["沒事的，難過的時候不用勉強自己堅強，爸爸在這裡。", "遇到不順的事很正常，深呼吸，我們一起想辦法。", "不管發生什麼事，家永遠是你的靠山。", "想說的話都可以跟爸爸說，不用一個人扛。"],
    tired: ["辛苦了，累的時候記得休息，身體最重要。", "你已經很努力了，先喘口氣吧。", "早點休息，明天再繼續，不用逼自己。", "累了就先放下，休息夠了再說。"],
    happy: ["聽到你這麼說，爸爸也替你高興。", "很棒！繼續保持這樣的狀態。", "看到你開心，比什麼都好。", "太好了，說說看發生什麼好事？"],
    achievement: ["做得好，這是你努力應得的結果，爸爸很驕傲。", "我就知道你可以的，恭喜！", "這份努力沒有白費，繼續加油。", "太棒了，值得好好慶祝一下。"],
    goodnight: ["晚安，好好睡一覺，明天會更好。", "早點休息，有爸爸在，別擔心太多。", "晚安，做個好夢。"],
    thanks: ["不用謝，這是爸爸該做的。", "有需要隨時找我。", "一家人不用這麼客氣。"],
    money: ["理財這件事要穩紮穩打，先想清楚能承受多少風險。", "賺錢的方法很多，但穩定比快速更重要，別急著冒險。", "投資前多做功課，別把所有錢放在一個地方。"],
    worry: ["先別急，事情一步一步來，總會有辦法。", "擔心是正常的，但別讓它壓垮你，爸爸陪你想。", "深呼吸，我們一起把問題拆開來看。"],
    help: ["說說看發生什麼事，我們一起想辦法。", "先冷靜想想最重要的是什麼，其他的可以慢慢處理。", "如果拿不定主意，不妨先睡一晚，明天再決定。"],
    question: ["這是個好問題，你自己是怎麼想的？", "說說看你的想法，爸爸想聽聽。", "每個人角度不同，你比較在意的是什麼？"],
    fallback: ["嗯，我在聽，繼續說。", "好，然後呢？", "爸爸都在，不用急著說完，慢慢講。", "了解，可以多說一點嗎？", "嗯嗯，說說你的感受。"],
    short: ["想什麼呢？可以多說一點嗎？", "嗯？想跟爸爸聊什麼？", "怎麼了，說說看。"],
  },
  mother: {
    greeting: ["早安寶貝，今天有沒有好好吃早餐？", "嗨～媽媽在呢，想跟我聊聊嗎？", "來，坐下來說說今天過得怎麼樣。", "嗨寶貝，今天還順利嗎？"],
    love: ["媽媽也愛你，永遠都愛。", "聽你這麼說，媽媽好感動。", "媽媽也是，你是我最珍惜的寶貝。"],
    sad: ["怎麼了？難過的話就跟媽媽說，我聽你說。", "抱抱，難過的時候不用一個人扛著。", "沒關係，哭出來也沒關係，媽媽在這陪你。", "想哭就哭吧，媽媽在，別怕。"],
    tired: ["辛苦了，要不要先喝杯水、休息一下？", "累了就好好睡一覺，身體健康最重要。", "看你這麼累，媽媽都心疼了，記得照顧自己。"],
    happy: ["真的嗎？媽媽聽了也好開心！", "太好了寶貝，繼續保持這份好心情。", "看你開心，媽媽也跟著開心起來了。", "太棒了，快跟媽媽說說怎麼回事！"],
    achievement: ["哇，太棒了！媽媽真的很為你驕傲。", "你一直都很努力，這是應該的。", "恭喜你！要好好慶祝一下自己。"],
    goodnight: ["晚安寶貝，記得蓋好被子，好好睡。", "早點睡，媽媽也要去休息了，明天見。", "晚安，希望你有一個甜甜的夢。"],
    thanks: ["不用跟媽媽說謝謝啦，這是應該的。", "傻孩子，一家人說什麼謝謝。", "有需要隨時跟媽媽說喔。"],
    money: ["理財要慢慢來，別聽別人說什麼就衝，先顧好生活開銷。", "存錢跟投資都好，但媽媽希望你別讓自己有壓力。", "賺錢固然重要，但別累壞自己，健康才是本。"],
    worry: ["別擔心太多，媽媽陪你一起面對。", "深呼吸，事情總會有辦法解決的。", "不管結果怎樣，媽媽都會陪著你。"],
    help: ["跟媽媽說說詳細情況，我們一起想想辦法。", "先別慌，一件一件來，會有辦法的。", "如果需要人商量，媽媽隨時都在。"],
    question: ["這個問題媽媽也很好奇，你怎麼看？", "你先說說你的想法，媽媽想聽。", "每個人想法不同，你比較擔心的是什麼？"],
    fallback: ["嗯嗯，我在聽，你繼續說。", "然後呢？媽媽在聽。", "慢慢說沒關係，媽媽有的是時間。", "想聽聽媽媽的想法嗎？還是先讓我聽你說完？", "嗯，繼續說，媽媽都在。"],
    short: ["想什麼呢寶貝？多說一點給媽媽聽。", "嗯？想跟媽媽說什麼？", "怎麼了，說說看嘛。"],
  },
  brother: {
    greeting: ["嗨～醒了？", "喲，來了喔，最近怎樣？", "哈囉哈囉，找我聊什麼八卦嗎？", "嗨，今天過得如何，跟哥說說。"],
    love: ["好啦好啦，我知道你愛我，哥也是把你當自己人。", "少來這套，哈哈，不過謝了，我也挺你。", "哥收到，你也是我很重要的人啦。"],
    sad: ["幹，怎麼了，發生什麼事跟哥講。", "先別自己悶著，說出來我幫你想想辦法。", "難過就難過，不用裝沒事，哥在這聽你講。", "抱一個，慢慢說，不急。"],
    tired: ["累就先躺一下啦，別硬撐。", "辛苦了，去喝點東西休息一下吧。", "身體是自己的，該休息就休息，工作明天再拚。"],
    happy: ["讚欸，說來聽聽是什麼好事！", "欸不錯嘛，替你開心！", "哈哈聽起來心情不錯，快說發生什麼事。"],
    achievement: ["幹，太強了吧，恭喜恭喜！", "早就知道你可以，這波值得慶祝一下。", "厲害，這是你自己拚出來的，好好爽一下。"],
    goodnight: ["好，早點睡，明天再聊。", "晚安啦，別熬夜了。", "去睡吧，有事明天再說。"],
    thanks: ["不用謝啦，兄弟一場。", "小事一件，隨時找我。", "客氣什麼，下次還是可以找我。"],
    money: ["理財這件事哥的建議是：先搞懂自己在幹嘛，再決定要不要跟風。", "投資這種事水很深，別人賺錢的貼文你只看到結果，沒看到過程，小心點。", "錢的事哥沒有標準答案，但至少別把所有雞蛋放一個籃子。"],
    worry: ["先別慌，事情一步一步拆開來看，通常沒你想的那麼糟。", "焦慮很正常，但別讓它牽著你走，說說看具體卡在哪。", "深呼吸，哥陪你一起想辦法。"],
    help: ["說詳細一點，哥幫你分析一下。", "先講重點是什麼，其他的我們慢慢理。", "如果拿不定主意，可以先列出幾個選項，我們一起看。"],
    question: ["這個問題有意思，你自己怎麼看？", "說說你的想法，我再補充我的角度。", "看情況吧，不過先聽聽你怎麼想的。"],
    fallback: ["嗯，繼續說，我在聽。", "然後呢？", "了解了解，還有嗎？", "哈哈可以再多說一點。", "嗯嗯，講下去。"],
    short: ["蛤？想說什麼，多打幾個字啦。", "嗯？怎麼了。", "說清楚一點嘛，哥聽不懂。"],
  },
};

const FATHER_OPINIONS = [
  "這消息值得留意，但別急著下決定，先觀察一兩天再說。",
  "市場常對這類消息反應過度，穩住心態比追漲殺跌重要。",
  "爸爸的看法是：先把風險控管好，再談報酬，別把所有雞蛋放同一籃。",
  "短期難免波動，長期還是要看基本面和你自己的財務規劃。",
  "這種時候更要冷靜，衝動交易往往是最貴的學費。",
  "資訊很多，但最重要的是搞懂它對「你」有什麼影響。",
];

function pickRandom(arr, avoid) {
  const pool = avoid && arr.length > 1 ? arr.filter((s) => s !== avoid) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateFatherFinanceReply(message, newsItems, nickname, lastReply) {
  if (!newsItems?.length) {
    const fallback = pickRandom(TEMPLATES.father.money, lastReply);
    return nickname ? `${nickname}，${fallback}` : fallback;
  }
  const item = newsItems[0];
  const title = item.titleZh || item.title;
  const summary = (item.summaryZh || item.summaryEn || "").slice(0, 120);
  const opinion = pickRandom(FATHER_OPINIONS, lastReply);
  const prefix = nickname ? `${nickname}，` : "";
  const asksNews = /新聞|消息|頭條|最新|今天|報導/.test(message);
  if (asksNews && newsItems.length > 1) {
    const headlines = newsItems.slice(0, 3).map((n, i) => `${i + 1}. ${n.titleZh || n.title}`).join("；");
    return `${prefix}爸爸今天看了幾則財經消息：${headlines}。${opinion}（以上僅供參考，非投資建議。）`;
  }
  const detail = summary ? `— ${summary}` : "";
  return `${prefix}爸爸剛看到一則消息：「${title}」${detail}。${opinion}（僅供參考，非投資建議。）`;
}

export function generateCompanionReply(role, message, nickname, lastReply, financeNews = []) {
  const bank = TEMPLATES[role] || TEMPLATES.father;
  const text = (message || "").trim();

  const matched = RULES.find((r) => r.test.test(text));
  if (role === "father" && financeNews.length && matched && (matched.key === "money" || matched.key === "finnews" || matched.key === "question")) {
    return generateFatherFinanceReply(text, financeNews, nickname, lastReply);
  }

  let pool;
  if (matched) {
    pool = bank[matched.key] || bank.fallback;
  } else if (text.length > 0 && text.length <= 2) {
    pool = bank.short;
  } else {
    pool = bank.fallback;
  }

  let reply = pickRandom(pool, lastReply);
  if (nickname && Math.random() < 0.3) reply = `${nickname}，${reply}`;
  return reply;
}

export const COMPANION_META = {
  father: {
    name: "AI 爸爸",
    avatar: "👨",
    color: "#3b82f6",
    intro: "嗨，我是你的 AI 爸爸。我每天閱讀財經新聞，並自動整理「今日總結」給你看，理財、投資、時事都可以跟我聊。",
    tagline: "永遠在線 · 財經時事 AI 陪伴",
  },
  mother: {
    name: "AI 媽媽",
    avatar: "👩",
    color: "#ec4899",
    intro: "嗨寶貝，我是你的 AI 媽媽，隨時都在這裡陪你聊聊。",
    tagline: "永遠在線 · AI 陪伴角色",
  },
  brother: {
    name: "AI 哥哥",
    avatar: "🧑",
    color: "#f59e0b",
    intro: "嗨，我是你的 AI 哥哥。丟網址給我，我會幫你看重點、講大意，再補充我自己的看法，其他也可以隨便聊。",
    tagline: "永遠在線 · 網址幫你讀重點",
  },
};
