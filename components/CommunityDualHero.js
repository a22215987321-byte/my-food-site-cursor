const HERO_STYLES = `
  @keyframes dual-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  .dual-hero-stage:has(.dual-zone-left:hover) .dual-char-wrap-left .dual-char-panel,
  .dual-hero-stage:has(.dual-zone-right:hover) .dual-char-wrap-right .dual-char-panel {
    transition: opacity 0.55s ease, transform 0.55s ease, filter 0.55s ease;
  }

  .dual-char-wrap {
    animation: dual-float 7s ease-in-out infinite;
  }
  .dual-char-wrap-right {
    animation-delay: -3.5s;
  }

  .dual-char-panel {
    opacity: 0.55;
    filter: brightness(0.88);
    transition: opacity 0.55s ease, transform 0.55s ease, filter 0.55s ease;
    will-change: transform, opacity, filter;
  }

  .dual-char-glow {
    opacity: 0.45;
    transition: opacity 0.55s ease, transform 0.55s ease;
  }

  .dual-hint {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.45s ease, transform 0.45s ease;
  }

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

  @media (prefers-reduced-motion: reduce) {
    .dual-char-wrap { animation: none; }
    .dual-char-panel,
    .dual-char-glow,
    .dual-hint {
      transition: none;
    }
  }

  @media (max-width: 767px) {
    .dual-char-wrap { animation: none; }
  }
`;

export default function CommunityDualHero({ onEnterChat, onExploreRooms }) {
  return (
    <section className="relative w-full min-h-[680px] lg:min-h-[760px] overflow-hidden bg-[#0B0D12]">
      <style>{HERO_STYLES}</style>

      {/* Mobile decorative character */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] md:hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D12]/30 via-[#0B0D12]/88 to-[#0B0D12]" />
        <img
          src="/assets/community/hero-female.png"
          alt=""
          className="absolute bottom-0 left-1/2 h-[72%] w-[120%] max-w-none -translate-x-1/2 object-cover object-top opacity-[0.22] -scale-x-100"
        />
      </div>

      {/* Desktop interactive stage */}
      <div className="dual-hero-stage absolute inset-0 z-[1] hidden md:block">
        <div className="dual-zone dual-zone-left absolute left-0 top-0 z-20 h-full w-1/2 cursor-pointer" aria-hidden="true" />
        <div className="dual-zone dual-zone-right absolute right-0 top-0 z-20 h-full w-1/2 cursor-pointer" aria-hidden="true" />

        {/* Left — female, mirrored toward center */}
        <div className="dual-char-wrap dual-char-wrap-left pointer-events-none absolute bottom-0 left-0 z-[5] h-[94%] w-[46%]">
          <div className="dual-char-panel relative h-full w-full">
            <div
              className="dual-char-glow absolute -left-[8%] bottom-[8%] h-[55%] w-[70%] rounded-full"
              style={{
                background: "radial-gradient(ellipse, rgba(124,92,255,0.42) 0%, rgba(75,123,255,0.12) 45%, transparent 72%)",
              }}
            />
            <img
              src="/assets/community/hero-female.png"
              alt="夜校走廊角色"
              className="h-full w-full object-cover object-[center_top] -scale-x-100"
            />
            <p className="dual-hint dual-hint-left absolute bottom-[14%] left-[12%] z-10 max-w-[200px] text-sm font-medium tracking-wide text-[#C4B5FD]">
              夜校走廊 · 與她開始聊天
            </p>
          </div>
        </div>

        {/* Right — male */}
        <div className="dual-char-wrap dual-char-wrap-right pointer-events-none absolute bottom-0 right-0 z-[5] h-[94%] w-[46%]">
          <div className="dual-char-panel relative h-full w-full">
            <div
              className="dual-char-glow absolute -right-[8%] bottom-[8%] h-[55%] w-[70%] rounded-full"
              style={{
                background: "radial-gradient(ellipse, rgba(124,92,255,0.42) 0%, rgba(75,123,255,0.12) 45%, transparent 72%)",
              }}
            />
            <img
              src="/assets/community/hero-male.png"
              alt="月光教室角色"
              className="h-full w-full object-cover object-[center_top]"
            />
            <p className="dual-hint dual-hint-right absolute bottom-[14%] right-[12%] z-10 max-w-[200px] text-right text-sm font-medium tracking-wide text-[#C4B5FD]">
              月光教室 · 進入他的房間
            </p>
          </div>
        </div>
      </div>

      {/* Center readability masks */}
      <div
        className="pointer-events-none absolute inset-0 z-[8]"
        style={{
          background: `
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
            )
          `,
        }}
        aria-hidden="true"
      />

      {/* Center CTA */}
      <div className="relative z-[30] mx-auto flex min-h-[680px] max-w-[640px] flex-col items-center justify-center px-6 py-16 text-center lg:min-h-[760px]">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold tracking-wider text-[#A5B4FC] backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          EVONVCHAT · 真人社群 + AI 夥伴
        </p>

        <h1 className="mb-5 text-[clamp(2rem,6vw,3.25rem)] font-extrabold leading-[1.12] tracking-tight text-[#F8FAFF]">
          今晚，想跟誰聊？
        </h1>

        <p className="mb-10 max-w-[480px] text-[clamp(0.95rem,2.2vw,1.125rem)] leading-relaxed text-[#8892A8]">
          加入即時聊天室，遇見真人，也遇見屬於你的 AI 夥伴。
        </p>

        <div className="flex w-full max-w-[400px] flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onEnterChat}
            className="rounded-[22px] bg-gradient-to-br from-[#7C5CFF] to-[#4B7BFF] px-8 py-4 text-base font-bold text-white shadow-[0_12px_40px_rgba(124,92,255,0.38)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(124,92,255,0.48)]"
          >
            免費開始聊天
          </button>
          <button
            type="button"
            onClick={onExploreRooms}
            className="rounded-[22px] border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-semibold text-[#C4CBE0] backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.07]"
          >
            探索熱門房間
          </button>
        </div>

        <p className="mt-8 hidden text-xs text-[#5C6478] md:block">
          將滑鼠移到左右角色，探索不同聊天氛圍
        </p>
      </div>
    </section>
  );
}
