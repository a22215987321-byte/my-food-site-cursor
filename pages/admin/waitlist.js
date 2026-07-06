import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";

function formatTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-TW", { hour12: false });
}

export default function AdminWaitlistPage() {
  const [user, setUser] = useState(undefined);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async (firebaseUser) => {
    setLoading(true);
    setError("");
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/admin/waitlist", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "讀取失敗");
        setEntries([]);
        return;
      }
      setEntries(data.entries || []);
    } catch {
      setError("網絡錯誤");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      if (u) loadEntries(u);
      else setLoading(false);
    });
  }, [loadEntries]);

  const exportCsv = () => {
    const header = ["email", "intent", "userId", "source", "createdAt"];
    const rows = entries.map((e) =>
      [e.email, e.intentLabel, e.userId || "", e.source, e.createdAt || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (user === undefined || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        載入中...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#94a3b8" }}>
        <p>請先登入管理員帳號</p>
        <Link href="/" style={{ color: "#8b5cf6" }}>返回首頁</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", padding: "32px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <Link href="/community" style={{ color: "#8b5cf6", fontSize: 13, textDecoration: "none" }}>← 社群頁</Link>
            <h1 style={{ margin: "8px 0 4px", fontSize: 24, fontWeight: 800 }}>等待名單</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>共 {entries.length} 筆（最多顯示 500 筆）</p>
          </div>
          {entries.length > 0 && (
            <button
              onClick={exportCsv}
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 16px", color: "#e2e8f0", cursor: "pointer", fontSize: 13 }}
            >
              匯出 CSV
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", marginBottom: 16 }}>
            {error === "無權限" ? "你的帳號不在 ADMIN_UIDS 名單中，請在 Vercel 環境變數設定後重試。" : error}
          </div>
        )}

        {!error && entries.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 48 }}>尚無登記</div>
        )}

        {entries.length > 0 && (
          <div style={{ overflowX: "auto", border: "1px solid #334155", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1e293b", textAlign: "left" }}>
                  {["Email", "類型", "User ID", "來源", "登記時間"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid #334155" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "10px 14px" }}>{e.email}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        background: e.intent === "pro" ? "rgba(139,92,246,0.2)" : "rgba(100,116,139,0.2)",
                        color: e.intent === "pro" ? "#c4b5fd" : "#94a3b8",
                      }}>
                        {e.intentLabel}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{e.userId || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>{e.source || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b", whiteSpace: "nowrap" }}>{formatTime(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
