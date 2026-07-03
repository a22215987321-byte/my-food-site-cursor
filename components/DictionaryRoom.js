import { useState, useRef, useCallback, useEffect } from "react";
import { loadAllEdits, getEdit, saveEdit } from "../lib/dictEdits";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";

const EN_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const ES_LETTERS = [...EN_LETTERS, "ñ"];
const PAGE_SIZE = 50;
const TAG_LABELS = { zk: "中考", gk: "高考", ky: "考研", cet4: "CET4", cet6: "CET6", ielts: "IELTS", toefl: "TOEFL", gre: "GRE" };

function speak(word, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = lang === "es" ? "es-ES" : "en-US";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function WordCard({ word, data, lang, onWordClick, onEdit, onAddToVocab }) {
  const translation = data.t || data.en;
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
      padding: "12px 14px", marginBottom: 8, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
          <span onClick={(e) => onWordClick(word, data, e)} title="點擊查看定義"
            style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa", cursor: "pointer",
              textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{word}</span>
          {lang === "en" && data.p && (
            <span style={{ fontSize: 12, color: "#64748b" }}>{data.p}</span>
          )}
          {data.s && (
            <span style={{ fontSize: 11, padding: "1px 5px", background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4 }}>
              {data.s}.
            </span>
          )}
          {lang === "en" && data.g && (
            <span style={{ fontSize: 10, padding: "1px 6px", background: "#1e3a5f", color: "#93c5fd", borderRadius: 10 }}>
              {TAG_LABELS[data.g] || data.g.toUpperCase()}
            </span>
          )}
          {lang === "es" && data.g && (
            <span style={{ fontSize: 11, padding: "1px 6px", fontWeight: 700, borderRadius: 4,
              background: data.g === "f" ? "#4c1d1d" : "#1e3a5f",
              color: data.g === "f" ? "#f87171" : "#60a5fa" }}>
              {data.g === "f" ? "f." : data.g === "m" ? "m." : data.g}
            </span>
          )}
        </div>
        {translation && (
          <div style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.5 }}>{translation}</div>
        )}
        {lang === "es" && data.t && data.en && (
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{data.en}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button onClick={() => onEdit(word, data)} title="編輯"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b",
              fontSize: 14, padding: "2px 4px", borderRadius: 4 }}>✏️</button>
          <button onClick={() => speak(word, lang)} title="發音"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa",
              fontSize: 18, padding: "2px 4px", borderRadius: 6 }}>🔊</button>
        </div>
        <button onClick={() => onAddToVocab(word, data)} title="加入詞彙表"
          style={{ background: "#0a1e14", border: "1px solid #166534", borderRadius: 6,
            color: "#4ade80", cursor: "pointer", fontSize: 15, padding: "0px 10px",
            fontWeight: 700, lineHeight: 1.6, letterSpacing: 1 }}>＋</button>
      </div>
      </div>
    </div>
  );
}

