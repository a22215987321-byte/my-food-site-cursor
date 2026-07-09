import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import LangToggle from "../components/LangToggle";
import {
  OUTPUT_TYPES,
  STYLES,
  PROMPT_EXAMPLES,
  enhancePrompt,
  getExampleResult,
} from "../lib/aiPromptEnhancer";
import {
  COPY,
  LANG_STORAGE_KEY,
  getInitialLang,
  getTypeLabel,
  getStyleLabel,
} from "../lib/aiPromptEnhancerI18n";

function CopyButton({ text, copyLabel, copiedLabel }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className={`ape-copy-btn${copied ? " copied" : ""}`}
      onClick={handleCopy}
    >
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}

function OutputCard({ title, text, copyLabel, copiedLabel }) {
  if (!text) return null;
  return (
    <div className="ape-output-card">
      <div className="ape-output-head">
        <span className="ape-output-title">{title}</span>
        <CopyButton text={text} copyLabel={copyLabel} copiedLabel={copiedLabel} />
      </div>
      <p className="ape-output-text">{text}</p>
    </div>
  );
}

export default function AiPromptEnhancerPage() {
  const workspaceRef = useRef(null);
  const [lang, setLang] = useState("zh");
  const [idea, setIdea] = useState("");
  const [outputType, setOutputType] = useState("image");
  const [style, setStyle] = useState("Realistic");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLang(getInitialLang());
  }, []);

  const setLanguage = (next) => {
    setLang(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    }
  };

  const t = COPY[lang];

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runEnhance = (nextIdea, nextType, nextStyle, tipsText = COPY[lang].usageTips) => {
    const trimmed = String(nextIdea || "").trim();
    if (!trimmed) return;
    setBusy(true);
    window.setTimeout(() => {
      const output = enhancePrompt(trimmed, nextType, nextStyle);
      setResult({ ...output, tips: tipsText });
      setBusy(false);
    }, 420);
  };

  const handleEnhance = () => {
    if (!idea.trim()) return;
    runEnhance(idea, outputType, style);
  };

  const applyExample = (example) => {
    setIdea(example.before);
    setOutputType(example.outputType);
    setStyle(example.style);
    runEnhance(example.before, example.outputType, example.style);
    scrollToWorkspace();
  };

  useEffect(() => {
    if (result) {
      setResult((prev) => (prev ? { ...prev, tips: COPY[lang].usageTips } : prev));
    }
  }, [lang]);

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDescription} />
        <link rel="stylesheet" href="/ai-prompt-enhancer.css?v=3" />
      </Head>

      <div className="ape-page">
        <div className="ape-ambient" />
        <SiteNav extra={<LangToggle lang={lang} onChange={setLanguage} />} />

        <main className="ape-wrap">
          <section className="ape-hero">
            <div className="ape-hero-top">
              <div className="ape-badge">
                <span className="ape-badge-dot" />
                {t.badge}
              </div>
              <div className="ape-hero-lang-mobile">
                <LangToggle lang={lang} onChange={setLanguage} />
              </div>
            </div>
            <h1 className="ape-title">{t.heroTitle}</h1>
            <p className="ape-subtitle">{t.heroSubtitle}</p>
            <button type="button" className="ape-hero-cta" onClick={scrollToWorkspace}>
              {t.heroCta}
            </button>
          </section>

          <section className="ape-steps">
            <div className="ape-section-label">{t.howItWorksLabel}</div>
            <div className="ape-steps-grid">
              {t.howItWorks.map((item) => (
                <article key={item.step} className="ape-step-card">
                  <div className="ape-step-num">
                    {t.stepPrefix} {item.step}
                  </div>
                  <h3 className="ape-step-title">{item.title}</h3>
                  <p className="ape-step-body">{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ape-workspace" id="workspace" ref={workspaceRef}>
            <div className="ape-panel">
              <h2 className="ape-panel-title">{t.studioTitle}</h2>

              <label htmlFor="idea-input" className="ape-label">
                {t.ideaLabel}
              </label>
              <textarea
                id="idea-input"
                className="ape-textarea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={t.ideaPlaceholder}
              />

              <div className="ape-options">
                <div className="ape-option-group">
                  <span className="ape-label">{t.outputTypeLabel}</span>
                  <div className="ape-chips">
                    {OUTPUT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        className={`ape-chip${outputType === type.id ? " active" : ""}`}
                        onClick={() => setOutputType(type.id)}
                      >
                        {getTypeLabel(type, lang)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ape-option-group">
                  <span className="ape-label">{t.styleLabel}</span>
                  <div className="ape-chips">
                    {STYLES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`ape-chip${style === item.id ? " active" : ""}`}
                        onClick={() => setStyle(item.id)}
                      >
                        {getStyleLabel(item, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="ape-enhance-btn"
                onClick={handleEnhance}
                disabled={busy || !idea.trim()}
              >
                {busy ? t.enhancingBtn : t.enhanceBtn}
              </button>
            </div>

            <div className="ape-panel">
              <h2 className="ape-panel-title">{t.resultsTitle}</h2>

              <div className="ape-results-note">
                <p>{t.resultsNote}</p>
              </div>

              {!result ? (
                <div className="ape-empty">
                  <p>{t.resultsEmpty}</p>
                </div>
              ) : (
                <div className="ape-output-grid">
                  <OutputCard
                    title={t.enhancedTitle}
                    text={result.enhanced}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                  />
                  <OutputCard
                    title={t.shortTitle}
                    text={result.short}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                  />
                  <OutputCard
                    title={t.negativeTitle}
                    text={result.negative}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                  />
                  <OutputCard
                    title={t.tipsTitle}
                    text={result.tips}
                    copyLabel={t.copyBtn}
                    copiedLabel={t.copiedBtn}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="ape-section">
            <div className="ape-section-label">{t.useCasesLabel}</div>
            <h2 className="ape-section-title">{t.useCasesTitle}</h2>
            <div className="ape-use-grid">
              {t.useCases.map((card) => (
                <article key={card.title} className="ape-use-card">
                  <h3 className="ape-use-title">{card.title}</h3>
                  <p className="ape-use-tools">{card.tools}</p>
                  <p className="ape-use-body">{card.uses}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ape-section">
            <div className="ape-section-label">{t.examplesLabel}</div>
            <h2 className="ape-section-title">{t.examplesTitle}</h2>
            <div className="ape-examples-grid">
              {PROMPT_EXAMPLES.map((example) => {
                const preview = getExampleResult(example);
                return (
                  <article key={example.id} className="ape-example-card">
                    <h3 className="ape-example-title">{example.title}</h3>
                    <div className="ape-example-block">
                      <span className="ape-example-label">{t.beforeLabel}</span>
                      <p className="ape-example-text">{example.before}</p>
                    </div>
                    <div className="ape-example-block">
                      <span className="ape-example-label">{t.afterLabel}</span>
                      <p className="ape-example-text after">{preview.short}</p>
                    </div>
                    <button
                      type="button"
                      className="ape-use-btn"
                      onClick={() => applyExample(example)}
                    >
                      {t.useExampleBtn}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="ape-product">
            <span className="ape-product-badge">{t.productBadge}</span>
            <h2 className="ape-product-title">{t.productTitle}</h2>
            <p className="ape-product-price">{t.productPrice}</p>
            <ul className="ape-product-list">
              {t.productItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/community#waitlist" className="ape-buy-btn">
              {t.buyBtn}
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
