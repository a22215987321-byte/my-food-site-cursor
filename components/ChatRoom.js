import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import AvatarCreator from "./AvatarCreator";
import CalendarMemo from "./CalendarMemo";
import { generateCompanionReply, COMPANION_META } from "../lib/aiCompanion";
import { publishDesignFeedFromClient } from "../lib/designFeedClient";
import { getTaipeiDateKey } from "../lib/financeDailyBrief";
import {
  doc, collection, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limitToLast, serverTimestamp,
  arrayUnion, arrayRemove, getDocs, where, limit, getDoc,
} from "firebase/firestore";

const EMOJI_QUICK  = ["😄","👍","❤️","😂","🎉","🔥"];
const PROFILE_GRADIENTS = [
  "linear-gradient(135deg,#1e3a5f,#2d1f6e)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#0f172a,#1e293b)",
  "linear-gradient(135deg,#f472b6,#fb923c)",
  "linear-gradient(135deg,#34d399,#06b6d4)",
  "radial-gradient(ellipse at 20% 15%, rgba(96,84,210,0.65), transparent 55%), radial-gradient(ellipse at 85% 88%, rgba(36,140,170,0.55), transparent 55%) #0a0e1a",
  "radial-gradient(ellipse at 80% 10%, rgba(236,72,153,0.55), transparent 50%), radial-gradient(ellipse at 15% 90%, rgba(99,102,241,0.50), transparent 55%) #0f0a1e",
  "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.45), transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(239,68,68,0.40), transparent 55%) #150a00",
  "radial-gradient(ellipse at 10% 50%, rgba(16,185,129,0.50), transparent 55%), radial-gradient(ellipse at 90% 50%, rgba(6,182,212,0.45), transparent 55%) #001a14",
];
const STATUS_EMOJIS = ["😊","😴","🎮","📚","🏃","🎵","☕","🔕"];
const AVATAR_EMOJIS = ["😊","👨‍💻","📚","🏃","🎮","🎨","🍜","🌸","🦊","🐼","🎧","⚡"];
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];

const ART_DESIGN_QUICK_ACTIONS = {
  artteacher: [
    { label: "🎨 開始訓練", text: "訓練吧" },
    { label: "📋 今日訓練", text: "今日訓練" },
    { label: "🔁 再交一份", text: "再交一份" },
    { label: "📰 看動態", href: "/feed" },
  ],
  artstudent: [
    { label: "📐 交設計稿", text: "交作品" },
    { label: "❓ 今天學什麼", text: "今天應該學哪個 EVONVCHAT 頁面？" },
    { label: "📰 看動態", href: "/feed" },
  ],
};

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStatus(status) {
  switch (status) {
    case "online": return { label: "線上",    color: "#22c55e" };
    case "away":   return { label: "暫時離開", color: "#eab308" };
    case "dnd":    return { label: "請勿打擾", color: "#ef4444" };
    default:       return { label: "離線",    color: "#6b7280" };
  }
}

async function uploadToR2(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, fileData: base64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "上傳失敗");
  return data.url;
}

// ── Avatar helper ─────────────────────────────────────────────────────────────

