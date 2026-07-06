const HERO_GIRL = "/assets/community/hero-girl.png";
const HERO_BOY = "/assets/community/hero-boy.png";

const HERO_STYLES = `
  .dual-hero {
    position: relative;
    width: 100%;
    min-height: 680px;
    overflow: hidden;
    background: #0B0D12;
  }
  @media (min-width: 768px) {
    .dual-hero { min-height: 760px; }
  }

  @keyframes dual-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .dual-hero-stage {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: none;
  }
  @media (min-width: 768px) {
    .dual-hero-stage { display: block; }
  }

  .dual-hero-mobile {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    display: block;
  }
  @media (min-width: 768px) {
    .dual-hero-mobile { display: none; }
  }

  .dual-hero-mobile-img {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 120%;
    height: 72%;
    max-width: none;
    transform: translateX(-50%) scaleX(-1);
    object-fit: cover;
    object-position: center top;
    opacity: 0.65;
  }

  .dual-zone-left,
  .dual-zone-right {
    position: absolute;
    top: 0;
    height: 100%;
    width: 50%;
    z-index: 3;
    cursor: pointer;
  }
  .dual-zone-left { left: 0; }
  .dual-zone-right { right: 0; }

  .dual-char-wrap {
    position: absolute;
    bottom: 0;
    width: 46%;
    height: 94%;
    z-index: 1;
    pointer-events: none;
    animation: dual-float 7s ease-in-out infinite;
  }
  .dual-char-wrap-left { left: 0; }
  .dual-char-wrap-right { right: 0; animation-delay: -3.5s; }

  .dual-char-panel {
    position: relative;
    width: 100%;
    height: 100%;
    opacity: 0.65;
    transition: opacity 0.55s ease, transform 0.55s ease, filter 0.55s ease;
    will-change: transform, opacity, filter;
  }

  .dual-char-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
  }
  .dual-char-img.mirror { transform: scaleX(-1); }

  .dual-char-glow {
    position: absolute;
    bottom: 8%;
    height: 55%;
    width: 70%;
    border-radius: 50%;
    opacity: 0.45;
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  .dual-char-glow-left { left: -8%; }
  .dual-char-glow-right { right: -8%; }

  .dual-hint {
    position: absolute;
    bottom: 14%;
    z-index: 10;
    max-width: 200px;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: #C4B5FD;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.45s ease, transform 0.45s ease;
  }
  .dual-hint-left { left: 12%; }
  .dual-hint-right { right: 12%; text-align: right; }

  .dual-hero-stage:has(.dual-zone-left:hover) .dual-char-wrap-left .dual-char-panel {
    opacity: 1;
    transform: scale(1.06) translateX(18px);
    filter: brightness(1.12);
  }
  .dual-hero-stage:has(.dual-zone-left:hover) .dual-char-wrap-left .dual-char-glow {
    opacity: 1;
    transform: scale(1.1);
  }
  .dual-hero-stage:has(.dual-zone-left:hover) .dual-char-wrap-right .dual-char-panel {
    opacity: 0.28;
    filter: blur(1px) brightness(0.7);
    transform: scale(0.98);
  }
  .dual-hero-stage:has(.dual-zone-left:hover) .dual-hint-left {
    opacity: 1;
    transform: translateY(0);
  }

  .dual-hero-stage:has(.dual-zone-right:hover) .dual-char-wrap-right .dual-char-panel {
    opacity: 1;
    transform: scale(1.06) translateX(-18px);
    filter: brightness(1.12);
  }
  .dual-hero-stage:has(.dual-zone-right:hover) .dual-char-wrap-right .dual-char-glow {
    opacity: 1;
    transform: scale(1.1);
  }
  .dual-hero-stage:has(.dual-zone-right:hover) .dual-char-wrap-left .dual-char-panel {
    opacity: 0.28;
    filter: blur(1px) brightness(0.7);
    transform: scale(0.98);
  }
  .dual-hero-stage:has(.dual-zone-right:hover) .dual-hint-right {
    opacity: 1;
    transform: translateY(0);
  }

  .dual-hero-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    opacity: 0.15;
    background:
      linear-gradient(90deg,
        #0B0D12 0%,
        rgba(11,13,18,0.55) 18%,
        rgba(0,0,0,0.82) 42%,
        rgba(0,0,0,0.82) 58%,
        rgba(11,13,18,0.55) 82%,
        #0B0D12 100%
      ),
      linear-gradient(180deg,
        rgba(11,13,18,0.2) 0%,
        transparent 35%,
        transparent 65%,
        #0B0D12 100%
      );
  }

  .dual-hero-cta {
    position: relative;
    z-index: 10;
    display: flex;
    min-height: 680px;
    max-width: 640px;
    margin: 0 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
  }
  @media (min-width: 768px) {
    .dual-hero-cta { min-height: 760px; }
  }

  .dual-hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    padding: 8px 14px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #A5B4FC;
  }
  .dual-hero-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 8px rgba(52,211,153,0.8);
  }
  .dual-hero-title {
    margin: 0 0 20px;
    font-size: clamp(2rem, 6vw, 3.25rem);
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: -0.02em;
    color: #F8FAFF;
  }
  .dual-hero-sub {
    margin: 0 0 40px;
    max-width: 480px;
    font-size: clamp(0.95rem, 2.2vw, 1.125rem);
    line-height: 1.65;
    color: #8892A8;
  }
  .dual-hero-actions {
    display: flex;
    width: 100%;
    max-width: 400px;
    flex-direction: column;
    gap: 12px;
  }
  @media (min-width: 640px) {
    .dual-hero-actions { flex-direction: row; justify-content: center; }
  }
  .dual-btn-primary {
    background: linear-gradient(135deg, #7C5CFF 0%, #4B7BFF 100%);
    color: #fff;
    border: none;
    border-radius: 22px;
    padding: 16px 32px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 12px 40px rgba(124,92,255,0.38);
  }
  .dual-btn-ghost {
    background: rgba(255,255,255,0.04);
    color: #C4CBE0;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 22px;
    padding: 16px 32px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
  }
  .dual-hero-tip {
    margin-top: 32px;
    font-size: 12px;
    color: #5C6478;
    display: none;
  }
  @media (min-width: 768px) {
    .dual-hero-tip { display: block; }
  }

  @media (prefers-reduced-motion: reduce) {
    .dual-char-wrap { animation: none; }
    .dual-char-panel, .dual-char-glow, .dual-hint { transition: none; }
  }
  @media (max-width: 767px) {
    .dual-char-wrap { animation: none; }
  }
`;

