import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import SiteNav from "../components/SiteNav";
import LangToggle from "../components/LangToggle";
import { QUICK_EXAMPLES, enhancePrompt } from "../lib/aiPromptEnhancer";
import { COPY, LANG_STORAGE_KEY, getInitialLang } from "../lib/aiPromptEnhancerI18n";

function CopyButton({ text, label, copiedLabel }) {
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
    <button type="button" className={`ape-copy-btn${copied ? " copied" : ""}`} onClick={handleCopy}>
      {copied ? copiedLabel : label}
    </button>
  );
}

export default function AiPromptEnhancerPage() {
  const workspaceRef = useRef(null);
  const [lang, setLang] = useState("zh");
  const [idea, setIdea] = useState("");
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

  const runEnhance = (nextIdea, variant = "normal") => {
    const trimmed = String(nextIdea || "").trim();
    if (!trimmed) return;
    setBusy(true);
    window.setTimeout(() => {
      setResult(enhancePrompt(trimmed, { variant }));
      setBusy(false);
    }, 420);
  };

  const handleEnhance = () => {
    if (!idea.trim()) return;
    runEnhance(idea, "normal");
  };

  const handleRefine = (variant) => {
    if (!idea.trim()) return;
    runEnhance(idea, variant);
  };

  const fillExample = (text) => {
    setIdea(text);
    scrollToWorkspace();
  };

  return (
    <>
      <Head>
        <title>{t.metaTitle}</title>
        <meta name="description" content={t.metaDescription} />
        <link rel="stylesheet" href="/ai-prompt-enhancer.css?v=4" />
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
            <p className="ape-hero-subtitle-primary">{t.heroSubtitleZh}</p>
            <p className="ape-hero-subtitle-secondary">{t.heroSubtitleEn}</p>
            <p className="ape-hero-explain">{t.heroExplainZh}</p>
            <p className="ape-hero-explain-muted">{t.heroExplainEn}</p>

            <button type="button" className="ape-hero-cta" onClick={scrollToWorkspace}>
              {t.heroCta}
            </button>
          </section>

          <section className="ape-workspace" id="workspace" ref={workspaceRef}>
            <div className="ape-panel ape-panel-input">
              <div className="ape-input-helper">
                <p>{t.inputHelperZh}</p>
                <p className="muted">{t.inputHelperEn}</p>
              </div>

              <label htmlFor="idea-input" className="ape-label">
                {t.inputLabel}
              </label>
              <textarea
                id="idea-input"
                className="ape-textarea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder={t.inputPlaceholder}
              />

              <div className="ape-quick-examples">
                {QUICK_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    className="ape-quick-btn"
                    onClick={() => fillExample(example)}
                  >
                    {example}
                  </button>
                ))}
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

            <div className="ape-panel ape-panel-output">
              <h2 className="ape-panel-title">{t.resultsTitle}</h2>

              {!result ? (
                <div className="ape-empty">
                  <p>{t.resultsEmpty}</p>
                </div>
              ) : (
                <div className="ape-result-blocks">
                  <section className="ape-result-block ape-result-block-main">
                    <div className="ape-result-head">
                      <h3 className="ape-result-label">{t.enhancedTitle}</h3>
                      <CopyButton
                        text={result.enhanced}
                        label={t.copyPrompt}
                        copiedLabel={t.copiedPrompt}
                      />
                    </div>
                    <p className="ape-result-prompt">{result.enhanced}</p>
                  </section>

                  <section className="ape-result-block">
                    <h3 className="ape-result-label">{t.bestForTitle}</h3>
                    <div className="ape-badge-row">
                      {result.bestFor.map((item) => (
                        <span key={item} className="ape-result-badge">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="ape-result-block">
                    <h3 className="ape-result-label">{t.useInTitle}</h3>
                    <div className="ape-tag-row">
                      {result.useIn.map((item) => (
                        <span key={item} className="ape-tool-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="ape-result-block">
                    <h3 className="ape-result-label">{t.improvedTitle}</h3>
                    <ul className="ape-checklist">
                      {result.improved.map((key) => (
                        <li key={key}>{t.improvedItems[key]}</li>
                      ))}
                    </ul>
                  </section>

                  <div className="ape-refine-actions">
                    <CopyButton
                      text={result.enhanced}
                      label={t.copyPrompt}
                      copiedLabel={t.copiedPrompt}
                    />
                    <button type="button" className="ape-refine-btn" onClick={() => handleRefine("shorter")}>
                      {t.refineShorter}
                    </button>
                    <button type="button" className="ape-refine-btn" onClick={() => handleRefine("cinematic")}>
                      {t.refineCinematic}
                    </button>
                    <button type="button" className="ape-refine-btn" onClick={() => handleRefine("realistic")}>
                      {t.refineRealistic}
                    </button>
                    <button type="button" className="ape-refine-btn" onClick={() => handleRefine("detailed")}>
                      {t.refineDetailed}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="ape-info-card">
            <h2 className="ape-info-title">{t.whyStrongerTitle}</h2>
            <p className="ape-info-body">{t.whyStrongerBody}</p>
          </section>

          <section className="ape-section">
            <h2 className="ape-section-title">{t.whereTitle}</h2>
            <div className="ape-where-grid">
              {t.whereTools.map((tool) => (
                <article key={tool.name} className="ape-where-card">
                  <h3 className="ape-where-name">{tool.name}</h3>
                  <p className="ape-where-desc">{tool.desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="ape-beginner-note">
            <p>{t.beginnerNoteZh}</p>
            <p className="muted">{t.beginnerNoteEn}</p>
          </section>
        </main>
      </div>
    </>
  );
}
