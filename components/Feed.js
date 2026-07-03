import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";

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

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric" });
}

function Avatar({ avatar, color, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color || "#3b82f6",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, flexShrink: 0,
    }}>
      {avatar}
    </div>
  );
}

function CommentSection({ postId, myProfile }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt"));
    return onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [postId]);

  const submit = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        userId: myProfile.uid,
        userNickname: myProfile.nickname,
        userAvatar: myProfile.avatar,
        userColor: myProfile.color,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }, [text, sending, postId, myProfile]);

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid #1e293b", paddingTop: 12 }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
          <Avatar avatar={c.userAvatar} color={c.userColor} size={28} />
          <div style={{ background: "#0f172a", borderRadius: 10, padding: "6px 10px", flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", marginRight: 6 }}>{c.userNickname}</span>
            <span style={{ fontSize: 13, color: "#e2e8f0" }}>{c.text}</span>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{formatDate(c.createdAt)}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Avatar avatar={myProfile.avatar} color={myProfile.color} size={28} />
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="留言..."
            style={{ flex: 1, background: "#0f172a", border: "1px solid #334155", borderRadius: 20, padding: "6px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            style={{ background: text.trim() ? "#3b82f6" : "#1e293b", border: "none", borderRadius: 20, padding: "6px 14px", color: text.trim() ? "#fff" : "#475569", cursor: text.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, myUid, myProfile }) {
  const [showComments, setShowComments] = useState(false);
  const liked = (post.likes || []).includes(myUid);

  const toggleLike = async () => {
    const ref = doc(db, "posts", post.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(myUid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(myUid) });
    }
  };

  return (
    <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", marginBottom: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        <Avatar avatar={post.userAvatar} color={post.userColor} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0" }}>{post.userNickname}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{formatDate(post.createdAt)}</div>
        </div>
      </div>

      {/* Text */}
      {post.text && (
        <div style={{ padding: "0 16px 12px", fontSize: 15, color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {post.text}
        </div>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div style={{ width: "100%", maxHeight: 480, overflow: "hidden", background: "#0f172a" }}>
          <img src={post.imageUrl} alt="貼文圖片" style={{ width: "100%", maxHeight: 480, objectFit: "contain", display: "block" }} />
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div style={{ width: "100%", background: "#000" }}>
          <video
            src={post.videoUrl}
            controls
            style={{ width: "100%", maxHeight: 480, display: "block" }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid #1e293b" }}>
        <button
          onClick={toggleLike}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: liked ? "#ef4444" : "#64748b", fontSize: 14, fontWeight: 600, padding: 0 }}
        >
          <span style={{ fontSize: 18 }}>{liked ? "❤️" : "🤍"}</span>
          {(post.likes || []).length > 0 && <span>{(post.likes || []).length}</span>}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14, fontWeight: 600, padding: 0 }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          留言
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ padding: "0 16px 14px" }}>
          <CommentSection postId={post.id} myProfile={myProfile} />
        </div>
      )}
    </div>
  );
}

function NewPostForm({ myProfile, onPosted }) {
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    setPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!text.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let imageUrl = null;
      let videoUrl = null;
      if (mediaFile) {
        const url = await uploadToR2(mediaFile);
        if (mediaType === "video") videoUrl = url;
        else imageUrl = url;
      }
      await addDoc(collection(db, "posts"), {
        userId: myProfile.uid,
        userNickname: myProfile.nickname,
        userAvatar: myProfile.avatar,
        userColor: myProfile.color,
        text: text.trim(),
        imageUrl,
        videoUrl,
        likes: [],
        createdAt: serverTimestamp(),
      });
      setText("");
      removeMedia();
      onPosted?.();
    } catch {
      alert("發佈失敗，請重試");
    } finally {
      setPosting(false);
    }
  };

  const canPost = (text.trim() || mediaFile) && !posting;

  return (
    <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar avatar={myProfile.avatar} color={myProfile.color} size={40} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="分享你的想法..."
            rows={3}
            style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
          />
          {preview && (
            <div style={{ position: "relative", marginTop: 8, borderRadius: 10, overflow: "hidden", display: "inline-block" }}>
              {mediaType === "video"
                ? <video src={preview} controls style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block" }} />
                : <img src={preview} alt="預覽" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block" }} />
              }
              <button
                onClick={removeMedia}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ background: "none", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", color: "#64748b", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}
            >
              📎 加入圖片/影片
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} style={{ display: "none" }} />
            <button
              onClick={submit}
              disabled={!canPost}
              style={{ background: canPost ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#1e293b", border: "none", borderRadius: 10, padding: "8px 20px", color: canPost ? "#fff" : "#475569", cursor: canPost ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}
            >
              {posting ? "發佈中..." : "發佈"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedApp({ user }) {
  const [myProfile, setMyProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const topRef = useRef();

  useEffect(() => {
    return onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) setMyProfile({ uid: user.uid, ...snap.data() });
    });
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  if (!myProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b" }}>載入中...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#e2e8f0", fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

        {/* Top Nav */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#0f172a", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56 }}>
          <div style={{ fontSize: 20 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#e2e8f0", flex: 1 }}>動態消息</div>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 5, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "6px 14px", color: "#94a3b8", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            💬 聊天室
          </Link>
          <button
            onClick={() => auth.signOut()}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, padding: 4 }}
            title="登出"
          >
            🚪
          </button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }} ref={topRef}>
          <NewPostForm myProfile={myProfile} />

          {posts.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16 }}>還沒有任何貼文</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>成為第一個分享的人吧！</div>
            </div>
          )}

          {posts.map(post => (
            <PostCard key={post.id} post={post} myUid={user.uid} myProfile={myProfile} />
          ))}
        </div>
      </div>
    </>
  );
}
