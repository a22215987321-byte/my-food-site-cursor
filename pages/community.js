import Link from "next/link";
import WaitlistForm from "../components/WaitlistForm";
import { COMPANION_META } from "../lib/aiCompanion";

const SOCIAL_FEATURES = [
  {
    icon: "💬",
    title: "公共大廳",
    desc: "即時公開聊天，認識新朋友、分享近況。",
    color: "#3b82f6",
  },
  {
    icon: "👥",
    title: "好友私訊",
    desc: "加好友、一對一聊天，支援圖片與影片。",
    color: "#8b5cf6",
  },
  {
    icon: "🏘️",
    title: "群組",
    desc: "建立自己的群組，或加入公開討論室。",
    color: "#06b6d4",
  },
  {
    icon: "📰",
    title: "動態消息",
    desc: "發佈貼文、留言互動，像社群動態牆一樣。",
    color: "#10b981",
  },
  {
    icon: "🎬",
    title: "電影院",
    desc: "螢幕分享直播，邊看邊聊。",
    color: "#f59e0b",
  },
  {
    icon: "💝",
    title: "打賞榜",
    desc: "支持喜歡的創作者，登上打賞排行榜。",
    color: "#ec4899",
  },
];

const AI_FEATURES = [
  {
    icon: "🤖",
    title: "AI 新聞",
    desc: "每日彙整科技新聞，中文摘要，還可語音播報。",
    color: "#7c3aed",
  },
  {
    icon: "📈",
    title: "AI財經工作室",
    desc: "公開群組，每日財經總結與討論。",
    color: "#0ea5e9",
  },
  ...Object.entries(COMPANION_META).map(([key, meta]) => ({
    icon: meta.avatar,
    title: meta.name,
    desc: meta.intro,
    color: meta.color,
    key,
  })),
];

function FeatureCard({ icon, title, desc, color }) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 14,
        padding: 20,
        border: "1px solid #334155",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `${color}22`,
          border: `1px solid ${color}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.55, flex: 1 }}>{desc}</div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 64px" }}>
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{ color: "#8b5cf6", fontSize: 13, textDecoration: "none" }}>
            ← 返回首頁
          </Link>
        </div>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 20px",
              borderRadius: 20,
              background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              boxShadow: "0 8px 32px rgba(139,92,246,0.35)",
            }}
          >
            🌐
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              margin: "0 0 12px",
              background: "linear-gradient(135deg,#c4b5fd,#67e8f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            EvonVChat 社群
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 16, lineHeight: 1.6, maxWidth: 520, margin: "0 auto 24px" }}>
            一個可以聊天、交朋友、發動態的即時社交平台。註冊免費，馬上可以進大廳、加好友、開群組。
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
              color: "#fff",
              textDecoration: "none",
              padding: "12px 28px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            免費開始
          </Link>
        </div>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            社交功能
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {SOCIAL_FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
            站內夥伴與內容
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            除了真人好友，站上還有 AI 角色與每日內容可以互動——登入後在側欄即可找到。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {AI_FEATURES.map((f) => (
              <FeatureCard key={f.title + (f.key || "")} {...f} />
            ))}
          </div>
        </section>

        <section style={{ maxWidth: 440, margin: "0 auto" }}>
          <WaitlistForm source="community" />
        </section>
      </div>
    </div>
  );
}
