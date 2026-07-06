import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ChatRoom from '../components/ChatRoom';
import { shouldSkipSplash } from '../lib/communityIntro';
import { auth, db, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AVATAR_EMOJIS = ["😊","👨‍💻","📚","🏃","🎮","🎨","🍜","🌸","🦊","🐼","🎧","⚡"];
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];

function SplashScreen({ onEnter }) {
  const hintRef = useRef(null);
  const textColRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const go = (e) => {
      if (e.type === 'contextmenu') e.preventDefault();
      onEnter();
    };
    document.addEventListener('click', go);
    document.addEventListener('keydown', go);
    document.addEventListener('contextmenu', go);
    return () => {
      document.removeEventListener('click', go);
      document.removeEventListener('keydown', go);
      document.removeEventListener('contextmenu', go);
    };
  }, [onEnter]);

  useEffect(() => {
    const align = () => {
      if (!hintRef.current || !textColRef.current) return;
      const hintLeft = hintRef.current.getBoundingClientRect().left;
      const textLeft = textColRef.current.getBoundingClientRect().left;
      setOffset(hintLeft - textLeft);
      setVisible(true);
    };
    document.fonts.ready.then(align);
    window.addEventListener('resize', align);
    return () => window.removeEventListener('resize', align);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        @font-face {
          font-family: 'Cubic11';
          src: url('https://cdn.jsdelivr.net/gh/ACh-K/Cubic-11@main/fonts/web/Cubic_11.woff2') format('woff2');
          font-display: swap;
        }
        @keyframes pxblink { 0%,49%{opacity:1} 50%,100%{opacity:0.15} }
        @keyframes pxfloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pxfadein { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .splash-wrap {
          width: 100%;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #0a0f1e;
          font-family: 'Press Start 2P', monospace;
          image-rendering: pixelated;
          animation: pxfadein 0.6s ease both;
        }
        .sp-glow-a { position:absolute; top:-22%; left:10%; width:43%; aspect-ratio:1; border-radius:50%;
          background:radial-gradient(circle,rgba(99,102,241,0.28),transparent 70%); }
        .sp-glow-b { position:absolute; bottom:-29%; right:-6%; width:43%; aspect-ratio:1; border-radius:50%;
          background:radial-gradient(circle,rgba(34,211,238,0.16),transparent 70%); }
        .sp-frame { position:absolute; inset:20px; border:6px solid #6366f1;
          box-shadow:0 0 0 6px #0a0f1e, 0 0 0 12px #312e81; pointer-events:none; }
        .sp-scanlines { position:absolute; inset:0; pointer-events:none;
          background:repeating-linear-gradient(0deg,rgba(0,0,0,0.22) 0,rgba(0,0,0,0.22) 2px,transparent 2px,transparent 4px); }
        .sp-content { position:absolute; inset:20px; display:flex; align-items:center; justify-content:center; }
        .sp-inner { display:flex; align-items:center; gap:5%; }
        .sp-bubble { flex:0 0 auto; animation:pxfloat 4s ease-in-out infinite; }
        .sp-bubble svg { filter:drop-shadow(0 0 14px rgba(99,102,241,0.8)); width:min(208px,18vw); height:auto; }
        .sp-text { display:flex; flex-direction:column; gap:3.8%; }
        .sp-tag { display:inline-flex; align-items:center; gap:1.9%; align-self:flex-start; margin-bottom:2%; }
        .sp-arrow { font-size:clamp(9px,1.17vw,14px); color:#22d3ee; animation:pxblink 1.5s steps(1) infinite; }
        .sp-label { font-size:clamp(9px,1.17vw,14px); color:#a5b4fc; letter-spacing:0.28em; }
        .sp-title { display:flex; flex-direction:column; gap:2.2%; margin-bottom:3%; }
        .sp-h1 { font-size:clamp(28px,5.67vw,68px); line-height:1; letter-spacing:0.03em; }
        .sp-l1 { color:#ffffff; text-shadow:0 0 18px rgba(139,92,246,0.9),5px 5px 0 #4c1d95; }
        .sp-l2 { color:#8b5cf6; text-shadow:0 0 18px rgba(34,211,238,0.5),5px 5px 0 #1e293b; }
        .sp-sub { font-family:'Cubic11','Noto Sans TC',sans-serif; font-weight:400;
          font-size:clamp(14px,2.33vw,28px); color:#94a3b8; letter-spacing:0.14em; }
        .sp-hint { position:absolute; bottom:8.25%; left:50%; transform:translateX(-50%);
          font-size:clamp(7px,0.83vw,10px); color:#8b5cf6; letter-spacing:0.4em;
          text-shadow:0 0 10px rgba(139,92,246,0.85),0 0 2px rgba(167,139,250,0.9);
          animation:pxblink 1.5s steps(1) infinite; white-space:nowrap; }
      `}</style>
      <div className="splash-wrap">
        <div className="sp-glow-a" />
        <div className="sp-glow-b" />
        <div className="sp-frame" />
        <div className="sp-scanlines" />
        <div className="sp-content">
          <div className="sp-inner" style={{ transform: `translateX(${offset}px)`, visibility: visible ? 'visible' : 'hidden' }}>
            <div className="sp-bubble">
              <svg viewBox="0 0 18 16" shape-rendering="crispEdges">
                <rect x="1" y="0" width="16" height="1" fill="#22d3ee"/>
                <rect x="0" y="1" width="1" height="10" fill="#22d3ee"/>
                <rect x="17" y="1" width="1" height="10" fill="#22d3ee"/>
                <rect x="1" y="1" width="16" height="7" fill="#8b5cf6"/>
                <rect x="1" y="8" width="16" height="3" fill="#6366f1"/>
                <rect x="2" y="11" width="14" height="1" fill="#22d3ee"/>
                <rect x="3" y="11" width="4" height="2" fill="#6366f1"/>
                <rect x="3" y="13" width="2" height="1" fill="#6366f1"/>
                <rect x="2" y="11" width="1" height="3" fill="#22d3ee"/>
                <rect x="5" y="13" width="1" height="1" fill="#22d3ee"/>
                <rect x="3" y="14" width="2" height="1" fill="#22d3ee"/>
                <rect x="4" y="5" width="2" height="2" fill="#0a0f1e"/>
                <rect x="8" y="5" width="2" height="2" fill="#0a0f1e"/>
                <rect x="12" y="5" width="2" height="2" fill="#0a0f1e"/>
              </svg>
            </div>
            <div className="sp-text" ref={textColRef}>
              <div className="sp-tag">
                <span className="sp-arrow">▶</span>
                <span className="sp-label">PRESS START</span>
              </div>
              <div className="sp-title">
                <h1 className="sp-h1 sp-l1">EVON</h1>
                <h1 className="sp-h1 sp-l2">VCHAT</h1>
              </div>
              <span className="sp-sub">即時聊天・好友・群組・直播</span>
            </div>
          </div>
        </div>
        <div className="sp-hint" ref={hintRef}>CLICK OR PRESS ANY KEY TO CONTINUE</div>
      </div>
    </div>
  );
}

function getErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return '帳號或密碼錯誤';
    case 'auth/email-already-in-use': return '此電子郵件已被使用';
    case 'auth/invalid-email': return '電子郵件格式不正確';
    case 'auth/weak-password': return '密碼至少需要6位';
    default: return '發生錯誤，請稍後再試';
  }
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('loading'); // loading | login | setup | chat

  // Login / Register form state
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('😊');
  const [color, setColor] = useState('#3b82f6');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  // First-time setup state (for Google users)
  const [setupNickname, setSetupNickname] = useState('');
  const [setupAvatar, setSetupAvatar] = useState('😊');
  const [setupColor, setSetupColor] = useState('#3b82f6');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { setUser(null); setStep('login'); return; }
      setUser(u);
      const snap = await getDoc(doc(db, 'users', u.uid));
      if (snap.exists()) {
        setStep(shouldSkipSplash() ? 'chat' : 'splash');
      } else {
        setSetupNickname(u.displayName || '');
        setStep('setup');
      }
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    setAuthError('');
    if (!email.trim() || !password) return setAuthError('請填寫所有欄位');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) { setAuthError(getErrorMessage(e.code)); }
    finally { setBusy(false); }
  };

  const handleRegister = async () => {
    setAuthError('');
    if (!email.trim() || !password || !nickname.trim()) return setAuthError('請填寫所有欄位');
    if (password.length < 6) return setAuthError('密碼至少需要6位');
    setBusy(true);
    try {
      const { user: u } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'users', u.uid), {
        nickname: nickname.trim(), avatar, color,
        bio: '', status: 'online', statusText: '',
        email: email.trim(), friends: [], pendingIn: [], pendingOut: [],
        avatarImage: '/avatar1.png',
        createdAt: serverTimestamp(),
      });
      setStep('splash');
    } catch (e) { setAuthError(getErrorMessage(e.code)); }
    finally { setBusy(false); }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try { await signInWithPopup(auth, googleProvider); }
    catch (e) {
      console.error('[auth] Google login failed:', e);
      setAuthError(`Google 登入失敗：${e?.code || '請稍後再試'}`);
    }
  };

  const handleSetup = async () => {
    if (!setupNickname.trim() || !user) return;
    setBusy(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        nickname: setupNickname.trim(), avatar: setupAvatar, color: setupColor,
        bio: '', status: 'online', statusText: '',
        email: user.email || '', friends: [], pendingIn: [], pendingOut: [],
        avatarImage: '/avatar1.png',
        createdAt: serverTimestamp(),
      });
      setStep('splash');
    } catch (e) { console.error(e); }
    finally { setBusy(false); }
  };

  const inputStyle = {
    width: '100%', background: '#0f172a', border: '1px solid #334155',
    borderRadius: 10, padding: '10px 14px', color: '#e2e8f0',
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  // ── Loading ──
  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <style>{`
          @keyframes evon-spin { to { transform: rotate(360deg); } }
          .evon-spinner {
            width: 48px; height: 48px; border-radius: 50%;
            border: 4px solid #1e293b;
            border-top-color: #8b5cf6;
            animation: evon-spin 0.8s linear infinite;
          }
        `}</style>
        <div className="evon-spinner" />
        <div style={{ color: '#475569', fontSize: 14, letterSpacing: 1 }}>載入中...</div>
      </div>
    );
  }

  // ── Splash ──
  if (step === 'splash') {
    return <SplashScreen onEnter={() => router.push('/community')} />;
  }

  // ── Chat ──
  if (step === 'chat') return <ChatRoom user={user} />;

  // ── First-time profile setup (Google users) ──
  if (step === 'setup') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
            <h1 style={{ color: '#e2e8f0', fontSize: 22, fontWeight: 700, margin: 0 }}>建立你的個人資料</h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>讓大家認識你</p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, border: '1px solid #334155' }}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>選擇頭像</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {AVATAR_EMOJIS.map(e => (
                  <button key={e} onClick={() => setSetupAvatar(e)} style={{ width: 38, height: 38, borderRadius: '50%', border: setupAvatar === e ? '2px solid #8b5cf6' : '2px solid transparent', background: setupColor, cursor: 'pointer', fontSize: 18 }}>{e}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setSetupColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: setupColor === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>暱稱</label>
              <input value={setupNickname} onChange={e => setSetupNickname(e.target.value)}
                placeholder="你的暱稱" onKeyDown={e => e.key === 'Enter' && handleSetup()}
                style={inputStyle} />
            </div>
            <button onClick={handleSetup} disabled={busy || !setupNickname.trim()} style={{
              width: '100%', background: 'linear-gradient(135deg,#8b5cf6,#22d3ee)',
              border: 'none', borderRadius: 10, padding: '12px', color: '#fff',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (busy || !setupNickname.trim()) ? 0.6 : 1,
            }}>
              {busy ? '儲存中...' : '進入聊天室'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login / Register ──
  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px', borderRadius: 18,
            background: 'linear-gradient(135deg,#8b5cf6,#22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30,
            boxShadow: '0 8px 24px rgba(139,92,246,0.35)',
          }}>💬</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: 0.3,
            background: 'linear-gradient(135deg,#c4b5fd,#67e8f9)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>EvonVChat</h1>
          <p style={{ color: '#94a3b8', fontSize: 15, marginTop: 8, lineHeight: 1.5 }}>即時聊天平台 — 大廳、好友、群組，免費開始</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['公共大廳即時聊天，認識新朋友', '好友私訊、群組、動態消息', '站上還有 AI 夥伴與每日內容可互動'].map(line => (
              <li key={line} style={{ color: '#64748b', fontSize: 13 }}>· {line}</li>
            ))}
          </ul>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, border: '1px solid #334155' }}>
          {/* Tab switch */}
          <div style={{ display: 'flex', marginBottom: 20, background: '#0f172a', borderRadius: 10, padding: 4 }}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setAuthError(''); }} style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
                background: tab === t ? 'linear-gradient(135deg,#8b5cf6,#22d3ee)' : 'transparent',
                color: tab === t ? '#fff' : '#64748b', fontSize: 14, fontWeight: 600,
              }}>{t === 'login' ? '登入' : '註冊'}</button>
            ))}
          </div>

          {/* Avatar picker (register only) */}
          {tab === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6, display: 'block' }}>選擇頭像</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                {AVATAR_EMOJIS.map(e => (
                  <button key={e} onClick={() => setAvatar(e)} style={{ width: 38, height: 38, borderRadius: '50%', border: avatar === e ? '2px solid #8b5cf6' : '2px solid transparent', background: color, cursor: 'pointer', fontSize: 18 }}>{e}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          )}

          {tab === 'register' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>暱稱</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="你的暱稱" style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>電子郵件</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="your@email.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: 12, marginBottom: 4, display: 'block' }}>密碼</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
              style={inputStyle} />
          </div>

          {authError && (
            <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 14 }}>
              {authError}
            </div>
          )}

          <button onClick={tab === 'login' ? handleLogin : handleRegister} disabled={busy} style={{
            width: '100%', background: 'linear-gradient(135deg,#8b5cf6,#22d3ee)',
            border: 'none', borderRadius: 10, padding: '12px', color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 14, opacity: busy ? 0.7 : 1,
          }}>
            {busy ? '處理中...' : (tab === 'login' ? '登入' : '建立帳號')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
            <span style={{ color: '#64748b', fontSize: 12 }}>或</span>
            <div style={{ flex: 1, height: 1, background: '#334155' }} />
          </div>

          <button onClick={handleGoogleLogin} style={{
            display: 'flex', alignItems: 'center', gap: 12, background: '#fff',
            border: 'none', borderRadius: 12, padding: '12px 24px', cursor: 'pointer',
            fontSize: 15, fontWeight: 600, color: '#1f2937', width: '100%',
            justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            使用 Google 帳號登入
          </button>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link href="/community" style={{ color: '#8b5cf6', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
              了解 EvonVChat 社群功能 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
