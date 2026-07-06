const HERO_GIRL = "/assets/community/hero-girl.png";
const HERO_BOY = "/assets/community/hero-boy.png";

export default function CommunityDualHero({ onEnterChat, onExploreRooms }) {
  return (
    <section className="dual-hero">
      <div className="dual-hero-mobile" aria-hidden="true">
        <img src={HERO_GIRL} alt="" className="dual-hero-mobile-img" />
      </div>

      <div className="dual-hero-stage">
        <div className="dual-zone-left" aria-hidden="true" />
        <div className="dual-zone-right" aria-hidden="true" />

        <div className="dual-char-wrap dual-char-wrap-left">
          <div className="dual-char-panel dual-char-panel-left">
            <div className="dual-char-glow dual-char-glow-left" />
            <img src={HERO_GIRL} alt="夜校走廊角色" className="dual-char-img dual-char-img-left" />
            <p className="dual-hint dual-hint-left">夜校走廊 · 與她開始聊天</p>
          </div>
        </div>

        <div className="dual-char-wrap dual-char-wrap-right">
          <div className="dual-char-panel dual-char-panel-right">
            <div className="dual-char-glow dual-char-glow-right" />
            <img src={HERO_BOY} alt="月光教室角色" className="dual-char-img dual-char-img-right" />
            <p className="dual-hint dual-hint-right">月光教室 · 進入他的房間</p>
          </div>
        </div>
      </div>

      <div className="dual-hero-overlay-bottom" aria-hidden="true" />
      <div className="dual-hero-overlay-center" aria-hidden="true" />

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
