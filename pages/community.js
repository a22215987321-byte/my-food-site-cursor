import Link from "next/link";
import { useRouter } from "next/router";
import WaitlistForm from "../components/WaitlistForm";
import { COMPANION_META } from "../lib/aiCompanion";
import { markEnterChat } from "../lib/communityIntro";

const SOCIAL_FEATURES = [
  { icon: "💬", title: "公共大廳", desc: "即時公開聊天，認識新朋友。", color: "#3b82f6" },
  { icon: "👥", title: "好友私訊", desc: "加好友、一對一聊天，支援圖片與影片。", color: "#8b5cf6" },
  { icon: "🏘️", title: "群組", desc: "建立自己的群組，或加入公開討論室。", color: "#06b6d4" },
  { icon: "📰", title: "動態消息", desc: "發佈貼文、留言互動。", color: "#10b981" },
  { icon: "🎬", title: "電影院", desc: "螢幕分享直播，邊看邊聊。", color: "#f59e0b" },
  { icon: "💝", title: "打賞榜", desc: "支持喜歡的創作者。", color: "#ec4899" },
];

const AI_FEATURES = [
  { icon: "🤖", title: "AI 新聞", desc: "每日科技新聞，中文摘要 + 語音播報。", color: "#7c3aed" },
  { icon: "📈", title: "AI財經工作室", desc: "公開群組，每日財經總結。", color: "#0ea5e9" },
  ...Object.entries(COMPANION_META).map(([key, meta]) => ({
    icon: meta.avatar,
    title: meta.name,
    desc: meta.tagline || meta.intro,
    color: meta.color,
    key,
  })),
];

const STATS = [
  { value: "免費", label: "註冊即用" },
  { value: "6+", label: "社交功能" },
  { value: "5", label: "AI 夥伴" },
  { value: "24/7", label: "即時在線" },
];

function FeatureCard({ icon, title, desc, color }) {
  return (
    <div
      style={{
        background: "linear-gradient(145deg,#1e293b,#172033)",
        borderRadius: 16,
        padding: 22,
        border: "1px solid #334155",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.2s, transform 0.2s",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${color}33, ${color}11)`,
          border: `1px solid ${color}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.55, flex: 1 }}>{desc}</div>
    </div>
  );
}

export default function CommunityPage() {
  const router = useRouter();

  const enterChat = () => {
    markEnterChat();
    router.push("/");
  };

  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          maxWidth: 700,
          height: 400,
          background: "radial-gradient(ellipse, rgba(139,92,246,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px 80px", position: "relative" }}>
        {/* Hero */}
        <section
          style={{
            textAlign: "center",
            marginBottom: 56,
            padding: "40px 24px 48px",
            borderRadius: 24,
            background: "linear-gradient(180deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.4) 100%)",
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 20,
              background: "rgba(139,92,246,0.15)",
              border: "1px solid rgba(139,92,246,0.4)",
              fontSize: 12,
              fontWeight: 600,
              color: "#c4b5fd",
              marginBottom: 20,
              letterSpacing: "0.05em",
            }}
          >
            EVONVCHAT · 即時社交平台
          </div>

          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 48px)",
              fontWeight: 900,
              margin: "0 0 16px",
              lineHeight: 1.15,
              background: "linear-gradient(135deg,#fff 0%,#c4b5fd 50%,#67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            聊天、交友、群組
            <br />
            一站搞定
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "clamp(15px, 2.5vw, 18px)",
              lineHeight: 1.65,
              maxWidth: 540,
              margin: "0 auto 32px",
            }}
          >
            免費註冊，馬上進公共大廳聊天。站上還有動態消息、電影院直播，以及 AI 夥伴與每日內容。
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
            <button
              onClick={enterChat}
              style={{
                background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
                color: "#fff",
                border: "none",
                padding: "16px 36px",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 17,
                cursor: "pointer",
                boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
              }}
            >
              進入聊天室 →
            </button>
            <button
              onClick={scrollToWaitlist}
              style={{
                background: "transparent",
                color: "#e2e8f0",
                border: "2px solid #475569",
                padding: "14px 32px",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              搶先體驗 Pro
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Social */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>你可以做什麼</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>登入後左側欄即可使用以下功能</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {SOCIAL_FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* AI */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>站內夥伴與內容</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
            除了真人好友，還有 AI 角色與自動更新的內容可以互動
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {AI_FEATURES.map((f) => (
              <FeatureCard key={f.title + (f.key || "")} {...f} />
            ))}
          </div>
        </section>

        {/* Waitlist */}
        <section
          id="waitlist"
          style={{
            maxWidth: 480,
            margin: "0 auto",
            padding: "32px 28px",
            borderRadius: 20,
            background: "linear-gradient(145deg,#1e293b,#0f172a)",
            border: "2px solid #7c3aed",
            boxShadow: "0 0 48px rgba(124,58,237,0.15)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>搶先體驗 Pro</h2>
            <p style={{ margin: 0, fontSize: 14, color: "#94a3b8" }}>
              留下 email，新功能與 Pro 試用名額開放時優先通知你
            </p>
          </div>
          <WaitlistForm source="community" />
        </section>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button
            onClick={enterChat}
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
              color: "#fff",
              border: "none",
              padding: "14px 40px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            進入聊天室
          </button>
        </div>
      </div>
    </div>
  );
}