function AvatarImg({ avatarImage, avatar, color, size = 36 }) {
  if (avatarImage) {
    return <img src={avatarImage} alt="頭像" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color || "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, flexShrink: 0 }}>
      {avatar || "😊"}
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine, showSender, myUid, collectionPath }) {
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reactions = msg.reactions || {};
  const toggleReaction = async (emoji) => {
    setShowPicker(false);
    if (!collectionPath) return;
    const already = (reactions[emoji] || []).includes(myUid);
    try {
      await updateDoc(doc(db, ...collectionPath), {
        [`reactions.${emoji}`]: already ? arrayRemove(myUid) : arrayUnion(myUid),
      });
    } catch (e) {
      // 反應同步失敗時安靜地忽略，不打斷聊天體驗
    }
  };

  const recallMsg = async () => {
    if (!collectionPath) return;
    if (!confirm("確定要收回這則訊息？")) return;
    try {
      await updateDoc(doc(db, ...collectionPath), { recalled: true, text: "此訊息已收回", imageUrl: "", videoUrl: "" });
    } catch (e) {
      alert("收回失敗，請重試");
    }
  };

  if (msg.recalled) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "72%" }}>
          {!isMine && <div style={{ width: 30, flexShrink: 0 }} />}
          <div style={{ padding: "8px 14px", borderRadius: 18, background: "#1e293b", border: "1px solid #334155", color: "#475569", fontSize: 13, fontStyle: "italic" }}>
            此訊息已收回
          </div>
        </div>
        <span style={{ fontSize: 10, color: "#334155", marginTop: 2, marginLeft: isMine ? 0 : 40 }}>{formatTime(msg.createdAt)}</span>
      </div>
    );
  }

  const hasMedia = msg.imageUrl || msg.videoUrl;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 2, position: "relative" }}
    >
      {isMine && hovered && (
        <button onClick={recallMsg} style={{ position: "absolute", top: 0, right: 0, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "2px 8px", fontSize: 11, color: "#94a3b8", cursor: "pointer", zIndex: 5, whiteSpace: "nowrap" }}>
          收回
        </button>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: msg.dailyBrief ? "88%" : "72%", marginTop: isMine && hovered ? 22 : 0 }}>
        {!isMine && showSender && (
          <div style={{ flexShrink: 0 }}>
            <AvatarImg avatarImage={msg.senderAvatarImage} avatar={msg.avatar || msg.sender?.[0]} color="#6366f1" size={30} />
          </div>
        )}
        {!isMine && !showSender && <div style={{ width: 30, flexShrink: 0 }} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
          {!isMine && showSender && <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3, marginLeft: 2 }}>{msg.sender}</span>}
          <div onDoubleClick={() => setShowPicker(v => !v)} style={{
            padding: hasMedia && !msg.text ? "4px" : "9px 14px",
            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isMine ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "#1e293b",
            color: "#fff", fontSize: 14, lineHeight: 1.6, cursor: "default",
            border: isMine ? "none" : "1px solid #334155",
            overflow: "hidden", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {msg.videoUrl && (
              <video src={msg.videoUrl} controls style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, display: "block" }} />
            )}
            {msg.imageUrl && (
              <img src={msg.imageUrl} alt="圖片" style={{ maxWidth: 260, maxHeight: 200, borderRadius: 10, display: "block" }} />
            )}
            {msg.text}
          </div>
          {Object.entries(reactions).some(([, uids]) => uids?.length) && (
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {Object.entries(reactions).filter(([, uids]) => uids?.length).map(([emoji, uids]) => {
                const mine = uids.includes(myUid);
                return (
                  <button key={emoji} onClick={() => toggleReaction(emoji)} title={mine ? "移除反應" : "加上反應"}
                    style={{ background: mine ? "rgba(139,92,246,0.28)" : "#1e293b", border: mine ? "1px solid #8b5cf6" : "1px solid #334155", borderRadius: 20, padding: "2px 8px", fontSize: 12, color: "#e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                    {emoji} <span style={{ color: mine ? "#c4b5fd" : "#64748b" }}>{uids.length}</span>
                  </button>
                );
              })}
            </div>
          )}
          {showPicker && (
            <div style={{ position: "absolute", [isMine ? "right" : "left"]: 0, bottom: "calc(100% + 6px)", background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: "6px 8px", display: "flex", gap: 6, zIndex: 10 }}>
              {EMOJI_QUICK.map(e => <button key={e} onClick={() => toggleReaction(e)} style={{ background: (reactions[e]||[]).includes(myUid) ? "rgba(139,92,246,0.35)" : "none", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 20 }}>{e}</button>)}
            </div>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, color: "#475569", marginTop: 3, marginLeft: isMine ? 0 : 40 }}>{formatTime(msg.createdAt)}</span>
    </div>
  );
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

function ProfilePage({ myProfile, friendProfiles, onSave, onClose }) {
  const [nickname,   setNickname]   = useState(myProfile.nickname || "");
  const [bio,        setBio]        = useState(myProfile.bio || "");
  const [avatar,     setAvatar]     = useState(myProfile.avatar || "😊");
  const [color,      setColor]      = useState(myProfile.color || "#3b82f6");
  const [statusText, setStatusText] = useState(myProfile.statusText || "");
  const [status,     setStatus]     = useState(myProfile.status || "online");
  const [signature,  setSignature]  = useState(myProfile.signature || "");
  const [showCreator, setShowCreator] = useState(false);
  const [profileBg,     setProfileBg]     = useState(myProfile.profileBg || "linear-gradient(135deg,#1e3a5f,#2d1f6e)");
  const [profileBgType, setProfileBgType] = useState(myProfile.profileBgType || "gradient");
  const [bgUploading,   setBgUploading]   = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const bgFileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const friendList = (myProfile.friends || []).map(fid => friendProfiles[fid]).filter(Boolean);
  const [linkCopied, setLinkCopied] = useState(false);

  const copyProfileLink = async () => {
    const url = `${window.location.origin}/profile/${myProfile.uid}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("複製這個連結：", url);
      return;
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadToR2(file);
      await updateDoc(doc(db, 'users', myProfile.uid), { avatarImage: url });
    } catch {
      alert("頭像上傳失敗，請重試");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#1e293b", borderRadius: 20, width: 460, maxHeight: "85vh", overflow: "auto", border: "1px solid #334155" }}>
        <div style={{
          background: profileBgType === "gradient" ? profileBg : undefined,
          backgroundImage: profileBgType === "image" ? `url(${profileBg})` : undefined,
          backgroundSize: profileBgType === "image" ? "cover" : undefined,
          backgroundPosition: profileBgType === "image" ? "center" : undefined,
          padding: "28px 28px 0", borderRadius: "20px 20px 0 0", position: "relative",
        }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.3)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>✕</button>
          {showCreator && <AvatarCreator myProfile={myProfile} onClose={() => setShowCreator(false)} />}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <AvatarImg avatarImage={myProfile.avatarImage} avatar={avatar} color={color} size={80} />
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: getStatus(status).color, border: "3px solid #1e293b" }} />
              <button onClick={() => setShowCreator(true)} title="設計像素頭像"
                style={{ position: "absolute", top: 0, left: 0, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "rgba(0,0,0,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.background = "rgba(0,0,0,0)"; }}>
                <span style={{ fontSize: 22, pointerEvents: "none" }}>🎨</span>
              </button>
            </div>
            <div style={{ paddingBottom: 12, flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#e2e8f0" }}>{nickname}</div>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>{myProfile.email}</div>
            </div>
            <button onClick={copyProfileLink} title="複製個人主頁連結"
              style={{ marginBottom: 12, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: linkCopied ? "#22c55e" : "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "7px 14px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "background 0.15s" }}>
              {linkCopied ? "✓ 已複製連結" : "🔗 分享主頁"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, paddingBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#e2e8f0" }}>{friendList.length}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>好友</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8, display: "block" }}>頭像照片</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AvatarImg avatarImage={myProfile.avatarImage} avatar={avatar} color={color} size={48} />
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <button onClick={() => avatarFileRef.current?.click()} disabled={avatarUploading}
                  style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "7px 14px", color: "#94a3b8", cursor: avatarUploading ? "default" : "pointer", fontSize: 13 }}>
                  {avatarUploading ? "上傳中..." : "📷 上傳頭像照片"}
                </button>
                {myProfile.avatarImage && (
                  <button onClick={() => updateDoc(doc(db, 'users', myProfile.uid), { avatarImage: "" })}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12, textAlign: "left" }}>✕ 移除照片</button>
                )}
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6, display: "block" }}>頭像 Emoji（備用）</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AVATAR_EMOJIS.map(e => (
                <button key={e} onClick={() => setAvatar(e)} style={{ width: 36, height: 36, borderRadius: "50%", border: avatar === e ? "2px solid #3b82f6" : "2px solid #334155", background: color, cursor: "pointer", fontSize: 18 }}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6, display: "block" }}>頭像顏色</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4, display: "block" }}>暱稱</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4, display: "block" }}>個性簽名（最多 20 字）</label>
            <input value={signature} onChange={e => setSignature(e.target.value.slice(0, 20))} placeholder="屬於你的一句話..."
              style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <div style={{ textAlign: "right", fontSize: 11, color: "#475569", marginTop: 3 }}>{signature.length} / 20</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4, display: "block" }}>個人簡介</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="介紹一下自己..." style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4, display: "block" }}>狀態訊息</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {STATUS_EMOJIS.map(e => <button key={e} onClick={() => setStatusText(p => p + e)} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>{e}</button>)}
            </div>
            <input value={statusText} onChange={e => setStatusText(e.target.value)} placeholder="現在的狀態..." style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4, display: "block" }}>上線狀態</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["online","線上"],["away","暫離"],["dnd","勿擾"],["offline","離線"]].map(([s,l]) => (
                <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "8px 0", border: status === s ? `2px solid ${getStatus(s).color}` : "1px solid #334155", borderRadius: 8, background: status === s ? `${getStatus(s).color}22` : "#0f172a", color: status === s ? getStatus(s).color : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </div>
          {friendList.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8, display: "block" }}>好友列表 ({friendList.length})</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {friendList.map(f => (
                  <div key={f.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0f172a", borderRadius: 10, border: "1px solid #334155" }}>
                    <AvatarImg avatarImage={f.avatarImage} avatar={f.avatar} color={f.color} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{f.nickname}</div>
                      <div style={{ fontSize: 11, color: getStatus(f.status).color }}>{getStatus(f.status).label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8, display: "block" }}>個人頁面背景</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {PROFILE_GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => { setProfileBg(g); setProfileBgType("gradient"); }}
                  style={{ width: 32, height: 32, borderRadius: 8, background: g, border: profileBg === g && profileBgType === "gradient" ? "3px solid #fff" : "2px solid transparent", cursor: "pointer", flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => bgFileRef.current?.click()} disabled={bgUploading}
                style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "7px 12px", color: "#94a3b8", cursor: bgUploading ? "default" : "pointer", fontSize: 13 }}>
                {bgUploading ? "上傳中..." : "🖼️ 上傳背景圖片"}
              </button>
              {profileBgType === "image" && (
                <button onClick={() => { setProfileBg(PROFILE_GRADIENTS[0]); setProfileBgType("gradient"); }}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12 }}>✕ 移除圖片</button>
              )}
              <input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBgUploading(true);
                try {
                  const url = await uploadToR2(file);
                  setProfileBg(url);
                  setProfileBgType("image");
                } catch {
                  alert("背景上傳失敗，請重試");
                } finally {
                  setBgUploading(false);
                  e.target.value = "";
                }
              }} />
            </div>
          </div>
          <button onClick={() => onSave({ nickname, bio, avatar, color, statusText, status, signature, profileBg, profileBgType })} style={{ width: "100%", background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", border: "none", borderRadius: 10, padding: "12px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FriendSearch ─────────────────────────────────────────────────────────────

function FriendSearch({ myUid, myProfile, onClose, onSendRequest }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = searchText.trim();
        const found = {};
        const emailSnap = await getDocs(query(collection(db, 'users'), where('email', '==', q)));
        emailSnap.docs.forEach(d => { found[d.id] = { uid: d.id, ...d.data() }; });
        const nickSnap = await getDocs(query(collection(db, 'users'), where('nickname', '>=', q), where('nickname', '<=', q + ''), limit(10)));
        nickSnap.docs.forEach(d => { found[d.id] = { uid: d.id, ...d.data() }; });
        const filtered = Object.values(found).filter(u =>
          u.uid !== myUid &&
          !(myProfile.friends || []).includes(u.uid) &&
          !(myProfile.pendingOut || []).includes(u.uid)
        );
        setResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, myUid, myProfile.friends, myProfile.pendingOut]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#1e293b", borderRadius: 20, width: 520, maxWidth: "95vw", border: "1px solid #334155", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#e2e8f0", margin: 0, fontSize: 20, fontWeight: 700 }}>搜尋並加好友</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="輸入暱稱或電子郵件..."
          style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: "13px 16px", color: "#e2e8f0", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
        {searching && <div style={{ textAlign: "center", color: "#64748b", fontSize: 16 }}>搜尋中...</div>}
        {!searching && results.length === 0 && searchText && <div style={{ textAlign: "center", color: "#64748b", fontSize: 16, padding: "16px 0" }}>找不到用戶</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map(u => (
            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#0f172a", borderRadius: 12, border: "1px solid #334155" }}>
              <AvatarImg avatarImage={u.avatarImage} avatar={u.avatar} color={u.color} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 16 }}>{u.nickname}</div>
                {u.signature && <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>{u.signature}</div>}
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{u.email}</div>
              </div>
              <button onClick={() => onSendRequest(u.uid)} style={{ background: "#7c3aed", border: "none", borderRadius: 10, padding: "9px 18px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>加好友</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FriendRequests ────────────────────────────────────────────────────────────

function FriendRequests({ myProfile, onAccept, onDecline, onClose }) {
  const [pendingProfiles, setPendingProfiles] = useState([]);

  useEffect(() => {
    const uids = myProfile.pendingIn || [];
    if (!uids.length) { setPendingProfiles([]); return; }
    Promise.all(uids.map(uid => getDoc(doc(db, 'users', uid)))).then(snaps => {
      setPendingProfiles(snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })));
    });
  }, [(myProfile.pendingIn || []).join(',')]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#1e293b", borderRadius: 16, width: 380, border: "1px solid #334155", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "#e2e8f0", margin: 0, fontSize: 16, fontWeight: 700 }}>好友邀請 ({pendingProfiles.length})</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {pendingProfiles.length === 0 && <div style={{ textAlign: "center", color: "#64748b", fontSize: 14, padding: "20px 0" }}>沒有待處理的邀請</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendingProfiles.map(u => (
            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "#0f172a", borderRadius: 10, border: "1px solid #334155" }}>
              <AvatarImg avatarImage={u.avatarImage} avatar={u.avatar} color={u.color} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>{u.nickname}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>想加你為好友</div>
              </div>
              <button onClick={() => onAccept(u.uid)} style={{ background: "#22c55e", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 4 }}>✓</button>
              <button onClick={() => onDecline(u.uid)} style={{ background: "#ef4444", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✗</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CreateGroupModal ──────────────────────────────────────────────────────────

function CreateGroupModal({ friends, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);

  const toggle = (uid) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#1e293b", borderRadius: 20, width: 400, maxHeight: "80vh", overflow: "auto", border: "1px solid #334155", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#e2e8f0", margin: 0, fontSize: 18, fontWeight: 700 }}>創建群組</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 6, display: "block" }}>群組名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="輸入群組名稱..."
            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8, display: "block" }}>加入成員（從好友中選擇）</label>
          {friends.length === 0 && <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>先加好友才能建立群組</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map(f => (
              <button key={f.uid} onClick={() => toggle(f.uid)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: selected.includes(f.uid) ? "#7c3aed" : "#0f172a", border: `1px solid ${selected.includes(f.uid) ? "#8b5cf6" : "#334155"}`, borderRadius: 10, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <AvatarImg avatarImage={f.avatarImage} avatar={f.avatar} color={f.color} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>{f.nickname}</div>
                </div>
                <span style={{ color: selected.includes(f.uid) ? "#93c5fd" : "#475569", fontSize: 18 }}>
                  {selected.includes(f.uid) ? "✓" : "+"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => name.trim() && onCreate(name.trim(), selected)}
          disabled={!name.trim()}
          style={{ width: "100%", background: name.trim() ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "#1e293b", border: "none", borderRadius: 10, padding: "12px", color: name.trim() ? "#fff" : "#475569", fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "default" }}>
          創建群組 （{1 + selected.length} 人）
        </button>
      </div>
    </div>
  );
}

// ── RankBadge ─────────────────────────────────────────────────────────────────

function RankBadge({ rank, size = 32 }) {
  const bg =
    rank === 1 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" :
    rank === 2 ? "linear-gradient(135deg,#94a3b8,#cbd5e1)" :
    rank === 3 ? "linear-gradient(135deg,#d97706,#b45309)" :
               "linear-gradient(135deg,#334155,#475569)";
  return (
    <div style={{ width: size * 1.6, height: size, borderRadius: size * 0.5, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
      {rank}
    </div>
  );
}

// ── DonateModal ───────────────────────────────────────────────────────────────

function DonateModal({ myProfile, onClose }) {
  const [amount, setAmount] = useState(50);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalAmount = useCustom ? (parseInt(customInput, 10) || 0) : amount;

  const handleDonate = async () => {
    if (finalAmount < 1) { alert("請輸入有效金額（最少 HK$1）"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: myProfile.uid,
          userNickname: myProfile.nickname || "",
          userAvatar: myProfile.avatar || "",
          userColor: myProfile.color || "",
          userAvatarImage: myProfile.avatarImage || "",
          amount: finalAmount,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("錯誤：" + (data.error || "建立付款失敗"));
    } catch {
      alert("網絡錯誤，請重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#1e293b", borderRadius: 20, width: 380, border: "1px solid #334155", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>💝 選擇打賞金額</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          {[10, 30, 50, 100].map(a => (
            <button key={a} onClick={() => { setAmount(a); setUseCustom(false); }}
              style={{ flex: "1 1 70px", padding: "12px 0", borderRadius: 12, border: !useCustom && amount === a ? "2px solid #f59e0b" : "2px solid #334155", background: !useCustom && amount === a ? "rgba(245,158,11,0.15)" : "#0f172a", color: !useCustom && amount === a ? "#fbbf24" : "#94a3b8", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              HK${a}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: useCustom ? "#fbbf24" : "#64748b", fontWeight: 700, fontSize: 15, pointerEvents: "none" }}>HK$</span>
            <input
              type="number" min="1" placeholder="自訂金額"
              value={customInput}
              onChange={e => { setCustomInput(e.target.value); setUseCustom(true); }}
              onFocus={() => setUseCustom(true)}
              style={{ width: "100%", background: useCustom ? "rgba(245,158,11,0.1)" : "#0f172a", border: useCustom ? "2px solid #f59e0b" : "2px solid #334155", borderRadius: 12, padding: "12px 14px 12px 52px", color: "#e2e8f0", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <button onClick={handleDonate} disabled={loading || finalAmount < 1}
          style={{ width: "100%", background: finalAmount >= 1 && !loading ? "linear-gradient(135deg,#f59e0b,#d97706)" : "#334155", border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: finalAmount >= 1 && !loading ? "pointer" : "default", transition: "all 0.15s" }}>
          {loading ? "處理中..." : finalAmount >= 1 ? `💝 立即打賞 HK$${finalAmount}` : "💝 立即打賞"}
        </button>
        <div style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 10 }}>支援信用卡、支付寶、微信支付、Apple Pay</div>
      </div>
    </div>
  );
}

// ── Main ChatApp ──────────────────────────────────────────────────────────────

export default function ChatApp({ user }) {
  const uid = user.uid;

  const [myProfile,      setMyProfile]      = useState(null);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [hallMessages,   setHallMessages]   = useState([]);
  const [privateMessages,setPrivateMessages]= useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [hallInput,      setHallInput]      = useState("");
  const [privateInput,   setPrivateInput]   = useState("");
  const [hallUploading,  setHallUploading]  = useState(false);
  const [privateUploading, setPrivateUploading] = useState(false);
  const [showProfile,    setShowProfile]    = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showFriendReqs,   setShowFriendReqs]   = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [contextMenu,    setContextMenu]    = useState(null);
  const [friendInfo,     setFriendInfo]     = useState(null);

  // Group states
  const [myGroups,       setMyGroups]       = useState([]);
  const [activeGroupId,  setActiveGroupId]  = useState(null);
  const [groupMessages,  setGroupMessages]  = useState([]);
  const [showCreateGroup,setShowCreateGroup]= useState(false);
  const [groupInput,     setGroupInput]     = useState("");
  const [groupUploading, setGroupUploading] = useState(false);

  // Leaderboard states
  const [showLeaderboard,  setShowLeaderboard]  = useState(false);
  const [donations,        setDonations]        = useState([]);
  const [showDonateModal,  setShowDonateModal]  = useState(false);

  // AI Companion states
  const [activeCompanion,   setActiveCompanion]   = useState(null);
  const [companionMessages, setCompanionMessages] = useState([]);
  const [companionMessagesLoaded, setCompanionMessagesLoaded] = useState(false);
  const [companionInput,    setCompanionInput]    = useState("");
  const [companionTyping,   setCompanionTyping]   = useState(false);
  const [fatherBriefLoading, setFatherBriefLoading] = useState(false);
  const fatherBriefPostingRef = useRef(false);
  const companionMessagesRef = useRef([]);

  function hasFatherBriefForToday(messages, dateKey) {
    const label = dateKey.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日`);
    return messages.some(
      (m) =>
        m.senderId === "aifather" &&
        (m.briefDate === dateKey ||
          (m.dailyBrief === true && m.briefDate) ||
          (typeof m.text === "string" && m.text.includes("爸爸今日財經總結") && m.text.includes(label)))
    );
  }

  async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } finally {
      clearTimeout(timer);
    }
  }
  // 用跟真人好友私訊完全相同的 ID 規則（[uid, 對方id].sort().join('_')），
  // 這樣既有的 private_chats 安全規則不需要另外調整就能套用在 AI 陪伴聊天上。
  const companionChatId = activeCompanion ? [uid, `ai${activeCompanion}`].sort().join('_') : null;

  // AI News states
  const [showAiNews,   setShowAiNews]   = useState(false);
  const [aiNewsItems,  setAiNewsItems]  = useState([]);
  const [aiNewsLoading, setAiNewsLoading] = useState(false);
  const [aiNewsError,  setAiNewsError]  = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => {
      setIsMobile(mq.matches);
      if (!mq.matches) setMobileShowChat(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const openMobileChat = useCallback(() => {
    if (isMobile) setMobileShowChat(true);
  }, [isMobile]);

  const loadAiNews = useCallback(async () => {
    setAiNewsLoading(true);
    setAiNewsError(false);
    try {
      const res = await fetch("/api/ai-news");
      const data = await res.json();
      setAiNewsItems(data.items || []);
    } catch (err) {
      console.error("[ai-news] fetch failed:", err);
      setAiNewsError(true);
    } finally {
      setAiNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showAiNews && aiNewsItems.length === 0 && !aiNewsLoading) {
      loadAiNews();
    }
  }, [showAiNews, aiNewsItems.length, aiNewsLoading, loadAiNews]);

  // AI 語音報導：用瀏覽器內建的語音合成朗讀新聞，不需要任何 API 金鑰
  const [speakingIndex, setSpeakingIndex] = useState(null); // null | 'all' | 數字索引
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [zhVoices, setZhVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");

  // 讓瀏覽器盡早載入語音清單，避免第一次播放時 getVoices() 還是空的（Chrome 常見狀況）
  useEffect(() => {
    if (!speechSupported) return;
    const isZh = (v) => v.lang === "zh-TW" || v.lang === "zh-HK" || v.lang?.startsWith("zh");
    const refresh = () => setZhVoices(window.speechSynthesis.getVoices().filter(isZh));
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, [speechSupported]);

  const pickBestZhVoice = useCallback(() => {
    if (selectedVoiceURI) {
      const chosen = zhVoices.find(v => v.voiceURI === selectedVoiceURI);
      if (chosen) return chosen;
    }
    if (!zhVoices.length) return null;
    const isHighQuality = (v) => /natural|online|neural/i.test(v.name || "");
    // 雲端語音（localService === false）通常比本機系統語音自然許多，優先選用
    const isCloud = (v) => v.localService === false;
    return (
      zhVoices.find(v => v.lang === "zh-TW" && (isHighQuality(v) || isCloud(v))) ||
      zhVoices.find(v => isHighQuality(v) || isCloud(v)) ||
      zhVoices.find(v => v.lang === "zh-TW") ||
      zhVoices.find(v => v.lang === "zh-HK") ||
      zhVoices[0] ||
      null
    );
  }, [zhVoices, selectedVoiceURI]);

  const speakText = useCallback((text, onEnd) => {
    if (!speechSupported || !text) { onEnd?.(); return; }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-TW";
    const zhVoice = pickBestZhVoice();
    if (zhVoice) utter.voice = zhVoice;
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }, [speechSupported, pickBestZhVoice]);

  const stopSpeaking = useCallback(() => {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  }, [speechSupported]);

  const speakItem = useCallback((item, idx) => {
    if (!speechSupported) { alert("此瀏覽器不支援語音播放功能"); return; }
    window.speechSynthesis.cancel();
    setSpeakingIndex(idx);
    speakText(`${item.titleZh || item.title}。${item.summaryZh || ""}`, () => setSpeakingIndex(null));
  }, [speechSupported, speakText]);

  const speakAllNews = useCallback(() => {
    if (!speechSupported) { alert("此瀏覽器不支援語音播放功能"); return; }
    if (aiNewsItems.length === 0) return;
    window.speechSynthesis.cancel();
    setSpeakingIndex('all');
    let i = 0;
    const next = () => {
      if (i >= aiNewsItems.length) { setSpeakingIndex(null); return; }
      const item = aiNewsItems[i];
      i += 1;
      speakText(`第 ${i} 則，${item.titleZh || item.title}。${item.summaryZh || ""}`, next);
    };
    next();
  }, [speechSupported, aiNewsItems, speakText]);

  useEffect(() => {
    if (!showAiNews) stopSpeaking();
  }, [showAiNews, stopSpeaking]);

  // Cinema states
  const [showCinema,       setShowCinema]       = useState(false);
  const [cinemaView,       setCinemaView]       = useState('list');
  const [cinemaRooms,      setCinemaRooms]      = useState([]);
  const [activeCinemaRoom, setActiveCinemaRoom] = useState(null);
  const [cinemaComments,   setCinemaComments]   = useState([]);
  const [cinemaInput,      setCinemaInput]      = useState('');
  const [isHosting,        setIsHosting]        = useState(false);
  const [screenStream,     setScreenStream]     = useState(null);
  const [remoteStream,     setRemoteStream]     = useState(null);
  const [cinemaTitleInput, setCinemaTitleInput] = useState('');
  const [showCreateCinema, setShowCreateCinema] = useState(false);
  const [cinemaViewerCount, setCinemaViewerCount] = useState(0);

  const messagesEndRef = useRef(null);
  const loadedFriendIds = useRef(new Set());
  const hallFileRef = useRef(null);
  const privateFileRef = useRef(null);
  const groupFileRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const myPeerRef = useRef(null);
  const cinemaCommentsEndRef = useRef(null);
  const signalUnsubRef = useRef(null);
  const commentsUnsubRef = useRef(null);
  const viewersUnsubRef = useRef(null);

  const chatId = activeFriendId ? [uid, activeFriendId].sort().join('_') : null;

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  useEffect(() => {
    return onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) setMyProfile({ uid, ...snap.data() });
    });
  }, [uid]);

  // 好友邀請即時提示：偵測 pendingIn 陣列新增了誰，跳出提示卡而不是要打開面板才看得到
  const [friendReqToast, setFriendReqToast] = useState(null);
  const prevPendingInRef = useRef(null);
  const pendingInKey = (myProfile?.pendingIn || []).join(',');
  useEffect(() => {
    if (!myProfile) return;
    const current = myProfile.pendingIn || [];
    if (prevPendingInRef.current === null) {
      prevPendingInRef.current = current;
      return;
    }
    const prev = prevPendingInRef.current;
    const newOnes = current.filter(id => !prev.includes(id));
    prevPendingInRef.current = current;
    if (newOnes.length) {
      getDoc(doc(db, 'users', newOnes[0])).then(snap => {
        if (!snap.exists()) return;
        const u = snap.data();
        setFriendReqToast({ uid: newOnes[0], nickname: u.nickname, avatar: u.avatar, avatarImage: u.avatarImage, color: u.color });
        setTimeout(() => setFriendReqToast(cur => (cur?.uid === newOnes[0] ? null : cur)), 6000);
      }).catch(() => {});
    }
  }, [pendingInKey]);

  const friendsKey = myProfile?.friends?.join(',') || '';
  useEffect(() => {
    if (!myProfile?.friends?.length) return;
    const missing = myProfile.friends.filter(fid => !loadedFriendIds.current.has(fid));
    if (!missing.length) return;
    missing.forEach(fid => loadedFriendIds.current.add(fid));
    Promise.all(missing.map(fid => getDoc(doc(db, 'users', fid)))).then(snaps => {
      const profiles = {};
      snaps.forEach(s => { if (s.exists()) profiles[s.id] = { uid: s.id, ...s.data() }; });
      if (Object.keys(profiles).length) setFriendProfiles(prev => ({ ...prev, ...profiles }));
    });
  }, [friendsKey]);

  useEffect(() => {
    const q = query(collection(db, 'hall_messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setHallMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    if (!activeFriendId) { setPrivateMessages([]); return; }
    const q = query(collection(db, 'private_chats', chatId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setPrivateMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid, activeFriendId]);

  // AI Companion messages listener
  useEffect(() => {
    if (!activeCompanion) {
      setCompanionMessages([]);
      setCompanionMessagesLoaded(false);
      return;
    }
    setCompanionMessagesLoaded(false);
    const q = query(collection(db, 'private_chats', companionChatId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setCompanionMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCompanionMessagesLoaded(true);
    });
  }, [uid, activeCompanion]);

  useEffect(() => {
    companionMessagesRef.current = companionMessages;
  }, [companionMessages]);

  // 開啟 AI 爸爸時預熱財經新聞，並自動推送當日總結（每天一則）
  useEffect(() => {
    if (activeCompanion !== "father") {
      fatherBriefPostingRef.current = false;
      setFatherBriefLoading(false);
      return;
    }
    if (!companionChatId || !uid || !companionMessagesLoaded) return;

    const dateKey = getTaipeiDateKey();
    const msgs = companionMessagesRef.current;
    if (hasFatherBriefForToday(msgs, dateKey) || fatherBriefPostingRef.current) return;

    let cancelled = false;
    fatherBriefPostingRef.current = true;

    (async () => {
      setFatherBriefLoading(true);
      try {
        fetch("/api/finance-news").catch(() => {});
        const res = await fetchWithTimeout("/api/finance-daily-brief", {}, 25000);
        const data = await res.json();
        const parts = Array.isArray(data.parts) && data.parts.length ? data.parts : (data.summary ? [data.summary] : []);
        if (cancelled || !parts.length || !data.dateKey) return;

        if (hasFatherBriefForToday(companionMessagesRef.current, data.dateKey)) return;

        const meta = COMPANION_META.father;
        for (let i = 0; i < parts.length; i++) {
          if (cancelled) break;
          await addDoc(collection(db, "private_chats", companionChatId, "messages"), {
            senderId: "aifather",
            sender: meta.name,
            avatar: meta.avatar,
            senderAvatarImage: "",
            text: parts[i],
            dailyBrief: true,
            briefDate: data.dateKey,
            createdAt: serverTimestamp(),
          });
          if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 700));
        }
      } catch (err) {
        console.error("[father-daily-brief] auto-post failed:", err);
      } finally {
        fatherBriefPostingRef.current = false;
        if (!cancelled) setFatherBriefLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      setFatherBriefLoading(false);
    };
  }, [activeCompanion, companionChatId, uid, companionMessagesLoaded]);

  // Groups listener
  useEffect(() => {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', uid));
    return onSnapshot(q, snap => {
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  // Group messages listener
  useEffect(() => {
    if (!activeGroupId) { setGroupMessages([]); return; }
    const q = query(collection(db, 'groups', activeGroupId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setGroupMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [activeGroupId]);

  // ── 未讀訊息追蹤：分別訂閱每個好友 / 群組聊天室的最新一則訊息，跟自己讀到的時間比對 ──
  const [lastMsgByChat, setLastMsgByChat] = useState({});
  const friendIdsKey = (myProfile?.friends || []).join(',');
  useEffect(() => {
    const friendIds = friendIdsKey ? friendIdsKey.split(',') : [];
    if (!friendIds.length) return;
    const unsubs = friendIds.map(fid => {
      const cid = [uid, fid].sort().join('_');
      const q = query(collection(db, 'private_chats', cid, 'messages'), orderBy('createdAt', 'desc'), limit(1));
      return onSnapshot(q, snap => {
        const d = snap.docs[0];
        setLastMsgByChat(prev => ({
          ...prev,
          [`dm_${cid}`]: d ? { at: d.data().createdAt?.toMillis?.() || Date.now(), senderId: d.data().senderId } : null,
        }));
      }, () => {});
    });
    return () => unsubs.forEach(u => u());
  }, [friendIdsKey, uid]);

  const groupIdsKey = myGroups.map(g => g.id).join(',');
  useEffect(() => {
    const groupIds = groupIdsKey ? groupIdsKey.split(',') : [];
    if (!groupIds.length) return;
    const unsubs = groupIds.map(gid => {
      const q = query(collection(db, 'groups', gid, 'messages'), orderBy('createdAt', 'desc'), limit(1));
      return onSnapshot(q, snap => {
        const d = snap.docs[0];
        setLastMsgByChat(prev => ({
          ...prev,
          [`group_${gid}`]: d ? { at: d.data().createdAt?.toMillis?.() || Date.now(), senderId: d.data().senderId } : null,
        }));
      }, () => {});
    });
    return () => unsubs.forEach(u => u());
  }, [groupIdsKey]);

  // 進入某個對話時，把「已讀到」的時間戳記回自己的個人資料，讓側欄未讀角標即時消失
  useEffect(() => {
    if (!activeFriendId || !uid) return;
    const cid = [uid, activeFriendId].sort().join('_');
    updateDoc(doc(db, 'users', uid), { [`lastRead.dm_${cid}`]: Date.now() }).catch(() => {});
  }, [activeFriendId, uid, privateMessages.length]);

  useEffect(() => {
    if (!activeGroupId || !uid) return;
    updateDoc(doc(db, 'users', uid), { [`lastRead.group_${activeGroupId}`]: Date.now() }).catch(() => {});
  }, [activeGroupId, uid, groupMessages.length]);

  const isHallView = !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showAiNews && !activeCompanion;
  useEffect(() => {
    if (!isHallView || !uid || !hallMessages.length) return;
    updateDoc(doc(db, 'users', uid), { 'lastRead.hall': Date.now() }).catch(() => {});
  }, [isHallView, uid, hallMessages.length]);

  // Donations listener
  useEffect(() => {
    return onSnapshot(collection(db, 'donations'), snap => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Cinema rooms listener
  useEffect(() => {
    return onSnapshot(collection(db, 'cinemaRooms'), snap => {
      setCinemaRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Scroll cinema comments to bottom
  useEffect(() => {
    cinemaCommentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cinemaComments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hallMessages, privateMessages, groupMessages, companionMessages]);

  useEffect(() => {
    const onVisibility = () => {
      const s = document.visibilityState === "hidden" ? "offline" : "online";
      updateDoc(doc(db, "users", uid), { status: s });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [uid]);

  useEffect(() => {
    let timer;
    let isAway = false;
    const AWAY_MS = 15 * 60 * 1000;
    const reset = () => {
      clearTimeout(timer);
      if (isAway) { isAway = false; updateDoc(doc(db, "users", uid), { status: "online" }); }
      timer = setTimeout(() => { isAway = true; updateDoc(doc(db, "users", uid), { status: "away" }); }, AWAY_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => document.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => document.removeEventListener(e, reset)); };
  }, [uid]);

  // ── Firestore write helpers ────────────────────────────────────────────────

  const sendHall = useCallback(async () => {
    if (!hallInput.trim() || !myProfile) return;
    const text = hallInput.trim();
    setHallInput("");
    await addDoc(collection(db, 'hall_messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
  }, [hallInput, myProfile, uid]);

  const sendHallMedia = useCallback(async (file) => {
    if (!myProfile) return;
    setHallUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'hall_messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      alert("媒體上傳失敗，請重試");
    } finally {
      setHallUploading(false);
    }
  }, [myProfile, uid]);

  const sendPrivate = useCallback(async () => {
    if (!privateInput.trim() || !activeFriendId || !myProfile) return;
    const text = privateInput.trim();
    setPrivateInput("");
    await addDoc(collection(db, 'private_chats', chatId, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
  }, [privateInput, activeFriendId, myProfile, uid, chatId]);

  const sendCompanion = useCallback(async (overrideText) => {
    const text = (typeof overrideText === "string" ? overrideText : companionInput).trim();
    if (!text || !activeCompanion || !myProfile) return;
    const fromQuickAction = typeof overrideText === "string";
    if (!fromQuickAction) setCompanionInput("");
    const role = activeCompanion;
    const cid = companionChatId;
    const history = companionMessages.slice(-8).map(m => ({
      role: m.senderId === uid ? "user" : "assistant",
      text: m.text || "",
    }));
    await addDoc(collection(db, 'private_chats', cid, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
    setCompanionTyping(true);
    const meta = COMPANION_META[role];
    const requestTimeout = role === "artteacher" || role === "artstudent" ? 45000 : 28000;
    try {
      const res = await fetchWithTimeout("/api/ai-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, message: text, history, nickname: myProfile.nickname, userId: uid }),
      }, requestTimeout);
      const data = await res.json();
      let reply = data.reply || generateCompanionReply(role, text, myProfile.nickname);
      let feedPosted = data.designFeed?.posted;

      if (data.designFeed?.clientPublish && data.designFeed?.wroteVia === "client_pending") {
        try {
          await publishDesignFeedFromClient(data.designFeed.clientPublish);
          feedPosted = true;
        } catch (clientErr) {
          console.error("[design-feed-client] publish failed:", clientErr);
          reply += "\n\n⚠️ 作品發佈到動態消息失敗，可能是 Firebase 權限設定問題。";
        }
      }

      if (feedPosted && !reply.includes("動態消息")) {
        reply += "\n\n📋 作品已發到動態消息，請到左側「動態消息」查看 AI美術生的設計稿與我的審核。";
      } else if (data.designFeedTriggered && !feedPosted && !reply.includes("動態消息")) {
        reply += "\n\n📋 本時段已有作品，請到「動態消息」查看。";
      }
      await addDoc(collection(db, 'private_chats', cid, 'messages'), {
        senderId: `ai${role}`, sender: meta.name, avatar: meta.avatar,
        senderAvatarImage: "", text: reply, createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("[ai-companion] request failed:", err);
      const reply = generateCompanionReply(role, text, myProfile.nickname);
      await addDoc(collection(db, 'private_chats', cid, 'messages'), {
        senderId: `ai${role}`, sender: meta.name, avatar: meta.avatar,
        senderAvatarImage: "", text: reply, createdAt: serverTimestamp(),
      });
    } finally {
      setCompanionTyping(false);
    }
  }, [companionInput, activeCompanion, myProfile, uid, companionChatId, companionMessages]);

  const sendPrivateMedia = useCallback(async (file) => {
    if (!activeFriendId || !myProfile) return;
    setPrivateUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'private_chats', chatId, 'messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      alert("媒體上傳失敗，請重試");
    } finally {
      setPrivateUploading(false);
    }
  }, [activeFriendId, myProfile, uid, chatId]);

  const sendGroup = useCallback(async () => {
    if (!groupInput.trim() || !activeGroupId || !myProfile) return;
    const text = groupInput.trim();
    setGroupInput("");
    await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, imageUrl: "", videoUrl: "", createdAt: serverTimestamp(),
    });
  }, [groupInput, activeGroupId, myProfile, uid]);

  const sendGroupMedia = useCallback(async (file) => {
    if (!activeGroupId || !myProfile) return;
    setGroupUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      alert("媒體上傳失敗，請重試");
    } finally {
      setGroupUploading(false);
    }
  }, [activeGroupId, myProfile, uid]);

  const handleSaveProfile = useCallback(async (patch) => {
    await updateDoc(doc(db, 'users', uid), patch);
    setShowProfile(false);
  }, [uid]);

  const handleSendFriendRequest = useCallback(async (targetUid) => {
    await updateDoc(doc(db, 'users', uid),       { pendingOut: arrayUnion(targetUid) });
    await updateDoc(doc(db, 'users', targetUid), { pendingIn:  arrayUnion(uid) });
    setShowFriendSearch(false);
  }, [uid]);

  const handleAcceptFriend = useCallback(async (fromUid) => {
    await updateDoc(doc(db, 'users', uid),     { friends: arrayUnion(fromUid), pendingIn:  arrayRemove(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(uid),     pendingOut: arrayRemove(uid) });
  }, [uid]);

  const handleDeclineFriend = useCallback(async (fromUid) => {
    await updateDoc(doc(db, 'users', uid),     { pendingIn:  arrayRemove(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { pendingOut: arrayRemove(uid) });
  }, [uid]);

  const handleCreateGroup = useCallback(async (name, memberUids) => {
    const members = [uid, ...memberUids];
    const ref = await addDoc(collection(db, 'groups'), {
      name,
      avatar: "👥",
      members,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    setActiveGroupId(ref.id);
    setActiveFriendId(null);
    setShowLeaderboard(false);
    setShowCinema(false);
    setShowAiNews(false);
    setActiveCompanion(null);
    setShowCreateGroup(false);
  }, [uid]);

  // ── Cinema / WebRTC ───────────────────────────────────────────────────────────

  const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const startHostSignaling = (roomId, stream) => {
    const q = query(collection(db, 'cinemaRooms', roomId, 'signals'), where('type', '==', 'offer'));
    signalUnsubRef.current = onSnapshot(q, async snap => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const { viewerId, data } = change.doc.data();
        if (peerConnectionsRef.current[viewerId]) continue;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[viewerId] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = async ({ candidate }) => {
          if (candidate) await addDoc(collection(db, 'cinemaRooms', roomId, 'signals'), {
            type: 'host-ice', viewerId, data: candidate.toJSON(), createdAt: serverTimestamp(),
          });
        };
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await addDoc(collection(db, 'cinemaRooms', roomId, 'signals'), {
          type: 'answer', viewerId, data: { type: answer.type, sdp: answer.sdp }, createdAt: serverTimestamp(),
        });
        const iceQ = query(collection(db, 'cinemaRooms', roomId, 'signals'),
          where('type', '==', 'viewer-ice'), where('viewerId', '==', viewerId));
        onSnapshot(iceQ, iceSnap => {
          iceSnap.docChanges().forEach(async ch => {
            if (ch.type === 'added') { try { await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data().data)); } catch {} }
          });
        });
      }
    });
  };

  const createCinemaRoom = async () => {
    if (!cinemaTitleInput.trim() || !myProfile) return;
    const roomRef = await addDoc(collection(db, 'cinemaRooms'), {
      hostId: uid, hostNickname: myProfile.nickname, hostAvatar: myProfile.avatar,
      hostColor: myProfile.color, hostAvatarImage: myProfile.avatarImage || '',
      title: cinemaTitleInput.trim(), isLive: true, createdAt: serverTimestamp(),
    });
    const room = { id: roomRef.id, hostId: uid, title: cinemaTitleInput.trim(), hostNickname: myProfile.nickname, hostAvatar: myProfile.avatar, hostColor: myProfile.color, hostAvatarImage: myProfile.avatarImage || '' };
    setIsHosting(true);
    setActiveCinemaRoom(room);
    setCinemaView('room');
    setShowCreateCinema(false);
    setCinemaTitleInput('');
    commentsUnsubRef.current = onSnapshot(
      query(collection(db, 'cinemaRooms', roomRef.id, 'comments'), orderBy('createdAt')),
      snap => setCinemaComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    await setDoc(doc(db, 'cinemaRooms', roomRef.id, 'viewers', uid), { nickname: myProfile.nickname, joinedAt: serverTimestamp() });
    viewersUnsubRef.current = onSnapshot(
      collection(db, 'cinemaRooms', roomRef.id, 'viewers'),
      snap => setCinemaViewerCount(snap.size)
    );
  };

  const startHostStream = async () => {
    if (!activeCinemaRoom) return;
    let stream;
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); }
    catch { return; }
    setScreenStream(stream);
    setTimeout(() => { if (localVideoRef.current) localVideoRef.current.srcObject = stream; }, 100);
    stream.getVideoTracks()[0].onended = () => leaveCinemaRoom(activeCinemaRoom.id, true);
    startHostSignaling(activeCinemaRoom.id, stream);
  };

  const joinCinemaRoom = async (room) => {
    setActiveCinemaRoom(room);
    setCinemaView('room');
    commentsUnsubRef.current = onSnapshot(
      query(collection(db, 'cinemaRooms', room.id, 'comments'), orderBy('createdAt')),
      snap => setCinemaComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    await setDoc(doc(db, 'cinemaRooms', room.id, 'viewers', uid), { nickname: myProfile?.nickname || '', joinedAt: serverTimestamp() });
    viewersUnsubRef.current = onSnapshot(
      collection(db, 'cinemaRooms', room.id, 'viewers'),
      snap => setCinemaViewerCount(snap.size)
    );
    if (room.hostId === uid) return;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    myPeerRef.current = pc;
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      setTimeout(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; }, 100);
    };
    pc.onicecandidate = async ({ candidate }) => {
      if (candidate) await addDoc(collection(db, 'cinemaRooms', room.id, 'signals'), {
        type: 'viewer-ice', viewerId: uid, data: candidate.toJSON(), createdAt: serverTimestamp(),
      });
    };
    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await addDoc(collection(db, 'cinemaRooms', room.id, 'signals'), {
      type: 'offer', viewerId: uid, data: { type: offer.type, sdp: offer.sdp }, createdAt: serverTimestamp(),
    });
    const answerQ = query(collection(db, 'cinemaRooms', room.id, 'signals'),
      where('type', '==', 'answer'), where('viewerId', '==', uid));
    const answerUnsub = onSnapshot(answerQ, async snap => {
      if (snap.empty || pc.remoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(snap.docs[0].data().data));
      answerUnsub();
    });
    const hostIceQ = query(collection(db, 'cinemaRooms', room.id, 'signals'),
      where('type', '==', 'host-ice'), where('viewerId', '==', uid));
    onSnapshot(hostIceQ, snap => {
      snap.docChanges().forEach(async ch => {
        if (ch.type === 'added') { try { await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data().data)); } catch {} }
      });
    });
  };

  const leaveCinemaRoom = async (roomId, asHost = false) => {
    if (myPeerRef.current) { myPeerRef.current.close(); myPeerRef.current = null; }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); }
    setScreenStream(null);
    setRemoteStream(null);
    const rid = roomId || activeCinemaRoom?.id;
    if (rid) { try { await deleteDoc(doc(db, 'cinemaRooms', rid, 'viewers', uid)); } catch {} }
    if (asHost) {
      if (rid) { try { await deleteDoc(doc(db, 'cinemaRooms', rid)); } catch {} }
    }
    if (signalUnsubRef.current) { signalUnsubRef.current(); signalUnsubRef.current = null; }
    if (commentsUnsubRef.current) { commentsUnsubRef.current(); commentsUnsubRef.current = null; }
    if (viewersUnsubRef.current) { viewersUnsubRef.current(); viewersUnsubRef.current = null; }
    setIsHosting(false);
    setActiveCinemaRoom(null);
    setCinemaComments([]);
    setCinemaInput('');
    setCinemaViewerCount(0);
    setCinemaView('list');
  };

  const sendCinemaComment = async () => {
    if (!cinemaInput.trim() || !activeCinemaRoom || !myProfile) return;
    const text = cinemaInput.trim();
    setCinemaInput('');
    await addDoc(collection(db, 'cinemaRooms', activeCinemaRoom.id, 'comments'), {
      userId: uid, userNickname: myProfile.nickname, userAvatar: myProfile.avatar,
      userColor: myProfile.color, text, createdAt: serverTimestamp(),
    });
  };

  if (!myProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b" }}>載入中...</div>
      </div>
    );
  }

  const activeFriendProfile = activeFriendId ? friendProfiles[activeFriendId] : null;
  const myFriends = (myProfile.friends || [])
    .map(fid => friendProfiles[fid])
    .filter(f => f && (!searchQuery || f.nickname.toLowerCase().includes(searchQuery.toLowerCase())));
  const pendingInCount = (myProfile.pendingIn || []).length;
  const activeGroup = activeGroupId ? myGroups.find(g => g.id === activeGroupId) : null;

  // 未讀狀態判斷：最新一則訊息不是自己發的，且比自己記錄的已讀時間還新
  const isChatUnread = (key, lastAtOverride) => {
    const lm = lastAtOverride !== undefined ? lastAtOverride : lastMsgByChat[key];
    if (!lm || lm.senderId === uid) return false;
    const readAt = myProfile.lastRead?.[key] || 0;
    return lm.at > readAt;
  };
  const hallLastMsg = hallMessages.length ? hallMessages[hallMessages.length - 1] : null;
  const hallUnread = !isHallView && hallLastMsg
    ? isChatUnread('hall', { at: hallLastMsg.createdAt?.toMillis?.() || Date.now(), senderId: hallLastMsg.senderId })
    : false;

  const leaderboard = Object.values(
    donations.reduce((acc, d) => {
      if (!acc[d.userId]) acc[d.userId] = { userId: d.userId, userNickname: d.userNickname, userAvatar: d.userAvatar, userColor: d.userColor, userAvatarImage: d.userAvatarImage, total: 0 };
      acc[d.userId].total += (d.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .fb:hover { background: #2e1065 !important; }
        .fb.act  { background: #7c3aed !important; }
        .sb:hover:not(:disabled) { background: #7c3aed !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .chat-layout { height: 100dvh; }
        .chat-sidebar { min-height: 0; }
        .chat-sidebar-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        @media (max-width: 768px) {
          .chat-sidebar { width: 100% !important; max-width: 100%; }
          .chat-main { display: none !important; min-width: 0 !important; width: 100%; flex: 1; }
          .chat-calendar { display: none !important; }
          .chat-layout.mobile-show-chat .chat-sidebar { display: none !important; }
          .chat-layout.mobile-show-chat .chat-main {
            display: flex !important;
            flex-direction: column;
            width: 100%;
            min-width: 0;
            flex: 1;
          }
        }
      `}</style>

      {showProfile    && <ProfilePage myProfile={myProfile} friendProfiles={friendProfiles} onSave={handleSaveProfile} onClose={() => setShowProfile(false)} />}
      {showFriendSearch && <FriendSearch myUid={uid} myProfile={myProfile} onClose={() => setShowFriendSearch(false)} onSendRequest={handleSendFriendRequest} />}
      {showFriendReqs && <FriendRequests myProfile={myProfile} onAccept={handleAcceptFriend} onDecline={handleDeclineFriend} onClose={() => setShowFriendReqs(false)} />}
      {showCreateGroup && <CreateGroupModal friends={myFriends} onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />}
      {showDonateModal && <DonateModal myProfile={myProfile} onClose={() => setShowDonateModal(false)} />}

      {/* 好友邀請即時提示卡 */}
      {friendReqToast && (
        <div onClick={() => { setShowFriendReqs(true); setFriendReqToast(null); }}
          style={{ position: "fixed", top: 20, right: 20, zIndex: 500, background: "#1e293b", border: "1px solid #7c3aed", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.5)", cursor: "pointer", animation: "toastIn 0.25s ease-out" }}>
          <style>{`@keyframes toastIn { from { opacity:0; transform: translateY(-10px);} to { opacity:1; transform: translateY(0);} }`}</style>
          <AvatarImg avatarImage={friendReqToast.avatarImage} avatar={friendReqToast.avatar} color={friendReqToast.color} size={40} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>📬 新的好友邀請</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{friendReqToast.nickname} 想加你為好友，點擊查看</div>
          </div>
          <button onClick={e => { e.stopPropagation(); setFriendReqToast(null); }}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, marginLeft: 4 }}>✕</button>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "4px 0", zIndex: 300, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <Link href={`/profile/${contextMenu.friend.uid}`} onClick={() => setContextMenu(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", color: "#e2e8f0", textDecoration: "none", fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.background = "#334155"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            🌐 顯示個人主頁
          </Link>
          <button onClick={() => { setFriendInfo(contextMenu.friend); setContextMenu(null); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", color: "#e2e8f0", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#334155"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            👤 個人資料
          </button>
          <div style={{ height: 1, background: "#334155", margin: "4px 0" }} />
          <button onClick={() => { setActiveFriendId(contextMenu.friend.uid); setActiveGroupId(null); setShowLeaderboard(false); setShowCinema(false); setShowAiNews(false); setActiveCompanion(null); setContextMenu(null); openMobileChat(); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", color: "#e2e8f0", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "#334155"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            💬 傳送訊息
          </button>
        </div>
      )}

      {/* Friend info card */}
      {friendInfo && (
        <div onClick={() => setFriendInfo(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1e293b", borderRadius: 20, width: 320, border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ background: friendInfo.profileBgType === "image" ? undefined : (friendInfo.profileBg || "linear-gradient(135deg,#1e3a5f,#2d1f6e)"), backgroundImage: friendInfo.profileBgType === "image" ? `url(${friendInfo.profileBg})` : undefined, backgroundSize: "cover", backgroundPosition: "center", height: 80, position: "relative" }}>
              <button onClick={() => setFriendInfo(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "0 20px 20px", marginTop: -30 }}>
              <AvatarImg avatarImage={friendInfo.avatarImage} avatar={friendInfo.avatar} color={friendInfo.color} size={60} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#e2e8f0" }}>{friendInfo.nickname}</div>
                {friendInfo.signature && <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic", marginTop: 2 }}>「{friendInfo.signature}」</div>}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: `${getStatus(friendInfo.status).color}22`, border: `1px solid ${getStatus(friendInfo.status).color}`, borderRadius: 20, padding: "2px 8px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: getStatus(friendInfo.status).color, display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: getStatus(friendInfo.status).color, fontWeight: 600 }}>{getStatus(friendInfo.status).label}</span>
                </div>
                {friendInfo.statusText && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{friendInfo.statusText}</div>}
                {friendInfo.bio && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 10, lineHeight: 1.6 }}>{friendInfo.bio}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => { setActiveFriendId(friendInfo.uid); setActiveGroupId(null); setShowLeaderboard(false); setShowCinema(false); setShowAiNews(false); setActiveCompanion(null); setFriendInfo(null); openMobileChat(); }}
                  style={{ flex: 1, background: "#7c3aed", border: "none", borderRadius: 10, padding: "9px 0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  💬 傳訊息
                </button>
                <Link href={`/profile/${friendInfo.uid}`} onClick={() => setFriendInfo(null)}
                  style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "9px 0", color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  🌐 主頁
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`chat-layout${isMobile && mobileShowChat ? " mobile-show-chat" : ""}`} style={{ display: "flex", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Inter','Helvetica Neue',sans-serif", overflow: "hidden" }}>

        {/* ── Sidebar ── */}
        <div className="chat-sidebar" style={{ width: 280, background: "#0f172a", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0, height: "100%" }}>

          {/* My info */}
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setShowProfile(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
                <AvatarImg avatarImage={myProfile.avatarImage} avatar={myProfile.avatar} color={myProfile.color} size={42} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/profile/${uid}`} style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", display: "block" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#93c5fd"}
                  onMouseLeave={e => e.currentTarget.style.color = "#e2e8f0"}>
                  {myProfile.nickname}
                </Link>
                {myProfile.signature && <div style={{ fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{myProfile.signature}</div>}
                {myProfile.statusText && <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile.statusText}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setShowProfile(true)} title="個人設定" style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6 }}>⚙️</button>
                <button onClick={() => auth.signOut()} title="登出" style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6 }}>🚪</button>
              </div>
            </div>
          </div>

          <div className="chat-sidebar-scroll">
          {/* Friend request banner */}
          {pendingInCount > 0 && (
            <button onClick={() => setShowFriendReqs(true)}
              style={{ margin: "8px 10px 0", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 10, padding: "10px 12px", color: "#fff", cursor: "pointer", width: "calc(100% - 20px)", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>📬</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>你有 {pendingInCount} 個好友邀請</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>點擊查看並接受</div>
              </div>
            </button>
          )}

          {/* Friend search box */}
          <div style={{ padding: "10px 12px 6px" }}>
            <input type="text" placeholder="搜尋好友..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "7px 12px", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Feed link */}
          <div style={{ padding: "4px 10px 0" }}>
            <Link href="/feed" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, background: "transparent", color: "#e2e8f0", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1e3a5f"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#ec4899,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>動態消息</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>貼文與留言</div>
              </div>
            </Link>
          </div>

          {/* Hall button */}
          <div style={{ padding: "4px 10px 0" }}>
            <button onClick={() => { setActiveFriendId(null); setActiveGroupId(null); setShowLeaderboard(false); setShowCinema(false); setShowAiNews(false); setActiveCompanion(null); openMobileChat(); }} className={`fb ${!activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showAiNews && !activeCompanion ? "act" : ""}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", background: !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showAiNews && !activeCompanion ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
                {hallUnread && <span style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid #0f172a" }} />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}># 公共大廳</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>公開頻道</div>
              </div>
            </button>
          </div>

          {/* Leaderboard button */}
          <div style={{ padding: "4px 10px 6px" }}>
            <button onClick={() => { setShowLeaderboard(true); setActiveFriendId(null); setActiveGroupId(null); setShowCinema(false); setShowAiNews(false); setActiveCompanion(null); openMobileChat(); }} className={`fb ${showLeaderboard ? "act" : ""}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", background: showLeaderboard ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#f59e0b,#fbbf24,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏆</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>打賞榜</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>打賞排行</div>
              </div>
            </button>
          </div>

          {/* Cinema button */}
          <div style={{ padding: "0 10px 6px" }}>
            <button onClick={() => { setShowCinema(true); setShowLeaderboard(false); setActiveFriendId(null); setActiveGroupId(null); setShowAiNews(false); setActiveCompanion(null); openMobileChat(); }} className={`fb ${showCinema ? "act" : ""}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", background: showCinema ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#4c1d95,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎬</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>電影院</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>螢幕分享直播</div>
              </div>
            </button>
          </div>

          {/* AI News button */}
          <div style={{ padding: "0 10px 6px" }}>
            <button onClick={() => { setShowAiNews(true); setShowCinema(false); setShowLeaderboard(false); setActiveFriendId(null); setActiveGroupId(null); setActiveCompanion(null); openMobileChat(); }} className={`fb ${showAiNews ? "act" : ""}`}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 10, border: "none", background: showAiNews ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>AI 新聞</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>每日 AI 資訊</div>
              </div>
            </button>
          </div>

          {/* AI Companion section */}
          <div style={{ padding: "0 12px 4px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>AI 陪伴</span>
          </div>
          <div style={{ padding: "0 8px 6px" }}>
            {["father", "mother", "brother", "artstudent", "artteacher"].map(role => {
              const meta = COMPANION_META[role];
              const isActive = activeCompanion === role;
              return (
                <button key={role} onClick={() => { setActiveCompanion(role); setActiveFriendId(null); setActiveGroupId(null); setShowLeaderboard(false); setShowCinema(false); setShowAiNews(false); openMobileChat(); }}
                  className={`fb ${isActive ? "act" : ""}`}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "none", background: isActive ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s", marginBottom: 2 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: meta.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{meta.avatar}</div>
                    <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #0f172a" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{meta.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>永遠都在，隨時可以聊</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Groups section */}
          <div style={{ padding: "0 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>群組 {myGroups.length}</span>
            <button onClick={() => setShowCreateGroup(true)} title="創建群組" style={{ background: "#334155", border: "none", borderRadius: 8, padding: "3px 8px", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>+</button>
          </div>
          <div style={{ padding: "0 8px 6px" }}>
            {myGroups.map(group => {
              const isActive = activeGroupId === group.id;
              const unread = !isActive && isChatUnread(`group_${group.id}`);
              return (
                <button key={group.id} onClick={() => { setActiveGroupId(group.id); setActiveFriendId(null); setShowLeaderboard(false); setShowCinema(false); setShowAiNews(false); setActiveCompanion(null); openMobileChat(); }}
                  className={`fb ${isActive ? "act" : ""}`}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "none", background: isActive ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s", marginBottom: 2 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#475569,#334155)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {group.avatar || "👥"}
                    </div>
                    {unread && <span style={{ position: "absolute", top: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid #0f172a" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: unread ? 800 : 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: unread ? "#fff" : "#e2e8f0" }}>{group.name}</div>
                    <div style={{ fontSize: 11, color: unread ? "#c4b5fd" : "#64748b" }}>{unread ? "有新訊息" : `${(group.members || []).length} 人`}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Friends header */}
          <div style={{ padding: "0 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase" }}>好友 {myFriends.length}</span>
            <div style={{ display: "flex", gap: 4 }}>
              {pendingInCount > 0 && (
                <button onClick={() => setShowFriendReqs(true)} title="好友邀請" style={{ background: "#ef4444", border: "none", borderRadius: 20, padding: "2px 8px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  📬 {pendingInCount}
                </button>
              )}
              <button onClick={() => setShowFriendSearch(true)} title="加好友" style={{ background: "#334155", border: "none", borderRadius: 8, padding: "3px 8px", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}>+</button>
            </div>
          </div>

          {/* Friend list */}
          <div style={{ padding: "0 8px 8px" }}>
            {myFriends.length === 0 && !searchQuery && (
              <div style={{ textAlign: "center", padding: "20px 12px", color: "#475569", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                還沒有好友<br />
                <button onClick={() => setShowFriendSearch(true)} style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", fontSize: 13, marginTop: 6 }}>點擊搜尋加好友</button>
              </div>
            )}
            {myFriends.map(friend => {
              const isActive = activeFriendId === friend.uid;
              const cid = [uid, friend.uid].sort().join('_');
              const unread = !isActive && isChatUnread(`dm_${cid}`);
              return (
                <button key={friend.uid} onClick={() => { setActiveFriendId(friend.uid); setActiveGroupId(null); setShowLeaderboard(false); setShowCinema(false); setShowAiNews(false); setActiveCompanion(null); openMobileChat(); }}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, friend }); }}
                  className={`fb ${isActive ? "act" : ""}`}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: "none", background: isActive ? "#7c3aed" : "transparent", color: "#e2e8f0", cursor: "pointer", textAlign: "left", transition: "background 0.15s", marginBottom: 2 }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <AvatarImg avatarImage={friend.avatarImage} avatar={friend.avatar} color={friend.color} size={36} />
                    <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: getStatus(friend.status).color, border: "2px solid #0f172a" }} />
                    {unread && <span style={{ position: "absolute", top: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid #0f172a" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: unread ? 800 : 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: unread ? "#fff" : "#e2e8f0" }}>{friend.nickname}</div>
                    <div style={{ fontSize: 11, color: unread ? "#c4b5fd" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {unread ? "有新訊息" : (friend.statusText || getStatus(friend.status).label)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="chat-main" style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0f1e", minWidth: 0 }}>
          {isMobile && mobileShowChat && (
            <div style={{ height: 44, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 12px", background: "#0f172a", flexShrink: 0 }}>
              <button onClick={() => setMobileShowChat(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "4px 8px" }}>← 返回列表</button>
            </div>
          )}

          {/* Leaderboard view */}
          {showLeaderboard && !activeFriendId && !activeGroupId && !activeCompanion && (
            <>
              <div style={{ flex: 1, overflowY: "auto", background: "linear-gradient(180deg,#08091a 0%,#0d0a28 60%,#0a0f1e 100%)", padding: "36px 28px 24px" }}>
                {/* Title */}
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#f8c94f", letterSpacing: 3, textShadow: "0 0 30px rgba(248,201,79,0.6), 0 0 60px rgba(248,201,79,0.3)" }}>
                    🏆 打賞榜 🏆
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5580", letterSpacing: 8, marginTop: 8, fontWeight: 700 }}>
                    TIPPING LEADERBOARD
                  </div>
                </div>

                {leaderboard.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
                    <div style={{ fontSize: 16, color: "#64748b" }}>還沒有人打賞</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: "#475569" }}>成為第一個打賞的人吧！</div>
                  </div>
                )}

                {/* All entries */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 700, margin: "0 auto" }}>
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    const suffix = rank === 1 ? "ST" : rank === 2 ? "ND" : rank === 3 ? "RD" : "TH";
                    const title = rank === 1 ? "CHAMPION" : rank === 2 ? "RUNNER-UP" : rank === 3 ? "THIRD" : `${rank}TH PLACE`;
                    const palette = [
                      { badge: "linear-gradient(135deg,#3b82f6,#6366f1)", card: "rgba(59,130,246,0.10)", border: "rgba(99,102,241,0.45)", glow: "rgba(99,102,241,0.25)", amount: "#93c5fd" },
                      { badge: "linear-gradient(135deg,#ec4899,#ef4444)", card: "rgba(236,72,153,0.10)", border: "rgba(236,72,153,0.45)", glow: "rgba(236,72,153,0.25)", amount: "#f9a8d4" },
                      { badge: "linear-gradient(135deg,#94a3b8,#64748b)",  card: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.35)", glow: "rgba(148,163,184,0.15)", amount: "#cbd5e1" },
                      { badge: "linear-gradient(135deg,#8b5cf6,#6366f1)", card: "rgba(139,92,246,0.09)",  border: "rgba(139,92,246,0.40)", glow: "rgba(139,92,246,0.20)", amount: "#c4b5fd" },
                      { badge: "linear-gradient(135deg,#f59e0b,#d97706)", card: "rgba(245,158,11,0.09)",  border: "rgba(245,158,11,0.40)", glow: "rgba(245,158,11,0.20)", amount: "#fcd34d" },
                    ];
                    const p = i < palette.length ? palette[i] : { badge: "linear-gradient(135deg,#334155,#475569)", card: "rgba(51,65,85,0.15)", border: "rgba(71,85,105,0.35)", glow: "transparent", amount: "#94a3b8" };
                    return (
                      <div key={entry.userId} style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "14px 22px 14px 16px",
                        borderRadius: 60,
                        background: p.card,
                        border: `1px solid ${p.border}`,
                        boxShadow: `0 0 24px ${p.glow}, inset 0 0 24px ${p.card}`,
                      }}>
                        {/* Rank badge */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: 16, background: p.badge, flexShrink: 0, boxShadow: `0 4px 12px ${p.glow}` }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{rank}</span>
                          <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.75)", letterSpacing: 1 }}>{suffix}</span>
                        </div>
                        {/* Avatar */}
                        <AvatarImg avatarImage={entry.userAvatarImage} avatar={entry.userAvatar} color={entry.userColor} size={52} />
                        {/* Name + title */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 17, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.userNickname}</div>
                          <div style={{ fontSize: 9, color: p.amount, letterSpacing: 3, fontWeight: 700, marginTop: 3 }}>{title}</div>
                        </div>
                        {/* Amount */}
                        <div style={{ fontWeight: 900, fontSize: 18, color: p.amount, flexShrink: 0, letterSpacing: 0.5 }}>HK${entry.total.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "14px 20px", background: "#08091a", borderTop: "1px solid #1a1a3a", flexShrink: 0 }}>
                <button onClick={() => setShowDonateModal(true)}
                  style={{ width: "100%", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: 16, padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(245,158,11,0.35)", letterSpacing: 1 }}>
                  💝 我要打賞
                </button>
              </div>
            </>
          )}

          {/* Cinema view */}
          {showCinema && !activeFriendId && !activeGroupId && !showLeaderboard && !activeCompanion && (
            <>
              {cinemaView === 'list' && (
                <>
                  {/* Header */}
                  <div style={{ height: 56, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "#0f172a", flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🎬</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>電影院</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>螢幕分享直播</div>
                    </div>
                    <button onClick={() => setShowCreateCinema(true)}
                      style={{ marginLeft: "auto", background: "#7c3aed", border: "none", borderRadius: 10, padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      + 創建房間
                    </button>
                  </div>
                  {/* Room list */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                    {cinemaRooms.length === 0 && (
                      <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
                        <div style={{ fontSize: 16, color: "#64748b" }}>還沒有直播房間</div>
                        <div style={{ fontSize: 13, marginTop: 8, color: "#475569" }}>成為第一個主播吧！</div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700, margin: "0 auto" }}>
                      {cinemaRooms.map(room => (
                        <div key={room.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                          <AvatarImg avatarImage={room.hostAvatarImage} avatar={room.hostAvatar} color={room.hostColor} size={44} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 4 }}>{room.title}</div>
                            <div style={{ fontSize: 12, color: "#64748b" }}>主播：{room.hostNickname}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>🔴 LIVE</span>
                            <button onClick={() => joinCinemaRoom(room)}
                              style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", border: "none", borderRadius: 10, padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                              進入
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Create room modal */}
                  {showCreateCinema && (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
                      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, padding: "32px", width: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: "#e2e8f0", marginBottom: 20 }}>🎬 創建直播房間</div>
                        <input type="text" value={cinemaTitleInput} onChange={e => setCinemaTitleInput(e.target.value)}
                          placeholder="房間名稱（例如：週五電影之夜）"
                          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "11px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
                        <div style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>進入房間後再點擊開始直播，系統會請求螢幕分享權限</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => { setShowCreateCinema(false); setCinemaTitleInput(''); }}
                            style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "11px", color: "#94a3b8", fontSize: 14, cursor: "pointer" }}>取消</button>
                          <button onClick={createCinemaRoom}
                            style={{ flex: 1, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", border: "none", borderRadius: 12, padding: "11px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>確定</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {cinemaView === 'room' && activeCinemaRoom && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000", minHeight: 0 }}>
                  {/* Top bar */}
                  <div style={{ height: 48, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
                    <button onClick={() => leaveCinemaRoom(activeCinemaRoom.id, isHosting)}
                      style={{ background: "#1e293b", border: "none", borderRadius: 8, padding: "6px 14px", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>← 離開</button>
                    <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{activeCinemaRoom.title}</span>
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>🔴 LIVE</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#94a3b8", fontSize: 13 }}>👁 {cinemaViewerCount}</span>
                    <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 12 }}>主播：{activeCinemaRoom.hostNickname}</span>
                  </div>
                  {/* Video area */}
                  <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
                    {isHosting && !screenStream ? (
                      <button onClick={startHostStream}
                        style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", border: "none", borderRadius: 14, padding: "16px 32px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                        ▶ 開始直播
                      </button>
                    ) : isHosting ? (
                      <video ref={localVideoRef} autoPlay muted playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : remoteStream ? (
                      <video ref={remoteVideoRef} autoPlay playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ textAlign: "center", color: "#475569" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
                        <div style={{ fontSize: 14 }}>等待主播開始分享螢幕...</div>
                      </div>
                    )}
                  </div>
                  {/* Comments area */}
                  <div style={{ height: 220, background: "#0a0f1e", borderTop: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {cinemaComments.length === 0 && (
                        <div style={{ color: "#475569", fontSize: 13, textAlign: "left", paddingTop: 8 }}>還沒有留言，來第一個留言吧！</div>
                      )}
                      {cinemaComments.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <AvatarImg avatarImage={c.userAvatarImage} avatar={c.userAvatar} color={c.userColor} size={24} />
                          <div style={{ textAlign: "left" }}>
                            <span style={{ fontSize: 12, color: "#64748b", marginRight: 6 }}>{c.userNickname}</span>
                            <span style={{ fontSize: 14, color: "#e2e8f0" }}>{c.text}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={cinemaCommentsEndRef} />
                    </div>
                    <div style={{ padding: "8px 12px", borderTop: "1px solid #1e293b", display: "flex", gap: 8 }}>
                      <input type="text" value={cinemaInput} onChange={e => setCinemaInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendCinemaComment()}
                        placeholder="留言..."
                        style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "8px 12px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                      <button className="sb" onClick={sendCinemaComment}
                        style={{ background: "#7c3aed", border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>發送</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* AI News */}
          {showAiNews && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !activeCompanion && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "#0f172a", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>AI 新聞</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>每日自動彙整全球 AI 資訊</div>
                </div>
                {zhVoices.length > 0 && (
                  <select value={selectedVoiceURI} onChange={e => setSelectedVoiceURI(e.target.value)} title="選擇語音"
                    style={{ marginLeft: "auto", background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "6px 8px", color: "#94a3b8", fontSize: 11, maxWidth: 140 }}>
                    <option value="">自動選擇語音</option>
                    {zhVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
                  </select>
                )}
                <button onClick={speakingIndex !== null ? stopSpeaking : speakAllNews} disabled={aiNewsLoading || aiNewsItems.length === 0}
                  style={{ marginLeft: zhVoices.length > 0 ? 0 : "auto", background: speakingIndex !== null ? "#7c3aed" : "none", border: "1px solid #334155", borderRadius: 10, padding: "6px 14px", color: speakingIndex !== null ? "#fff" : "#94a3b8", fontSize: 12, cursor: (aiNewsLoading || aiNewsItems.length === 0) ? "default" : "pointer" }}>
                  {speakingIndex !== null ? "⏸ 停止播報" : "🔊 語音播報全部"}
                </button>
                <button onClick={loadAiNews} disabled={aiNewsLoading}
                  style={{ background: "none", border: "1px solid #334155", borderRadius: 10, padding: "6px 14px", color: "#94a3b8", fontSize: 12, cursor: aiNewsLoading ? "default" : "pointer" }}>
                  {aiNewsLoading ? "更新中…" : "🔄 重新整理"}
                </button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
                {aiNewsLoading && aiNewsItems.length === 0 && (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>正在為你彙整今天的 AI 新聞…</div>
                  </div>
                )}
                {!aiNewsLoading && aiNewsError && aiNewsItems.length === 0 && (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>新聞暫時載入失敗，請稍後再試</div>
                  </div>
                )}
                {!aiNewsLoading && !aiNewsError && aiNewsItems.length === 0 && (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#475569" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                    <div style={{ fontSize: 14, color: "#64748b" }}>目前沒有最新資訊</div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 720, margin: "0 auto" }}>
                  {aiNewsItems.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                      style={{ display: "block", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 16, padding: "16px 20px", textDecoration: "none", transition: "border-color 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "#7c3aed"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "#1e293b"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>{item.source}</span>
                        {item.publishedAt && (
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            {new Date(item.publishedAt).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); speakingIndex === i ? stopSpeaking() : speakItem(item, i); }}
                          title="語音播放這則新聞"
                          style={{ marginLeft: "auto", background: speakingIndex === i ? "#7c3aed" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 20, width: 26, height: 26, color: "#fff", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                          {speakingIndex === i ? "⏸" : "🔊"}
                        </button>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.4 }}>{item.titleZh || item.title}</div>
                      {item.summaryZh && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ flexShrink: 0, marginTop: 2, background: "rgba(139,92,246,0.15)", color: "#c4b5fd", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, height: "fit-content" }}>AI 摘要</span>
                          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>{item.summaryZh}</div>
                        </div>
                      )}
                      {item.titleZh && item.titleZh !== item.title && (
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>原文標題：{item.title}</div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Public hall */}
          {!activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showAiNews && !activeCompanion && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "#0f172a", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}># 公共大廳</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>公開頻道</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ textAlign: "center", color: "#475569", fontSize: 12, padding: "8px 0 16px" }}>
                  今天 · {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                </div>
                {hallMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                    <div>歡迎來到公共大廳！成為第一個發言的人吧</div>
                  </div>
                )}
                {hallMessages.map((msg, i) => {
                  if (msg.isSystem) return (
                    <div key={msg.id} style={{ textAlign: "center", marginBottom: 10 }}>
                      <span style={{ background: "#1e293b", color: "#64748b", fontSize: 12, padding: "5px 14px", borderRadius: 20, border: "1px solid #334155" }}>📢 {msg.text}</span>
                    </div>
                  );
                  const isMine = msg.senderId === uid;
                  const showSender = !isMine && hallMessages[i-1]?.senderId !== msg.senderId;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={showSender} myUid={uid} collectionPath={["hall_messages", msg.id]} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "10px 14px 14px", background: "#0f172a", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={hallFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendHallMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => hallFileRef.current?.click()} disabled={hallUploading} title="上傳圖片/影片"
                    style={{ background: "none", border: "1px solid #334155", borderRadius: 10, padding: "8px 10px", cursor: hallUploading ? "default" : "pointer", fontSize: 16, color: "#64748b", flexShrink: 0 }}>
                    {hallUploading ? "⏳" : "📷"}
                  </button>
                  <input type="text" value={hallInput} onChange={e => setHallInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendHall()} placeholder="在大廳發送訊息..."
                    style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "9px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <button className="sb" onClick={sendHall} style={{ background: "#7c3aed", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>發送 ↑</button>
                </div>
              </div>
            </>
          )}

          {/* Private chat */}
          {activeFriendId && activeFriendProfile && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "#0f172a", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <AvatarImg avatarImage={activeFriendProfile.avatarImage} avatar={activeFriendProfile.avatar} color={activeFriendProfile.color} size={34} />
                  <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: getStatus(activeFriendProfile.status).color, border: "2px solid #0f172a" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{activeFriendProfile.nickname}</div>
                  <div style={{ fontSize: 11, color: getStatus(activeFriendProfile.status).color }}>
                    {getStatus(activeFriendProfile.status).label}{activeFriendProfile.statusText ? ` · ${activeFriendProfile.statusText}` : ""}
                  </div>
                </div>
                <Link href={`/profile/${activeFriendProfile.uid}`} style={{ marginLeft: "auto", color: "#64748b", fontSize: 12, textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#94a3b8"}
                  onMouseLeave={e => e.currentTarget.style.color = "#64748b"}>
                  👤 個人頁面
                </Link>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, backgroundImage: "radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)", backgroundSize: "28px 28px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <AvatarImg avatarImage={activeFriendProfile.avatarImage} avatar={activeFriendProfile.avatar} color={activeFriendProfile.color} size={56} />
                  <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15 }}>{activeFriendProfile.nickname}</div>
                  {activeFriendProfile.bio && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 260, margin: "4px auto 0" }}>{activeFriendProfile.bio}</div>}
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>這是你們私訊的開始</div>
                </div>
                {privateMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={!isMine && privateMessages[i-1]?.senderId !== msg.senderId} myUid={uid} collectionPath={["private_chats", chatId, "messages", msg.id]} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "10px 14px 14px", background: "#0f172a", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={privateFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendPrivateMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => privateFileRef.current?.click()} disabled={privateUploading} title="上傳圖片/影片"
                    style={{ background: "none", border: "1px solid #334155", borderRadius: 10, padding: "8px 10px", cursor: privateUploading ? "default" : "pointer", fontSize: 16, color: "#64748b", flexShrink: 0 }}>
                    {privateUploading ? "⏳" : "📷"}
                  </button>
                  <input type="text" value={privateInput} onChange={e => setPrivateInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendPrivate()} placeholder={`傳訊息給 ${activeFriendProfile.nickname}...`}
                    style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "9px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <button className="sb" onClick={sendPrivate} disabled={!privateInput.trim()}
                    style={{ background: privateInput.trim() ? "#7c3aed" : "#1e293b", border: "none", borderRadius: 10, padding: "9px 16px", color: privateInput.trim() ? "#fff" : "#475569", cursor: privateInput.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600, transition: "all 0.15s" }}>
                    發送 ↑
                  </button>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "#334155", marginTop: 4 }}>雙擊訊息加表情反應 · 滑鼠移上自己的訊息可收回</div>
              </div>
            </>
          )}

          {/* Group chat */}
          {activeGroupId && activeGroup && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "#0f172a", flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#475569,#334155)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {activeGroup.avatar || "👥"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{activeGroup.name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{(activeGroup.members || []).length} 位成員</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
                {groupMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#475569" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                    <div>群組剛建立，快來說聲你好！</div>
                  </div>
                )}
                {groupMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  const showSender = !isMine && groupMessages[i-1]?.senderId !== msg.senderId;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={showSender} myUid={uid} collectionPath={["groups", activeGroupId, "messages", msg.id]} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "10px 14px 14px", background: "#0f172a", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={groupFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendGroupMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => groupFileRef.current?.click()} disabled={groupUploading} title="上傳圖片/影片"
                    style={{ background: "none", border: "1px solid #334155", borderRadius: 10, padding: "8px 10px", cursor: groupUploading ? "default" : "pointer", fontSize: 16, color: "#64748b", flexShrink: 0 }}>
                    {groupUploading ? "⏳" : "📷"}
                  </button>
                  <input type="text" value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendGroup()} placeholder={`在「${activeGroup.name}」發送訊息...`}
                    style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "9px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <button className="sb" onClick={sendGroup} style={{ background: "#7c3aed", border: "none", borderRadius: 10, padding: "9px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>發送 ↑</button>
                </div>
              </div>
            </>
          )}

          {/* AI Companion chat */}
          {activeCompanion && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "#0f172a", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: COMPANION_META[activeCompanion].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{COMPANION_META[activeCompanion].avatar}</div>
                  <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #0f172a" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{COMPANION_META[activeCompanion].name}</div>
                  <div style={{ fontSize: 11, color: "#22c55e" }}>{COMPANION_META[activeCompanion].tagline || "永遠在線 · AI 陪伴角色"}</div>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, backgroundImage: "radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)", backgroundSize: "28px 28px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: COMPANION_META[activeCompanion].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto" }}>{COMPANION_META[activeCompanion].avatar}</div>
                  <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15 }}>{COMPANION_META[activeCompanion].name}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 260, margin: "4px auto 0" }}>{COMPANION_META[activeCompanion].intro}</div>
                </div>
                {companionMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={!isMine && companionMessages[i-1]?.senderId !== msg.senderId} myUid={uid} collectionPath={["private_chats", companionChatId, "messages", msg.id]} />;
                })}
                {companionTyping && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: COMPANION_META[activeCompanion].color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{COMPANION_META[activeCompanion].avatar}</div>
                    <div style={{ padding: "9px 14px", borderRadius: 18, background: "#1e293b", border: "1px solid #334155", color: "#64748b", fontSize: 13 }}>對方正在輸入…</div>
                  </div>
                )}
                {activeCompanion === "father" && fatherBriefLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: COMPANION_META.father.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{COMPANION_META.father.avatar}</div>
                    <div style={{ padding: "9px 14px", borderRadius: 18, background: "#1e293b", border: "1px solid #334155", color: "#64748b", fontSize: 13 }}>爸爸正在整理今日財經總結…</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "10px 14px 14px", background: "#0f172a", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                {ART_DESIGN_QUICK_ACTIONS[activeCompanion]?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {ART_DESIGN_QUICK_ACTIONS[activeCompanion].map((action) => {
                      const chipStyle = {
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 999,
                        padding: "6px 12px",
                        color: "#c4b5fd",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: companionTyping ? "default" : "pointer",
                        opacity: companionTyping ? 0.55 : 1,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                      };
                      if (action.href) {
                        return (
                          <Link key={action.label} href={action.href} style={chipStyle}>
                            {action.label}
                          </Link>
                        );
                      }
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => sendCompanion(action.text)}
                          disabled={companionTyping}
                          style={{ ...chipStyle, fontFamily: "inherit" }}
                        >
                          {action.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="text" value={companionInput} onChange={e => setCompanionInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendCompanion()} placeholder={`跟${COMPANION_META[activeCompanion].name}說點什麼...`}
                    style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "9px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                  <button className="sb" onClick={() => sendCompanion()} disabled={!companionInput.trim()}
                    style={{ background: companionInput.trim() ? "#7c3aed" : "#1e293b", border: "none", borderRadius: 10, padding: "9px 16px", color: companionInput.trim() ? "#fff" : "#475569", cursor: companionInput.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600, transition: "all 0.15s" }}>
                    發送 ↑
                  </button>
                </div>
                <div style={{ textAlign: "center", fontSize: 11, color: "#334155", marginTop: 4 }}>
                  {activeCompanion === "father"
                    ? "AI 爸爸每日吸收最新財經新聞，回覆僅供陪伴聊天，非投資建議"
                    : activeCompanion === "artstudent" || activeCompanion === "artteacher"
                    ? "AI 設計角色會討論 EVONVCHAT 頁面作品，實際改版仍需人工確認"
                    : "AI 陪伴角色會自動回覆，內容僅供陪伴聊天，非專業建議"}
                </div>
              </div>
            </>
          )}

          {/* Loading friend profile */}
          {activeFriendId && !activeFriendProfile && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>載入中...</div>
          )}
        </div>

        {/* Right calendar panel */}
        <div className="chat-calendar"><CalendarMemo uid={uid} /></div>
      </div>
    </>
  );
}
