import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import {
  PERSONS,
  TENSES,
  VERB_TYPES,
  conjugationTables,
  findVerb,
  getExample,
  getVerbList,
  suggestVerbs,
  teachingExamples,
  verbMetadata,
} from "../lib/spanishVerbConjugationData";

const CEFR_LEVELS = ["全部", "A1", "A2", "B1"];
const FREQUENCY_LEVELS = ["全部", "5", "4", "3"];
const REGULARITY_LEVELS = ["全部", "規則動詞", "不規則動詞", "詞幹變化動詞"];
const PRACTICE_TYPES = [
  "看中文選正確變位",
  "看人稱填寫變位",
  "選擇正確時態",
  "不規則動詞測驗",
  "錯題重練",
];

function speak(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text || text === "-") return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function PillButton({ active, children, onClick }) {
  return (
    <button type="button" className={`pill-button${active ? " active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function AudioButton({ text, label = "播放發音" }) {
  return (
    <button type="button" className="audio-button" onClick={() => speak(text)} aria-label={label} title={label}>
      ▶
    </button>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="filter-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function VerbSummary({ verb, isFavorite, onToggleFavorite }) {
  return (
    <section className="summary-card">
      <div>
        <p className="eyebrow">Spanish Verb Conjugation</p>
        <h1>西班牙語動詞變位表</h1>
        <p className="hero-copy">
          專為中文零基礎學習者設計：先看意思，再看人稱與時態，最後用例句把變位放進真實語境。
        </p>
      </div>
      <div className="verb-head">
        <div>
          <div className="verb-title-row">
            <h2>{verb.infinitive}</h2>
            <AudioButton text={verb.infinitive} label={`播放 ${verb.infinitive} 發音`} />
          </div>
          <p>{verb.zh} · {verb.en}</p>
        </div>
        <button type="button" className={`favorite-button${isFavorite ? " saved" : ""}`} onClick={onToggleFavorite}>
          {isFavorite ? "已收藏" : "收藏"}
        </button>
      </div>
      <div className="meta-grid">
        <span><strong>類型</strong>{verb.regularity}</span>
        <span><strong>助動詞</strong>{verb.auxiliary}</span>
        <span><strong>過去分詞</strong>{verb.participle}</span>
        <span><strong>現在分詞</strong>{verb.gerund}</span>
        <span><strong>CEFR</strong>{verb.cefr}</span>
        <span><strong>常用程度</strong>{"★".repeat(verb.frequency)}{"☆".repeat(5 - verb.frequency)}</span>
      </div>
    </section>
  );
}

function ConjugationCards({ selectedVerbKey, tenseFilter }) {
  const table = conjugationTables[selectedVerbKey];
  const visibleTenses = TENSES.filter((tense) => tenseFilter === "全部" || tense.key === tenseFilter);

  return (
    <section className="section-block">
      <div className="section-heading">
        <p className="eyebrow">Conjugation</p>
        <h2>完整變位卡片</h2>
      </div>
      <div className="tense-grid">
        {visibleTenses.map((tense) => (
          <article key={tense.key} className="tense-card">
            <div className="tense-card-head">
              <div>
                <h3>{tense.zh}</h3>
                <p>{tense.es}</p>
              </div>
              <span>{tense.hint}</span>
            </div>
            <div className="person-strip" role="list">
              {PERSONS.map((person, index) => {
                const form = table[tense.key][index];
                const example = getExample(selectedVerbKey, tense.key, person.key, form);
                return (
                  <div key={person.key} className="person-card" role="listitem">
                    <div className="person-top">
                      <div>
                        <strong>{person.label}</strong>
                        <small>{person.zh}</small>
                      </div>
                      <AudioButton text={form} label={`播放 ${form} 發音`} />
                    </div>
                    <div className="conjugated">{form}</div>
                    <div className="region-tag">{person.region}</div>
                    <p className="example-es">{example.es}</p>
                    <p className="example-zh">{example.zh}</p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CategoryExplorer({ verbs, onSelectVerb }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <p className="eyebrow">Verb Library</p>
        <h2>常用動詞分類</h2>
      </div>
      <div className="category-grid">
        {VERB_TYPES.map((type) => {
          const matched = verbs.filter((verb) => verb.categories.includes(type));
          return (
            <article key={type} className="category-card">
              <h3>{type}</h3>
              <div className="verb-chip-list">
                {matched.length ? matched.map((verb) => (
                  <button key={verb.infinitive} type="button" onClick={() => onSelectVerb(verb.infinitive)}>
                    {verb.infinitive}
                  </button>
                )) : <span>準備擴充更多資料</span>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TeachingSection({ onSelectVerb }) {
  const rules = [
    ["判斷詞尾", "原形最後兩個字母是 -ar、-er 或 -ir，例如 hablar、comer、vivir。"],
    ["刪除詞尾", "先拿掉 -ar / -er / -ir，留下詞幹：habl-、com-、viv-。"],
    ["加入人稱詞尾", "依照時態與人稱加上不同詞尾，例如 hablo、comes、vivimos。"],
    ["詞幹變化動詞", "部分動詞在某些人稱會改詞幹，例如 pensar → pienso。"],
    ["第一人稱不規則", "有些動詞只有 yo 特別，例如 hacer → hago、tener → tengo。"],
    ["完全不規則", "ser、ir 的多數時態不能只靠詞尾推導，需要整組記憶。"],
    ["拼字變化", "為了保留發音，c / g / z 等字母有時會改拼法，例如 buscar → busqué。"],
  ];

  return (
    <section className="section-block">
      <div className="section-heading">
        <p className="eyebrow">Beginner Guide</p>
        <h2>變位規則教學</h2>
      </div>
      <div className="rule-grid">
        {rules.map(([title, body]) => (
          <article key={title} className="rule-card">
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
      <div className="example-columns">
        <article>
          <h3>規則動詞完整示例</h3>
          <div className="verb-chip-list">
            {teachingExamples.regular.map((verb) => (
              <button key={verb} type="button" onClick={() => onSelectVerb(verb)}>{verb}</button>
            ))}
          </div>
          <p>這三個動詞分別代表 -ar、-er、-ir，可以用來理解最基本的變位框架。</p>
        </article>
        <article>
          <h3>不規則動詞完整示例</h3>
          <div className="verb-chip-list">
            {teachingExamples.irregular.map((verb) => (
              <button key={verb} type="button" onClick={() => onSelectVerb(verb)}>{verb}</button>
            ))}
          </div>
          <p>ser、estar、tener、ir、hacer 是 A1 最核心的不規則動詞，建議優先收藏與練習。</p>
        </article>
      </div>
    </section>
  );
}

function PracticeMode({ selectedVerbKey, wrongItems, setWrongItems }) {
  const [mode, setMode] = useState(PRACTICE_TYPES[0]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState("");
  const practice = useMemo(() => {
    if (mode === "錯題重練" && wrongItems.length) return wrongItems[0];
    const verbKey = mode === "不規則動詞測驗" ? "tener" : selectedVerbKey;
    const tense = mode === "選擇正確時態" ? "futuro" : "presente";
    const personIndex = mode === "看人稱填寫變位" ? 1 : 0;
    return {
      verbKey,
      tense,
      personIndex,
      answer: conjugationTables[verbKey][tense][personIndex],
    };
  }, [mode, selectedVerbKey, wrongItems]);

  const person = PERSONS[practice.personIndex];
  const verb = verbMetadata[practice.verbKey];
  const tense = TENSES.find((item) => item.key === practice.tense);
  const options = useMemo(() => {
    const base = [practice.answer, conjugationTables[practice.verbKey].presente[2], conjugationTables[practice.verbKey].futuro[0]];
    return [...new Set(base)].slice(0, 3);
  }, [practice]);

  const checkAnswer = (value) => {
    const submitted = (value || answer).trim().toLowerCase();
    const expected = practice.answer.toLowerCase();
    if (submitted === expected) {
      setResult("答對了！這個變位可以放心放進長期記憶。");
      if (mode === "錯題重練") setWrongItems((items) => items.slice(1));
    } else {
      setResult(`再看一次：正確答案是 ${practice.answer}`);
      setWrongItems((items) => [{ ...practice }, ...items].slice(0, 8));
    }
    setAnswer("");
  };

  return (
    <section className="section-block practice-panel">
      <div className="section-heading">
        <p className="eyebrow">Practice</p>
        <h2>練習模式</h2>
      </div>
      <div className="mode-tabs">
        {PRACTICE_TYPES.map((type) => (
          <PillButton key={type} active={mode === type} onClick={() => { setMode(type); setResult(""); }}>
            {type}
          </PillButton>
        ))}
      </div>
      <div className="practice-card">
        <div>
          <p className="eyebrow">{verb.infinitive} · {tense.zh}</p>
          <h3>{person.label}（{person.zh}）</h3>
          <p>{mode === "看中文選正確變位" ? `${verb.zh}，${person.zh} 的現在時是哪一個？` : "請輸入或選擇正確變位。"}</p>
        </div>
        <div className="practice-actions">
          {mode === "看人稱填寫變位" ? (
            <>
              <input value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="輸入變位，例如 eres" />
              <button type="button" onClick={() => checkAnswer()}>檢查</button>
            </>
          ) : (
            options.map((option) => (
              <button key={option} type="button" onClick={() => checkAnswer(option)}>{option}</button>
            ))
          )}
        </div>
        {result && <div className="practice-result">{result}</div>}
        <div className="wrong-count">錯題本：{wrongItems.length} 題</div>
      </div>
    </section>
  );
}

export default function Home() {
  const allVerbs = useMemo(() => getVerbList(), []);
  const [query, setQuery] = useState("ser");
  const [selectedVerbKey, setSelectedVerbKey] = useState("ser");
  const [searchError, setSearchError] = useState("");
  const [tenseFilter, setTenseFilter] = useState("全部");
  const [typeFilter, setTypeFilter] = useState("全部");
  const [cefrFilter, setCefrFilter] = useState("全部");
  const [frequencyFilter, setFrequencyFilter] = useState("全部");
  const [regularityFilter, setRegularityFilter] = useState("全部");
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [wrongItems, setWrongItems] = useState([]);

  useEffect(() => {
    setFavorites(JSON.parse(localStorage.getItem("spanishVerbFavorites") || "[]"));
    setRecent(JSON.parse(localStorage.getItem("spanishVerbRecent") || "[]"));
  }, []);

  useEffect(() => {
    localStorage.setItem("spanishVerbFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("spanishVerbRecent", JSON.stringify(recent));
  }, [recent]);

  const selectedVerb = verbMetadata[selectedVerbKey];
  const filteredVerbs = allVerbs.filter((verb) => {
    const typeOk = typeFilter === "全部" || verb.categories.includes(typeFilter);
    const cefrOk = cefrFilter === "全部" || verb.cefr === cefrFilter;
    const frequencyOk = frequencyFilter === "全部" || String(verb.frequency) === frequencyFilter;
    const regularityOk = regularityFilter === "全部" || verb.regularity === regularityFilter;
    return typeOk && cefrOk && frequencyOk && regularityOk;
  });

  const selectVerb = (verbKey) => {
    setSelectedVerbKey(verbKey);
    setQuery(verbKey);
    setSearchError("");
    setRecent((items) => [verbKey, ...items.filter((item) => item !== verbKey)].slice(0, 8));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const found = findVerb(query);
    if (found) {
      selectVerb(found);
    } else {
      setSearchError(query.trim());
    }
  };

  const toggleFavorite = () => {
    setFavorites((items) => (
      items.includes(selectedVerbKey)
        ? items.filter((item) => item !== selectedVerbKey)
        : [selectedVerbKey, ...items]
    ));
  };

  return (
    <>
      <Head>
        <title>西班牙語動詞變位表 | Spanish Verb Conjugation</title>
        <meta name="description" content="中文零基礎適用的西班牙語動詞變位表，含搜尋、篩選、收藏、最近搜尋與練習模式。" />
      </Head>
      <main className="verb-page">
        <div className="page-shell">
          <form className="search-panel" onSubmit={handleSearch}>
            <div>
              <label htmlFor="verb-search">搜尋西班牙語動詞</label>
              <div className="search-row">
                <input
                  id="verb-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ser, estar, tener, hablar, comer, vivir, ir, hacer"
                />
                <button type="submit">搜尋</button>
              </div>
            </div>
            <div className="quick-row">
              {["ser", "estar", "tener", "hablar", "comer", "vivir", "ir", "hacer"].map((verb) => (
                <button key={verb} type="button" onClick={() => selectVerb(verb)}>{verb}</button>
              ))}
            </div>
            {searchError && (
              <div className="not-found-card">
                <h3>找不到「{searchError}」的完整資料</h3>
                <p>可能是拼字、重音符號或輸入了變位形。你可以先回到常用動詞，或試試這些可能的原形。</p>
                <div className="verb-chip-list">
                  {suggestVerbs(searchError).map((verb) => (
                    <button key={verb} type="button" onClick={() => selectVerb(verb)}>{verb}</button>
                  ))}
                  <button type="button" onClick={() => selectVerb("ser")}>返回常用動詞列表</button>
                </div>
              </div>
            )}
          </form>

          <VerbSummary
            verb={selectedVerb}
            isFavorite={favorites.includes(selectedVerbKey)}
            onToggleFavorite={toggleFavorite}
          />

          <section className="utility-panel">
            <div className="filters">
              <FilterSelect label="按時態篩選" value={tenseFilter} onChange={setTenseFilter} options={["全部", ...TENSES.map((tense) => tense.key)]} />
              <FilterSelect label="按動詞類型篩選" value={typeFilter} onChange={setTypeFilter} options={["全部", ...VERB_TYPES]} />
              <FilterSelect label="按 CEFR 等級篩選" value={cefrFilter} onChange={setCefrFilter} options={CEFR_LEVELS} />
              <FilterSelect label="按常用程度篩選" value={frequencyFilter} onChange={setFrequencyFilter} options={FREQUENCY_LEVELS} />
              <FilterSelect label="按規則性篩選" value={regularityFilter} onChange={setRegularityFilter} options={REGULARITY_LEVELS} />
            </div>
            <div className="saved-panel">
              <div>
                <h3>收藏動詞</h3>
                <div className="verb-chip-list">
                  {favorites.length ? favorites.map((verb) => (
                    <button key={verb} type="button" onClick={() => selectVerb(verb)}>{verb}</button>
                  )) : <span>尚未收藏</span>}
                </div>
              </div>
              <div>
                <h3>最近搜尋</h3>
                <div className="verb-chip-list">
                  {recent.length ? recent.map((verb) => (
                    <button key={verb} type="button" onClick={() => selectVerb(verb)}>{verb}</button>
                  )) : <span>搜尋後會顯示在這裡</span>}
                </div>
              </div>
            </div>
          </section>

          <ConjugationCards selectedVerbKey={selectedVerbKey} tenseFilter={tenseFilter} />
          <CategoryExplorer verbs={filteredVerbs} onSelectVerb={selectVerb} />
          <TeachingSection onSelectVerb={selectVerb} />
          <PracticeMode selectedVerbKey={selectedVerbKey} wrongItems={wrongItems} setWrongItems={setWrongItems} />
        </div>
      </main>
      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #f6f7fb;
          color: #172033;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Noto Sans", Arial, sans-serif;
        }
        button, input, select { font: inherit; }
        .verb-page {
          min-height: 100vh;
          background:
            linear-gradient(135deg, rgba(124, 92, 255, 0.10), transparent 34%),
            linear-gradient(225deg, rgba(17, 156, 180, 0.10), transparent 30%),
            #f6f7fb;
          padding: 32px 16px 72px;
        }
        .page-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 22px;
        }
        .search-panel, .summary-card, .utility-panel, .section-block {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(133, 145, 170, 0.22);
          border-radius: 24px;
          box-shadow: 0 18px 50px rgba(31, 45, 70, 0.08);
        }
        .search-panel { padding: 22px; display: grid; gap: 16px; }
        .search-panel label, .filter-control span {
          display: block;
          margin-bottom: 8px;
          color: #58647a;
          font-size: 14px;
          font-weight: 700;
        }
        .search-row { display: flex; gap: 10px; }
        .search-row input, .practice-actions input, .filter-control select {
          width: 100%;
          min-height: 48px;
          border: 1px solid #d7deea;
          border-radius: 14px;
          background: #fff;
          color: #172033;
          padding: 0 14px;
          outline: none;
        }
        .search-row input:focus, .practice-actions input:focus, .filter-control select:focus {
          border-color: #7c5cff;
          box-shadow: 0 0 0 4px rgba(124, 92, 255, 0.12);
        }
        .search-row button, .practice-actions button {
          min-height: 48px;
          border: 0;
          border-radius: 14px;
          padding: 0 22px;
          background: #2f55d4;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
          white-space: nowrap;
        }
        .quick-row, .verb-chip-list, .mode-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .quick-row button, .verb-chip-list button, .pill-button {
          border: 1px solid #dce3ef;
          border-radius: 999px;
          background: #fff;
          color: #34415a;
          min-height: 36px;
          padding: 7px 13px;
          cursor: pointer;
          font-weight: 700;
        }
        .pill-button.active, .quick-row button:hover, .verb-chip-list button:hover {
          border-color: #7c5cff;
          background: #f1efff;
          color: #4f35c7;
        }
        .not-found-card {
          border-radius: 18px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          padding: 16px;
        }
        .not-found-card h3 { margin: 0 0 6px; }
        .not-found-card p { margin: 0 0 12px; color: #7c4a15; }
        .summary-card {
          padding: 28px;
          display: grid;
          gap: 24px;
        }
        .eyebrow {
          margin: 0 0 8px;
          color: #6a5cff;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          font-size: clamp(34px, 6vw, 68px);
          line-height: 1.05;
          letter-spacing: 0;
          color: #121a2c;
        }
        .hero-copy {
          max-width: 740px;
          margin: 16px 0 0;
          color: #58647a;
          font-size: 18px;
          line-height: 1.7;
        }
        .verb-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 18px;
          padding-top: 4px;
          border-top: 1px solid #edf0f6;
        }
        .verb-title-row { display: flex; align-items: center; gap: 10px; }
        .verb-head h2 { margin: 0; font-size: 42px; color: #2f55d4; }
        .verb-head p { margin: 6px 0 0; color: #58647a; font-size: 17px; }
        .audio-button {
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: #ecf4ff;
          color: #2f55d4;
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .favorite-button {
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid #dce3ef;
          background: #fff;
          color: #2f55d4;
          cursor: pointer;
          font-weight: 800;
        }
        .favorite-button.saved { background: #2f55d4; color: #fff; border-color: #2f55d4; }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }
        .meta-grid span {
          min-height: 74px;
          border-radius: 16px;
          background: #f7f9fd;
          border: 1px solid #edf0f6;
          padding: 12px;
          color: #1d2a42;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
        }
        .meta-grid strong { color: #6c768a; font-size: 12px; }
        .utility-panel { padding: 20px; display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; }
        .filters { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
        .saved-panel {
          display: grid;
          gap: 14px;
          padding: 16px;
          border-radius: 18px;
          background: #f7f9fd;
        }
        .saved-panel h3 { margin: 0 0 8px; font-size: 16px; }
        .section-block { padding: 24px; }
        .section-heading { margin-bottom: 18px; }
        .section-heading h2 { margin: 0; font-size: 30px; color: #121a2c; }
        .tense-grid { display: grid; gap: 16px; }
        .tense-card {
          border: 1px solid #e5ebf4;
          border-radius: 20px;
          background: #fff;
          overflow: hidden;
        }
        .tense-card-head {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 16px;
          padding: 18px;
          background: #f8faff;
          border-bottom: 1px solid #e5ebf4;
        }
        .tense-card-head h3 { margin: 0; font-size: 22px; }
        .tense-card-head p, .tense-card-head span { margin: 4px 0 0; color: #647086; line-height: 1.55; }
        .person-strip {
          display: grid;
          grid-template-columns: repeat(6, minmax(176px, 1fr));
          gap: 12px;
          padding: 16px;
          overflow-x: auto;
        }
        .person-card {
          min-width: 176px;
          border-radius: 16px;
          border: 1px solid #e8eef6;
          background: #fff;
          padding: 14px;
        }
        .person-top { display: flex; justify-content: space-between; gap: 8px; }
        .person-top strong, .person-top small { display: block; }
        .person-top small, .example-zh { color: #66728a; }
        .conjugated {
          margin: 12px 0 8px;
          color: #2f55d4;
          font-size: 24px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }
        .region-tag {
          display: inline-flex;
          min-height: 28px;
          align-items: center;
          border-radius: 999px;
          background: #edf8f6;
          color: #157a6e;
          padding: 4px 9px;
          font-size: 12px;
          font-weight: 800;
        }
        .example-es, .example-zh { margin: 10px 0 0; line-height: 1.55; font-size: 14px; }
        .example-es { color: #26344f; font-weight: 700; }
        .category-grid, .rule-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .category-card, .rule-card, .example-columns article, .practice-card {
          border: 1px solid #e5ebf4;
          border-radius: 18px;
          background: #fff;
          padding: 16px;
        }
        .category-card h3, .rule-card h3, .example-columns h3, .practice-card h3 { margin: 0 0 10px; }
        .rule-card p, .example-columns p, .practice-card p { margin: 0; color: #647086; line-height: 1.65; }
        .example-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
        .practice-panel { display: grid; gap: 14px; }
        .practice-card { display: grid; gap: 16px; }
        .practice-actions { display: flex; flex-wrap: wrap; gap: 10px; }
        .practice-actions input { max-width: 320px; }
        .practice-result {
          border-radius: 14px;
          background: #eef9f1;
          color: #176b35;
          padding: 12px;
          font-weight: 800;
        }
        .wrong-count { color: #647086; font-size: 14px; }
        @media (max-width: 1100px) {
          .meta-grid { grid-template-columns: repeat(3, 1fr); }
          .utility-panel { grid-template-columns: 1fr; }
          .filters, .category-grid, .rule-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 720px) {
          .verb-page { padding: 16px 12px 48px; }
          .search-row, .verb-head, .practice-actions { flex-direction: column; align-items: stretch; }
          .summary-card, .section-block, .search-panel, .utility-panel { border-radius: 18px; padding: 16px; }
          .meta-grid, .filters, .category-grid, .rule-grid, .example-columns { grid-template-columns: 1fr; }
          .tense-card-head { grid-template-columns: 1fr; }
          .person-strip { grid-template-columns: repeat(6, 220px); }
          .verb-head h2 { font-size: 34px; }
          .favorite-button, .search-row button { width: 100%; }
        }
      `}</style>
    </>
  );
}
