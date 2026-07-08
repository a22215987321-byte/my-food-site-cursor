import { useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import SiteNav from "../components/SiteNav";
import {
  OUTPUT_TYPES,
  STYLES,
  PROMPT_EXAMPLES,
  enhancePrompt,
  getExampleResult,
} from "../lib/aiPromptEnhancer";

function CopyButton({ text }) {
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
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function OutputCard({ title, text }) {
  if (!text) return null;
  return (
    <div className="ape-output-card">
      <div className="ape-output-head">
        <span className="ape-output-title">{title}</span>
        <CopyButton text={text} />
      </div>
      <p className="ape-output-text">{text}</p>
    </div>
  );
}

export default function AiPromptEnhancerPage() {
  const workspaceRef = useRef(null);
  const [idea, setIdea] = useState("");
  const [outputType, setOutputType] = useState("image");
  const [style, setStyle] = useState("Realistic");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const runEnhance = (nextIdea, nextType, nextStyle) => {
    const trimmed = String(nextIdea || "").trim();
    if (!trimmed) return;
    setBusy(true);
    window.setTimeout(() => {
      setResult(enhancePrompt(trimmed, nextType, nextStyle));
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

  return (
    <>
      <Head>
        <title>AI Prompt Enhancer — EvonVChat</title>
        <meta
          name="description"
          content="Turn simple Chinese or English ideas into high-quality AI image and video prompts."
        />
        <link rel="stylesheet" href="/ai-prompt-enhancer.css?v=1" />
      </Head>

      <div className="ape-page">
        <div className="ape-ambient" />
        <SiteNav />

        <main className="ape-wrap">
          <section className="ape-hero">
            <div className="ape-badge">
              <span className="ape-badge-dot" />
              EvonVChat Tools
            </div>
            <h1 className="ape-title">AI Prompt Enhancer</h1>
            <p className="ape-subtitle">
              Turn simple ideas into high-quality AI image and video prompts.
            </p>
            <p className="ape-subtitle-zh">
              把簡單中文想法變成可直接使用的英文 AI 圖片 / 影片提示詞。
            </p>
            <button type="button" className="ape-hero-cta" onClick={scrollToWorkspace}>
              Try It Now
            </button>
          </section>

          <section className="ape-workspace" id="workspace" ref={workspaceRef}>
            <div className="ape-panel">
              <h2 className="ape-panel-title">Prompt Studio</h2>

              <label className="ape-label" htmlFor="idea-input">
                Describe your idea
              </label>
              <textarea
                id="idea-input"
                className="ape-textarea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="例如：一個白人瘦子對著鏡子，逼真動態，有電影感"
              />

              <div className="ape-options">
                <div className="ape-option-group">
                  <span className="ape-label">Output Type</span>
                  <div className="ape-chips">
                    {OUTPUT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        className={`ape-chip${outputType === type.id ? " active" : ""}`}
                        onClick={() => setOutputType(type.id)}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ape-option-group">
                  <span className="ape-label">Style</span>
                  <div className="ape-chips">
                    {STYLES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`ape-chip${style === item ? " active" : ""}`}
                        onClick={() => setStyle(item)}
                      >
                        {item}
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
                {busy ? "Enhancing..." : "Enhance Prompt"}
              </button>
            </div>

            <div className="ape-panel">
              <h2 className="ape-panel-title">Results</h2>
              {!result ? (
                <div className="ape-empty">
                  Enter an idea and click Enhance Prompt. Your enhanced English prompt,
                  short version, negative prompt, and usage tips will appear here.
                </div>
              ) : (
                <div className="ape-output-grid">
                  <OutputCard title="Enhanced Prompt" text={result.enhanced} />
                  <OutputCard title="Short Version" text={result.short} />
                  <OutputCard title="Negative Prompt" text={result.negative} />
                  <OutputCard title="Usage Tips" text={result.tips} />
                </div>
              )}
            </div>
          </section>

          <section className="ape-section">
            <div className="ape-section-label">Examples</div>
            <h2 className="ape-section-title">Start from a proven prompt</h2>
            <div className="ape-examples-grid">
              {PROMPT_EXAMPLES.map((example) => {
                const preview = getExampleResult(example);
                return (
                  <article key={example.id} className="ape-example-card">
                    <h3 className="ape-example-title">{example.title}</h3>
                    <div className="ape-example-block">
                      <span className="ape-example-label">Before prompt</span>
                      <p className="ape-example-text">{example.before}</p>
                    </div>
                    <div className="ape-example-block">
                      <span className="ape-example-label">After prompt</span>
                      <p className="ape-example-text after">{preview.short}</p>
                    </div>
                    <button
                      type="button"
                      className="ape-use-btn"
                      onClick={() => applyExample(example)}
                    >
                      Use Example
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="ape-product">
            <span className="ape-product-badge">Prompt Pro Pack</span>
            <h2 className="ape-product-title">Prompt Pro Pack — US$9</h2>
            <p className="ape-product-price">One-time purchase · Instant access</p>
            <ul className="ape-product-list">
              <li>100 high-quality image prompts</li>
              <li>50 video prompts</li>
              <li>20 camera movement prompts</li>
              <li>20 character consistency prompts</li>
              <li>10 negative prompt templates</li>
            </ul>
            <Link href="/community#waitlist" className="ape-buy-btn">
              Buy Now
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