const GLOW_BG = "radial-gradient(ellipse, rgba(124,92,255,0.42) 0%, rgba(75,123,255,0.12) 45%, transparent 72%)";

export default function CommunityDualHero({ onEnterChat, onExploreRooms }) {
  return (
    <section className="dual-hero">
      <style>{HERO_STYLES}</style>

      {/* Mobile */}
      <div className="dual-hero-mobile" aria-hidden="true">
        <img src={HERO_GIRL} alt="" className="dual-hero-mobile-img" />
      </div>

      {/* Desktop */}
      <div className="dual-hero-stage">
        <div className="dual-zone-left" aria-hidden="true" />
        <div className="dual-zone-right" aria-hidden="true" />

        <div className="dual-char-wrap dual-char-wrap-left">
          <div className="dual-char-panel">
            <div className="dual-char-glow dual-char-glow-left" style={{ background: GLOW_BG }} />
            <img src={HERO_GIRL} alt="夜校走廊角色" className="dual-char-img mirror" />
            <p className="dual-hint dual-hint-left">夜校走廊 · 與她開始聊天</p>
          </div>
        </div>

        <div className="dual-char-wrap dual-char-wrap-right">
          <div className="dual-char-panel">
            <div className="dual-char-glow dual-char-glow-right" style={{ background: GLOW_BG }} />
            <img src={HERO_BOY} alt="月光教室角色" className="dual-char-img" />
            <p className="dual-hint dual-hint-right">月光教室 · 進入他的房間</p>
          </div>
        </div>
      </div>

      <div className="dual-hero-overlay" aria-hidden="true" />

      <div className="dual-hero-cta">
        <p className="dual-hero-badge">
          <span className="dual-hero-badge-dot" />
          EVONVCHAT · 真人社群 + AI 夥伴
        </p>
        <h1 className="dual-hero-title">今晚，想跟誰聊？</h1>
        <p className="dual-hero-sub">
          加入即時聊天室，遇見真人，也遇見屬於你的 AI 夥伴。
        </p>
        <div className="dual-hero-actions">
          <button type="button" className="dual-btn-primary" onClick={onEnterChat}>
            免費開始聊天
          </button>
          <button type="button" className="dual-btn-ghost" onClick={onExploreRooms}>
            探索熱門房間
          </button>
        </div>
        <p className="dual-hero-tip">將滑鼠移到左右角色，探索不同聊天氛圍</p>
      </div>
    </section>
  );
}
