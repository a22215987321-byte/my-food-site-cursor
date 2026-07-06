import { useState } from "react";
import { auth } from "../lib/firebase";

const inputStyle = {
  width: "100%",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 10,
  padding: "10px 14px",
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function WaitlistForm({ source = "community" }) {
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState("notify");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const headers = { "Content-Type": "application/json" };
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        headers.Authorization = `Bearer ${idToken}`;
      }

      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers,
        body: JSON.stringify({ email, intent, source }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "提交失敗，請稍後再試");
        return;
      }

      setMessage(data.duplicate ? "你已登記過，我們會盡快通知你。" : "登記成功，感謝你的支持！");
      if (!data.duplicate) setEmail("");
    } catch {
      setError("網絡錯誤，請稍後再試");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: "#1e293b", borderRadius: 16, padding: 24, border: "1px solid #334155" }}>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>搶先體驗</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
        留下電子郵件，有新功能或 Pro 試用名額時我們會通知你。
      </p>

      <div style={{ marginBottom: 14 }}>
        <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6, display: "block" }}>電子郵件</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { value: "notify", label: "加入等待名單" },
          { value: "pro", label: "想試用 Pro" },
        ].map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: intent === opt.value ? "1px solid #8b5cf6" : "1px solid #334155",
              background: intent === opt.value ? "rgba(139,92,246,0.12)" : "#0f172a",
              cursor: "pointer",
              fontSize: 14,
              color: "#e2e8f0",
            }}
          >
            <input
              type="radio"
              name="waitlist-intent"
              value={opt.value}
              checked={intent === opt.value}
              onChange={() => setIntent(opt.value)}
              style={{ accentColor: "#8b5cf6" }}
            />
            {opt.label}
          </label>
        ))}
      </div>

      {error && (
        <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "8px 12px", color: "#fca5a5", fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ background: "#052e16", border: "1px solid #22c55e", borderRadius: 8, padding: "8px 12px", color: "#86efac", fontSize: 13, marginBottom: 12 }}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        style={{
          width: "100%",
          background: busy ? "#334155" : "linear-gradient(135deg,#8b5cf6,#22d3ee)",
          border: "none",
          borderRadius: 10,
          padding: "12px",
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "提交中..." : "提交"}
      </button>
    </form>
  );
}
