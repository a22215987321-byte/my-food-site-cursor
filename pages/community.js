import { useRouter } from "next/router";
import WaitlistForm from "../components/WaitlistForm";
import CommunityDualHero from "../components/CommunityDualHero";
import { COMPANION_META } from "../lib/aiCompanion";
import { markEnterChat } from "../lib/communityIntro";

const BG = "#0B0D12";
const GRAD = "linear-gradient(135deg, #7C5CFF 0%, #4B7BFF 100%)";
const GLASS = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

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
      <style>{`
        .cm-page {
          min-height: 100vh;
          background: ${BG};
          color: #E8ECF4;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif;
          overflow-x: hidden;
        }
        .cm-wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 20px 100px;
        }
        .cm-ambient {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 70% 50% at 80% -10%, rgba(124,92,255,0.18), transparent),
            radial-gradient(ellipse 50% 40% at 10% 60%, rgba(75,123,255,0.1), transparent);
        }
        .cm-btn-primary {
          background: ${GRAD};
          color: #fff;
          border: none;
          border-radius: 22px;
          padding: 16px 28px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 12px 40px rgba(124,92,255,0.35);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .cm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 16px 48px rgba(124,92,255,0.45); }
        .cm-btn-ghost {
          background: ${GLASS};
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #C4CBE0;
          border: 1px solid ${BORDER};
          border-radius: 22px;
          padding: 15px 26px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .cm-btn-sm {
          background: ${GRAD};
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        /* Sections */
        .cm-section { padding: 56px 0; }
        .cm-section-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #5C6478;
          margin-bottom: 12px;
        }
        .cm-section-title {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 800;
          margin: 0 0 32px;
          color: #F0F3FA;
          letter-spacing: -0.02em;
        }

        /* Live */
        .cm-live-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .cm-live-room {
          padding: 20px 22px;
          border-radius: 22px;
          background: ${GLASS};
          border: 1px solid ${BORDER};
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cm-live-room.hot { border-color: rgba(124,92,255,0.25); }
        .cm-live-room-head { display: flex; justify-content: space-between; align-items: center; }
        .cm-live-room-name { font-weight: 700; font-size: 15px; }
        .cm-live-room-count { font-size: 13px; color: #7C5CFF; font-weight: 600; }
        .cm-live-room-last { font-size: 13px; color: #8892A8; line-height: 1.5; }
        .cm-live-feed { margin-top: 24px; display: flex; flex-direction: column; gap: 2px; }
        .cm-feed-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cm-feed-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .cm-feed-text { flex: 1; font-size: 14px; color: #B8C0D4; }
        .cm-feed-text strong { color: #E8ECF4; font-weight: 600; }
        .cm-feed-time { font-size: 12px; color: #5C6478; white-space: nowrap; }

        /* Pillars */
        .cm-pillars {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        .cm-pillar {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding: 8px 0;
        }
        .cm-pillar-icon { font-size: 28px; line-height: 1; }
        .cm-pillar-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #F0F3FA; }
        .cm-pillar-line { font-size: 14px; color: #8892A8; line-height: 1.55; margin: 0; }

        /* AI cards */
        .cm-ai-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .cm-ai-card {
          border-radius: 22px;
          padding: 22px;
          background: ${GLASS};
          border: 1px solid ${BORDER};
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cm-ai-top { display: flex; align-items: center; gap: 14px; }
        .cm-ai-avatar {
          width: 52px; height: 52px; border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; flex-shrink: 0;
        }
        .cm-ai-name { font-weight: 700; font-size: 16px; }
        .cm-ai-tag {
          display: inline-block;
          margin-top: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 10px;
          background: rgba(124,92,255,0.15);
          color: #A5B4FC;
        }
        .cm-ai-quote { font-size: 14px; color: #8892A8; line-height: 1.55; margin: 0; font-style: italic; }

        /* Content */
        .cm-content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .cm-content-card {
          border-radius: 24px;
          padding: 28px 26px;
          border: 1px solid ${BORDER};
          min-height: 160px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .cm-content-icon { font-size: 32px; margin-bottom: 16px; }
        .cm-content-title { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
        .cm-content-vibe { font-size: 14px; color: #8892A8; }
        .cm-content-stat { font-size: 13px; color: #7C5CFF; font-weight: 600; margin-top: 12px; }

        /* Pro */
        .cm-pro {
          margin-top: 72px;
          padding: 40px 28px;
          border-radius: 24px;
          background: rgba(124,92,255,0.06);
          border: 1px solid rgba(124,92,255,0.15);
        }
        .cm-pro h2 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #F0F3FA; }
        .cm-pro p { font-size: 14px; color: #8892A8; margin: 0 0 24px; line-height: 1.6; }

        .cm-sticky-cta {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          padding: 12px 16px 20px;
          background: linear-gradient(transparent, ${BG} 30%);
          z-index: 50;
        }
        .cm-sticky-cta button { width: 100%; }

        @media (min-width: 640px) {
          .cm-live-grid { grid-template-columns: 1fr 1fr; }
          .cm-pillars { grid-template-columns: repeat(3, 1fr); gap: 32px; }
          .cm-ai-grid { grid-template-columns: repeat(2, 1fr); }
          .cm-content-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .cm-ai-grid { grid-template-columns: repeat(3, 1fr); }
          .cm-sticky-cta { display: none !important; }
        }
        @media (max-width: 899px) {
          .cm-sticky-cta { display: block; }
          .cm-wrap { padding-bottom: 120px; }
        }
      `}</style>

      <div className="cm-page">
        <div className="cm-ambient" />

        <CommunityDualHero onEnterChat={enterChat} onExploreRooms={scrollToLive} />

        <div className="cm-wrap">
          {/* ── Live Now ── */}
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

          {/* ── Three pillars ── */}
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

          {/* ── AI characters ── */}
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

          {/* ── Community content ── */}
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

          {/* ── Pro waitlist ── */}
          <section className="cm-pro" id="waitlist">
            <h2>喜歡這個社群？搶先試用 Pro</h2>
            <p>新功能上線時優先通知你，沒有壓力，隨時可以取消。</p>
            <WaitlistForm source="community" />
          </section>
        </div>

        {/* Mobile sticky CTA */}
        <div className="cm-sticky-cta">
          <button type="button" className="cm-btn-primary" onClick={enterChat}>
            免費進入聊天室
          </button>
        </div>
      </div>
    </>
  );
}
