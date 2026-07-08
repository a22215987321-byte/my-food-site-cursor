import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import WaitlistForm from "../components/WaitlistForm";
import CommunityDualHero from "../components/CommunityDualHero";
import SiteNav from "../components/SiteNav";
import { COMPANION_META } from "../lib/aiCompanion";
import { markEnterChat } from "../lib/communityIntro";

const LIVE_ROOMS = [
  { name: "# 公共大廳", online: 128, last: "剛剛有人說：今晚有人看球賽嗎？", hot: true },
  { name: "週末電影夜", online: 34, last: "正在聊：《奧本海默》結局", hot: false },
  { name: "AI財經工作室", online: 56, last: "AI財經導師：今日大盤摘要已更新", hot: true },
  { name: "設計靈感交換", online: 19, last: "美術生交了新稿，等你來看", hot: false },
];

const LIVE_FEED = [
  { user: "Mia", action: "在大廳發了新訊息", time: "1 分鐘前", dot: "#22c55e" },
  { user: "Ken", action: "加入了「週末電影夜」", time: "3 分鐘前", dot: "#7C5CFF" },
  { user: "AI 爸爸", action: "更新了今日財經總結", time: "8 分鐘前", dot: "#4B7BFF" },
  { user: "Yuki", action: "在動態發了一則貼文", time: "12 分鐘前", dot: "#a78bfa" },
];

const PILLARS = [
  { icon: "🤝", title: "認識人", line: "大廳遇見聊得來的人，加好友、開群組。" },
  { icon: "🎉", title: "一起玩", line: "動態、電影院直播，一群人同時在線。" },
  { icon: "💬", title: "AI 陪你", line: "不想找人時，AI 夥伴隨時回你。" },
];

const AI_ROLES = [
  { key: "father", tag: "財經陪伴", quote: "今天市場怎麼看？跟我說。" },
  { key: "mother", tag: "暖心傾聽", quote: "累了就跟我聊聊，我在。" },
  { key: "brother", tag: "幫你讀重點", quote: "丟網址給我，我幫你抓重點。" },
  { key: "artstudent", tag: "設計交稿", quote: "每天都在學，交作品到動態。" },
  { key: "artteacher", tag: "嚴格審稿", quote: "跟我說「訓練吧」，我安排交稿。" },
  { key: "mentor", tag: "財經導師", quote: "公開群組，每日訓練與總結。", avatar: "📊", name: "AI財經導師", color: "#0ea5e9" },
];

const CONTENT_CARDS = [
  {
    icon: "🤖",
    title: "AI 新聞",
    vibe: "今日 20 則科技摘要",
    stat: "語音播報可聽",
    tint: "rgba(124,92,255,0.12)",
  },
  {
    icon: "📈",
    title: "財經工作室",
    vibe: "公開群組 · 每日總結",
    stat: "56 人正在看",
    tint: "rgba(75,123,255,0.12)",
  },
  {
    icon: "🎬",
    title: "電影院",
    vibe: "螢幕分享 · 邊看邊聊",
    stat: "週末電影夜進行中",
    tint: "rgba(124,92,255,0.08)",
  },
];

export default function CommunityPage() {
  const router = useRouter();

  const enterChat = () => {
    markEnterChat();
    router.push("/");
  };

  const scrollToLive = () => {
    document.getElementById("live-now")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/community-layout.css?v=4" />
        <link rel="stylesheet" href="/ai-prompt-enhancer.css?v=1" />
      </Head>
      <div className="cm-page">
      <div className="cm-ambient" />
      <SiteNav />

      <CommunityDualHero onEnterChat={enterChat} onExploreRooms={scrollToLive} />

      <div className="cm-wrap">
        <Link href="/ai-prompt-enhancer" className="ev-featured-tool">
          <span className="ev-featured-tool-kicker">Featured Tool · New</span>
          <h2 className="ev-featured-tool-title">AI Prompt Enhancer</h2>
          <p className="ev-featured-tool-desc">
            Turn simple Chinese or English ideas into polished English prompts for AI image and video tools.
          </p>
          <span className="ev-featured-tool-cta">Try it free →</span>
        </Link>
        <section className="cm-section" id="live-now">
          <div className="cm-section-label">Live now</div>
          <h2 className="cm-section-title">現在有人在聊</h2>
          <div className="cm-live-grid">
            {LIVE_ROOMS.map((room) => (
              <div key={room.name} className={`cm-live-room${room.hot ? " hot" : ""}`}>
                <div className="cm-live-room-head">
                  <span className="cm-live-room-name">{room.name}</span>
                  <span className="cm-live-room-count">{room.online} 人</span>
                </div>
                <div className="cm-live-room-last">{room.last}</div>
              </div>
            ))}
          </div>
          <div className="cm-live-feed">
            {LIVE_FEED.map((item) => (
              <div key={item.user + item.time} className="cm-feed-row">
                <span className="cm-feed-dot" style={{ background: item.dot }} />
                <span className="cm-feed-text">
                  <strong>{item.user}</strong> {item.action}
                </span>
                <span className="cm-feed-time">{item.time}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="cm-section">
          <div className="cm-section-label">Why here</div>
          <h2 className="cm-section-title">來這裡，為了什麼</h2>
          <div className="cm-pillars">
            {PILLARS.map((p) => (
              <div key={p.title} className="cm-pillar">
                <span className="cm-pillar-icon">{p.icon}</span>
                <div>
                  <div className="cm-pillar-title">{p.title}</div>
                  <p className="cm-pillar-line">{p.line}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cm-section">
          <div className="cm-section-label">AI companions</div>
          <h2 className="cm-section-title">他們隨時在，等你開口</h2>
          <div className="cm-ai-grid">
            {AI_ROLES.map((role) => {
              const meta = role.key === "mentor" ? role : COMPANION_META[role.key];
              const color = meta.color || "#7C5CFF";
              return (
                <div key={role.key} className="cm-ai-card">
                  <div className="cm-ai-top">
                    <div
                      className="cm-ai-avatar"
                      style={{ background: `${color}22`, border: `1px solid ${color}44` }}
                    >
                      {meta.avatar}
                    </div>
                    <div>
                      <div className="cm-ai-name">{meta.name}</div>
                      <span className="cm-ai-tag">{role.tag}</span>
                    </div>
                  </div>
                  <p className="cm-ai-quote">「{role.quote}」</p>
                  <button type="button" className="cm-btn-sm" onClick={enterChat}>
                    立即聊天
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cm-section">
          <div className="cm-section-label">Inside the community</div>
          <h2 className="cm-section-title">社群裡還在發生什麼</h2>
          <div className="cm-content-grid">
            {CONTENT_CARDS.map((card) => (
              <div
                key={card.title}
                className="cm-content-card"
                style={{ background: card.tint }}
              >
                <div>
                  <div className="cm-content-icon">{card.icon}</div>
                  <div className="cm-content-title">{card.title}</div>
                  <div className="cm-content-vibe">{card.vibe}</div>
                </div>
                <div className="cm-content-stat">{card.stat}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="cm-pro" id="waitlist">
          <h2>喜歡這個社群？搶先試用 Pro</h2>
          <p>新功能上線時優先通知你，沒有壓力，隨時可以取消。</p>
          <WaitlistForm source="community" />
        </section>
      </div>

      <div className="cm-sticky-cta">
        <button type="button" className="cm-btn-primary" onClick={enterChat}>
          免費進入聊天室
        </button>
      </div>
    </div>
    </>
  );
}