export default function DictionaryRoom() {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("dictLang") || "en";
  });
  const [activeLetter, setActiveLetter] = useState(null);
  const [search, setSearch] = useState("");
  const [shardData, setShardData] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const shardCache = useRef({});

  const [popup, setPopup] = useState(null); // { word, data, x, y }
  const [editModal, setEditModal] = useState(null); // { word, lang }
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [srcModal, setSrcModal] = useState(null); // { word, src }
  const [expandField, setExpandField] = useState(null); // { key, label } for fullscreen textarea edit
  const [myLists, setMyLists] = useState([]);
  const [vocabModal, setVocabModal] = useState(null); // { word, data }
  const [addingList, setAddingList] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  useEffect(() => { loadAllEdits(); }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDocs(query(collection(db, "vocabLists"), where("uid", "==", uid)))
      .then(snap => setMyLists(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      ))
      .catch(() => {});
  }, []);

  const loadShard = useCallback(async (langKey, letter) => {
    const key = `${langKey}:${letter}`;
    if (shardCache.current[key]) return shardCache.current[key];
    const dir = langKey === "es" ? "dict-es" : "dict";
    const res = await fetch(`/${dir}/${letter}.json`);
    const data = res.ok ? await res.json() : {};
    shardCache.current[key] = data;
    return data;
  }, []);

  const selectLetter = useCallback(async (letter) => {
    setSearch("");
    setActiveLetter(letter);
    setPage(1);
    setLoading(true);
    const data = await loadShard(lang, letter);
    setShardData(data);
    setLoading(false);
  }, [lang, loadShard]);

  const handleSearch = useCallback(async (val) => {
    setSearch(val);
    setPage(1);
    if (!val) return;
    const rawFirst = val[0].toLowerCase();
    if (!/[a-záéíóúüñ]/i.test(rawFirst)) return;
    const first = lang === "es" && /^ñ/i.test(rawFirst) ? "ñ"
      : rawFirst.normalize("NFD").replace(/[̀-ͯ]/g, "");
    setLoading(true);
    const data = await loadShard(lang, first);
    setShardData(data);
    setActiveLetter(first);
    setLoading(false);
  }, [lang, loadShard]);

  const switchLang = useCallback((newLang) => {
    setLang(newLang);
    if (typeof window !== "undefined") localStorage.setItem("dictLang", newLang);
    setActiveLetter(null);
    setSearch("");
    setShardData({});
    setPage(1);
    setPopup(null);
  }, []);

  const handleWordClick = useCallback((word, wordData, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 6;
    const edit = getEdit(lang, word);
    const mergedData = edit ? { ...wordData, ...edit } : wordData;
    const pw = mergedData?.src ? 392 : 320;
    if (x + pw > window.innerWidth) x = Math.max(8, window.innerWidth - pw - 8);
    if (y + 380 > window.innerHeight) y = Math.max(8, rect.top - 386);
    setPopup({ word, data: mergedData, x, y });
  }, [lang]);

  const openEdit = (word, data) => {
    setPopup(null);
    setEditModal({ word, lang });
    const cached = getEdit(lang, word);
    const merged = cached ? { ...(data || {}), ...cached } : (data || {});
    setEditForm({ t: merged.t || "", s: merged.s || "", g: merged.g || "", p: merged.p || "", ex: merged.ex || "", src: merged.src || "" });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const saved = await saveEdit(editModal.lang, editModal.word, editForm);
      setShardData(prev => ({ ...prev, [editModal.word]: { ...(prev[editModal.word] || {}), ...saved } }));
      setEditModal(null);
    } catch {
      alert("儲存失敗。請到 Firebase Console → Firestore → 規則，確認 dictEdits 集合允許寫入。");
    }
    setSaving(false);
  };

  const handleAddToVocab = async (listId) => {
    if (!vocabModal || addingList) return;
    const { word, data } = vocabModal;
    setAddingList(listId);
    try {
      const docRef = doc(db, "vocabLists", listId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("not found");
      const existing = snap.data().words || [];
      if (existing.some(w => w.word === word)) {
        setAddSuccess(`dup:${listId}`);
        setTimeout(() => setAddSuccess(null), 1500);
      } else {
        const newWord = {
          word,
          cn: data?.t || data?.en || "",
          phonetic: data?.p || "",
          pos: data?.s || "",
          example: "", exampleCn: "", category: "",
        };
        await updateDoc(docRef, { words: [...existing, newWord] });
        setAddSuccess(listId);
        setTimeout(() => { setAddSuccess(null); setVocabModal(null); }, 1200);
      }
    } catch {
      alert("加入失敗，請稍後重試");
    }
    setAddingList(null);
  };

  const letters = lang === "es" ? ES_LETTERS : EN_LETTERS;

  const stripAccents = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filtered = (() => {
    const entries = Object.entries(shardData);
    if (!entries.length) return [];
    const q = search.toLowerCase();
    const qStripped = stripAccents(q);
    const matched = q ? entries.filter(([w]) => {
      return w.toLowerCase().includes(q) || stripAccents(w).includes(qStripped);
    }) : entries;
    return matched.sort(([a], [b]) => a.localeCompare(b, lang === "es" ? "es" : "en"));
  })();

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div style={{ flex: 1, background: "#0a0f1e", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ padding: "16px 20px 0", background: "#0f172a", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>

        {/* Title row + lang toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>字典查詢</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {lang === "en" ? "英語 400,000+ 字 · 中文翻譯" : "西語 93,000+ 字 · 中文翻譯"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "#1e293b", borderRadius: 8, padding: 3 }}>
            {[["en", "🇬🇧 英語"], ["es", "🇪🇸 西語"]].map(([k, label]) => (
              <button key={k} onClick={() => switchLang(k)}
                style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: lang === k ? "#1d4ed8" : "transparent",
                  color: lang === k ? "#fff" : "#64748b", transition: "all 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 12, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={lang === "en" ? "直接輸入英文單字搜尋..." : "直接輸入西語單字搜尋..."}
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#e2e8f0",
              fontSize: 14, outline: "none" }}
          />
        </div>

        {/* A-Z letter buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 12, alignItems: "center" }}>
          {letters.map(l => (
            <button key={l} onClick={() => selectLetter(l)}
              style={{ minWidth: 30, height: 30, borderRadius: 6, border: "1px solid",
                borderColor: activeLetter === l && !search ? "#3b82f6" : "#334155",
                background: activeLetter === l && !search ? "#1d4ed8" : "#1e293b",
                color: activeLetter === l && !search ? "#fff" : "#94a3b8",
                cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                textTransform: "uppercase" }}>
              {l}
            </button>
          ))}
        </div>

      </div>

      {/* Word list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {!activeLetter && !search && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📖</div>
            <div style={{ fontSize: 15, marginBottom: 6 }}>選擇字母或輸入單字開始搜尋</div>
            <div style={{ fontSize: 13 }}>英語 40 萬字 · 西語 9.3 萬字 · 全部免費內建</div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40, fontSize: 14 }}>載入中...</div>
        )}

        {!loading && activeLetter && filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>找不到符合的單字</div>
        )}

        {!loading && visible.map(([word, data]) => (
          <WordCard key={word} word={word} data={data} lang={lang}
            onWordClick={handleWordClick}
            onEdit={(w, d) => openEdit(w, d)}
            onAddToVocab={(w, d) => setVocabModal({ word: w, data: d })} />
        ))}

        {!loading && hasMore && (
          <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
            <button onClick={() => setPage(p => p + 1)}
              style={{ padding: "10px 28px", borderRadius: 10, border: "1px solid #334155",
                background: "#1e293b", color: "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              載入更多（還有 {filtered.length - visible.length} 字）
            </button>
          </div>
        )}

      </div>

      {/* Small popup */}
      {popup && (
        <>
          <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", left: popup.x, top: popup.y, zIndex: 300,
              background: "#0f172a", border: "1px solid #334155", borderRadius: 12,
              padding: "12px 14px", minWidth: 220, maxWidth: 360,
              maxHeight: "70vh", overflowY: "auto",
              boxShadow: "0 12px 32px rgba(0,0,0,0.55)" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa", flex: 1 }}>{popup.word}</span>
              <button onClick={() => openEdit(popup.word, popup.data)} title="編輯"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "2px 4px", borderRadius: 4, color: "#64748b" }}>✏️</button>
              <button onClick={() => setPopup(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#64748b", lineHeight: 1 }}>✕</button>
            </div>
            {/* Badges row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {lang === "en" && popup.data?.p && <span style={{ fontSize: 12, color: "#64748b" }}>{popup.data.p}</span>}
              <button onClick={() => speak(popup.word, lang)} title="發音"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 13, lineHeight: 1, padding: 0 }}>🔊</button>
              {popup.data?.s && (
                <span style={{ fontSize: 11, padding: "1px 5px", background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4 }}>
                  {popup.data.s}.
                </span>
              )}
              {lang === "en" && popup.data?.g && (
                <span style={{ fontSize: 10, padding: "1px 6px", background: "#1e3a5f", color: "#93c5fd", borderRadius: 10 }}>
                  {TAG_LABELS[popup.data.g] || popup.data.g.toUpperCase()}
                </span>
              )}
              {lang === "es" && popup.data?.g && (
                <span style={{ fontSize: 10, padding: "1px 6px", fontWeight: 700, borderRadius: 4,
                  background: popup.data.g === "f" ? "#4c1d1d" : "#1e3a5f",
                  color: popup.data.g === "f" ? "#f87171" : "#60a5fa" }}>
                  {popup.data.g === "f" ? "f." : popup.data.g === "m" ? "m." : popup.data.g}
                </span>
              )}
            </div>
            {/* Content */}
            {popup.data ? (
              <>
                <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{popup.data.t || popup.data.en}</div>
                {lang === "es" && popup.data.t && popup.data.en && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{popup.data.en}</div>
                )}
                {/* Manual example sentences */}
                {popup.data.ex && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
                    <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 5, fontWeight: 700 }}>📝 例句</div>
                    {popup.data.ex.split("\n").filter(Boolean).map((line, i) => (
                      <div key={i} style={{ fontSize: 12, color: "#c4b5fd", lineHeight: 1.65, marginBottom: 4 }}>{line}</div>
                    ))}
                  </div>
                )}
                {/* Source with expand button */}
                {popup.data.src && (
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                      <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>📖 來源</div>
                      <button onClick={() => setSrcModal({ word: popup.word, src: popup.data.src })}
                        title="展開完整來源"
                        style={{ background: "none", border: "1px solid #334155", cursor: "pointer",
                          color: "#64748b", fontSize: 10, padding: "1px 8px", borderRadius: 4, lineHeight: 1.6 }}>
                        展開
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.8, whiteSpace: "pre-wrap",
                      maxHeight: 80, overflow: "hidden" }}>
                      {popup.data.src}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: "#64748b" }}>查無此字</div>
            )}
          </div>
        </>
      )}

      {/* Src full-content modal */}
      {srcModal && (
        <div onClick={() => setSrcModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16,
              width: 560, maxWidth: "92vw", maxHeight: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #1e293b",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#7c3aed", fontWeight: 700 }}>📖 來源</span>
              <span style={{ fontSize: 16, color: "#a78bfa", fontWeight: 700, flex: 1 }}>{srcModal.word}</span>
              <button onClick={() => setSrcModal(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
              <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 2, whiteSpace: "pre-wrap" }}>{srcModal.src}</div>
            </div>
          </div>
        </div>
      )}

      {/* Vocab picker modal */}
      {vocabModal && (
        <div onClick={() => setVocabModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: "20px 24px",
              width: 340, maxWidth: "92vw", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 4 }}>加入詞彙表</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>將「<span style={{ color: "#a78bfa" }}>{vocabModal.word}</span>」加入哪個詞彙表？</div>
            {myLists.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: "24px 0", fontSize: 13 }}>
                你還沒有詞彙表，<br/>請先到「自建詞彙」頁面新建
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {myLists.map(list => {
                  const isSuccess = addSuccess === list.id;
                  const isDup = addSuccess === `dup:${list.id}`;
                  const isAdding = addingList === list.id;
                  return (
                    <button key={list.id} onClick={() => handleAddToVocab(list.id)} disabled={!!addingList}
                      style={{ background: isSuccess ? "#0a1e14" : "#1e293b",
                        border: `1px solid ${isSuccess ? "#166534" : "#334155"}`,
                        borderRadius: 10, padding: "10px 14px", cursor: addingList ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        opacity: addingList && !isAdding ? 0.5 : 1, transition: "all 0.2s" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: isSuccess ? "#4ade80" : isDup ? "#64748b" : "#e2e8f0" }}>
                          {isSuccess ? "✓ 已加入！" : isDup ? "✗ 已在此表中" : list.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {list.language} · {(list.words || []).length} 個單字
                        </div>
                      </div>
                      {isAdding && <span style={{ color: "#64748b", fontSize: 12 }}>加入中...</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setVocabModal(null)}
              style={{ marginTop: 14, padding: "8px 0", borderRadius: 10, border: "1px solid #334155",
                cursor: "pointer", background: "none", color: "#94a3b8", fontSize: 13 }}>
              關閉
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div onClick={() => setEditModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#0f172a", border: "1px solid #4c1d95", borderRadius: 16, padding: "22px 24px",
              width: 360, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa", marginBottom: 18 }}>✏️ 編輯「{editModal.word}」</div>

            {[
              { key: "t", label: "中文翻譯", placeholder: "輸入中文翻譯..." },
              { key: "s", label: "詞性 (n. / v. / adj. 等)", placeholder: "n. / v. / adj." },
              ...(editModal.lang === "es"
                ? [{ key: "g", label: "陰陽性 (m / f / m-f)", placeholder: "m / f / m-f" }]
                : [{ key: "p", label: "音標", placeholder: "/fəˈnɛtɪk/" }]
              ),
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={editForm[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155",
                    borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
              </div>
            ))}

            {[
              { key: "ex", label: "📝 例句（每行一句）", placeholder: "輸入例句，每行一句...\n例：Él perdió su prestigio.（他失去了威望。）" },
              { key: "src", label: "📖 來源（點擊單詞後顯示）", placeholder: "輸入詞源說明，支援換行...\n例：源自拉丁語 inter（之間）+ videre（看）" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: "#64748b" }}>{label}</label>
                  <button onClick={() => setExpandField({ key, label })}
                    title="展開大視窗編輯"
                    style={{ background: "none", border: "1px solid #334155", cursor: "pointer",
                      color: "#64748b", fontSize: 11, padding: "1px 8px", borderRadius: 4,
                      lineHeight: 1.6, flexShrink: 0 }}>
                    ⛶ 展開
                  </button>
                </div>
                <textarea value={editForm[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={4}
                  style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155",
                    borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 13, outline: "none",
                    resize: "vertical", lineHeight: 1.7, fontFamily: "inherit" }} />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={handleSaveEdit} disabled={saving}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: saving ? "default" : "pointer",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14,
                  opacity: saving ? 0.6 : 1 }}>
                {saving ? "儲存中..." : "儲存"}
              </button>
              <button onClick={() => setEditModal(null)}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #334155",
                  cursor: "pointer", background: "none", color: "#94a3b8", fontSize: 14 }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expand textarea modal */}
      {expandField && (
        <div onClick={() => setExpandField(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 600,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#0f172a", border: "1px solid #4c1d95", borderRadius: 16,
              width: 680, maxWidth: "96vw", height: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e293b",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#a78bfa", fontWeight: 700, flex: 1 }}>{expandField.label} — {editModal?.word}</span>
              <button onClick={() => setExpandField(null)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <textarea
              autoFocus
              value={editForm[expandField.key] || ""}
              onChange={e => setEditForm(f => ({ ...f, [expandField.key]: e.target.value }))}
              style={{ flex: 1, width: "100%", boxSizing: "border-box", background: "#0a0f1e",
                border: "none", outline: "none", padding: "18px 20px",
                color: "#e2e8f0", fontSize: 15, lineHeight: 2, resize: "none",
                fontFamily: "inherit" }}
            />
            <div style={{ padding: "12px 18px", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <button onClick={() => setExpandField(null)}
                style={{ padding: "8px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
