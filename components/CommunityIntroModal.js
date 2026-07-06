import Link from "next/link";
import { dismissIntroModal } from "../lib/communityIntro";

export default function CommunityIntroModal({ onClose }) {
  const close = () => {
    dismissIntroModal();
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#1e293b",
          borderRadius: 20,
          padding: 28,
          border: "1px solid #475569",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: "0 auto 14px",
              borderRadius: 18,
              background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
            }}
          >
            🌐
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>
            歡迎來到 EvonVChat
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>
            這裡可以即時聊天、加好友、開群組，還有 AI 夥伴與每日內容。建議先看一遍功能介紹。
          </p>
        </div>

        <ul style={{ margin: "0 0 22px", padding: "0 0 0 18px", color: "#cbd5e1", fontSize: 13, lineHeight: 1.8 }}>
          <li>公共大廳 — 公開即時聊天</li>
          <li>好友私訊、群組、動態消息</li>
          <li>AI 新聞、AI 陪伴角色、財經工作室</li>
        </ul>

        <Link
          href="/community"
          onClick={close}
          style={{
            display: "block",
            width: "100%",
            textAlign: "center",
            background: "linear-gradient(135deg,#8b5cf6,#22d3ee)",
            color: "#fff",
            textDecoration: "none",
            padding: "13px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            marginBottom: 10,
            boxSizing: "border-box",
          }}
        >
          查看社群功能介紹
        </Link>
        <button
          onClick={close}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid #334155",
            borderRadius: 12,
            padding: "12px",
            color: "#94a3b8",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          直接開始聊天
        </button>
      </div>
    </div>
  );
}
