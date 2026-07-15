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
import {
  A1_AUTO_QUESTION_COUNT,
  A1_EXAM_QUESTIONS,
  A1_EXAM_SECTIONS,
} from "../lib/spanishA1ExamData";

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

function A1ComprehensiveExam() {
  const [started, setStarted] = useState(false);
  const [activeSection, setActiveSection] = useState("reading");
  const [answers, setAnswers] = useState({});
  const [checks, setChecks] = useState({});
  const [showSamples, setShowSamples] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState("");

  const objectiveQuestions = A1_EXAM_QUESTIONS.filter((question) => question.type === "choice");
  const answeredObjective = objectiveQuestions.filter((question) => answers[question.id]).length;
  const score = objectiveQuestions.filter((question) => answers[question.id] === question.answer).length;
  const percentage = Math.round((score / A1_AUTO_QUESTION_COUNT) * 100);
  const visibleQuestions = A1_EXAM_QUESTIONS.filter((question) => question.section === activeSection);
  const currentSection = A1_EXAM_SECTIONS.find((section) => section.key === activeSection);

  const sectionScore = (sectionKey) => {
    const questions = objectiveQuestions.filter((question) => question.section === sectionKey);
    if (!questions.length) return null;
    return {
      correct: questions.filter((question) => answers[question.id] === question.answer).length,
      total: questions.length,
    };
  };

  const beginExam = () => {
    setAnswers({});
    setChecks({});
    setShowSamples({});
    setSubmitted(false);
    setNotice("");
    setActiveSection("reading");
    setStarted(true);
  };

  const submitExam = () => {
    const missing = A1_AUTO_QUESTION_COUNT - answeredObjective;
    if (missing > 0) {
      setNotice(`還有 ${missing} 題客觀題未作答，完成後才能交卷。`);
      return;
    }
    setNotice("");
    setSubmitted(true);
  };

  const goToSection = (sectionKey) => {
    setActiveSection(sectionKey);
    setNotice("");
  };

  if (!started) {
    return (
      <section className="section-block a1-exam-panel" id="a1-exam">
        <div className="exam-intro">
          <div>
            <p className="eyebrow">A1 Spanish Exam</p>
            <h2>西班牙語 DELE A1 模擬考</h2>
            <p>依 DELE A1 題型設計閱讀、聽力、寫作與口說四大科。選擇題立即計分，寫作與口說提供參考答案及自我檢核。</p>
          </div>
          <button type="button" className="exam-primary" onClick={beginExam}>開始 A1 模擬考</button>
        </div>
        <div className="exam-overview-grid">
          {A1_EXAM_SECTIONS.map((section, index) => (
            <article key={section.key}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{section.label} <small>{section.es}</small></h3>
                <p>{section.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="exam-facts">
          <span><strong>23</strong> 個完整任務</span>
          <span><strong>18</strong> 題自動計分</span>
          <span><strong>95</strong> 分鐘筆試時間</span>
          <span><strong>60%</strong> A1 達標參考</span>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="section-block a1-exam-panel" id="a1-exam">
        <div className="exam-result-head">
          <div className={`score-ring ${percentage >= 60 ? "passed" : "needs-work"}`}>
            <strong>{percentage}</strong><span>分</span>
          </div>
          <div>
            <p className="eyebrow">Exam Result</p>
            <h2>{percentage >= 80 ? "A1 基礎很穩定" : percentage >= 60 ? "已達 A1 入門標準" : "再複習一次就更接近 A1"}</h2>
            <p>客觀題答對 {score} / {A1_AUTO_QUESTION_COUNT}。寫作與口說屬自我檢核，不列入自動分數。</p>
          </div>
        </div>
        <div className="result-breakdown">
          {A1_EXAM_SECTIONS.map((section) => {
            const result = sectionScore(section.key);
            const completed = A1_EXAM_QUESTIONS
              .filter((question) => question.section === section.key && question.type !== "choice")
              .some((question) => (answers[question.id] || "").trim() || Object.keys(checks).some((key) => key.startsWith(`${question.id}-`) && checks[key]));
            return (
              <article key={section.key}>
                <span>{section.label}</span>
                <strong>{result ? `${result.correct} / ${result.total}` : completed ? "已完成" : "待練習"}</strong>
              </article>
            );
          })}
        </div>
        <div className="answer-review">
          <h3>需要複習的題目</h3>
          {objectiveQuestions.filter((question) => answers[question.id] !== question.answer).length ? (
            objectiveQuestions.filter((question) => answers[question.id] !== question.answer).map((question) => (
              <article key={question.id}>
                <p>{question.prompt}</p>
                <span>正確答案：<strong>{question.answer}</strong></span>
                <small>{question.explanation}</small>
              </article>
            ))
          ) : <p className="perfect-message">客觀題全部答對。</p>}
        </div>
        <button type="button" className="exam-primary" onClick={beginExam}>重新測驗</button>
      </section>
    );
  }

  return (
    <section className="section-block a1-exam-panel" id="a1-exam">
      <div className="exam-toolbar">
        <div>
          <p className="eyebrow">A1 Spanish Exam</p>
          <h2>西班牙語 DELE A1 模擬考</h2>
        </div>
        <div className="exam-progress-copy">客觀題 {answeredObjective} / {A1_AUTO_QUESTION_COUNT}</div>
      </div>
      <div className="exam-progress-track" aria-label={`已完成 ${answeredObjective} 題`}>
        <span style={{ width: `${(answeredObjective / A1_AUTO_QUESTION_COUNT) * 100}%` }} />
      </div>
      <div className="exam-tabs" role="tablist" aria-label="考試區域">
        {A1_EXAM_SECTIONS.map((section, index) => (
          <button
            key={section.key}
            type="button"
            className={activeSection === section.key ? "active" : ""}
            onClick={() => goToSection(section.key)}
          >
            <span>{index + 1}</span>{section.label}
          </button>
        ))}
      </div>
      <div className="exam-section-head">
        <div>
          <h3>{currentSection.label}</h3>
          <p>{currentSection.es} · {currentSection.description}</p>
        </div>
        <span>{visibleQuestions.length} 題</span>
      </div>
      <div className="exam-question-list">
        {visibleQuestions.map((question, questionIndex) => (
          <article key={question.id} className="exam-question-card">
            <div className="question-number">{questionIndex + 1}</div>
            <div className="question-content">
              <p className="question-task">{question.task}</p>
              {question.passage && <div className="reading-passage" lang="es">{question.passage}</div>}
              {question.audioText && (
                <div className="listening-controls">
                  <button type="button" className="listen-button" onClick={() => speak(question.audioText)}>▶ 播放聽力音訊</button>
                  <button type="button" className="outline-command" onClick={() => setShowSamples((items) => ({ ...items, [question.id]: !items[question.id] }))}>
                    {showSamples[question.id] ? "隱藏逐字稿" : "顯示逐字稿"}
                  </button>
                </div>
              )}
              {question.audioText && showSamples[question.id] && <div className="audio-transcript" lang="es"><strong>Transcript</strong>{question.audioText}</div>}
              <h4>{question.prompt}</h4>
              {question.type === "choice" && (
                <div className="exam-options">
                  {question.options.map((option) => (
                    <label key={option} className={answers[question.id] === option ? "selected" : ""}>
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => setAnswers((items) => ({ ...items, [question.id]: option }))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}
              {question.type === "text" && (
                <>
                  <textarea
                    value={answers[question.id] || ""}
                    onChange={(event) => setAnswers((items) => ({ ...items, [question.id]: event.target.value }))}
                    placeholder={question.placeholder}
                    rows={5}
                  />
                  <div className="word-count">目前約 {(answers[question.id] || "").trim().split(/\s+/).filter(Boolean).length} 個單字</div>
                  <button type="button" className="outline-command" onClick={() => setShowSamples((items) => ({ ...items, [question.id]: !items[question.id] }))}>
                    {showSamples[question.id] ? "隱藏參考答案" : "查看參考答案"}
                  </button>
                  {showSamples[question.id] && <p className="speaking-sample" lang="es">{question.sample}</p>}
                </>
              )}
              {question.type === "speaking" && (
                <div className="speaking-tools">
                  <button type="button" className="outline-command" onClick={() => setShowSamples((items) => ({ ...items, [question.id]: !items[question.id] }))}>
                    {showSamples[question.id] ? "隱藏參考答案" : "查看參考答案"}
                  </button>
                  {showSamples[question.id] && <p className="speaking-sample" lang="es">{question.sample}</p>}
                </div>
              )}
              {question.checklist && (
                <div className="self-checklist">
                  <p>完成後自我檢核</p>
                  {question.checklist.map((item, itemIndex) => {
                    const checkKey = `${question.id}-${itemIndex}`;
                    return (
                      <label key={checkKey}>
                        <input
                          type="checkbox"
                          checked={Boolean(checks[checkKey])}
                          onChange={(event) => setChecks((values) => ({ ...values, [checkKey]: event.target.checked }))}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="exam-footer">
        <div>
          {notice && <p className="exam-notice">{notice}</p>}
          <span>完成六個區域後交卷，系統會立即分析弱項。</span>
        </div>
        <button type="button" className="exam-primary" onClick={submitExam}>交卷並查看結果</button>
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
          <A1ComprehensiveExam />
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
        .a1-exam-panel {
          display: grid;
          gap: 22px;
          border-top: 5px solid #d94734;
          background: #fff;
        }
        .exam-intro, .exam-result-head, .exam-toolbar, .exam-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }
        .exam-intro h2, .exam-toolbar h2, .exam-result-head h2 {
          margin: 0;
          color: #172033;
          font-size: 32px;
          letter-spacing: 0;
        }
        .exam-intro p:not(.eyebrow), .exam-result-head p:not(.eyebrow) {
          max-width: 760px;
          margin: 10px 0 0;
          color: #5d687c;
          line-height: 1.7;
        }
        .exam-primary {
          min-height: 48px;
          border: 0;
          border-radius: 8px;
          background: #d94734;
          color: #fff;
          padding: 0 20px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 8px 18px rgba(217, 71, 52, 0.18);
        }
        .exam-primary:hover { background: #b93627; }
        .exam-overview-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .exam-overview-grid article {
          display: flex;
          gap: 12px;
          min-height: 118px;
          border: 1px solid #dfe5ed;
          border-radius: 8px;
          padding: 16px;
          background: #fbfcfe;
        }
        .exam-overview-grid article > span {
          color: #d94734;
          font-size: 13px;
          font-weight: 900;
        }
        .exam-overview-grid h3 { margin: 0; font-size: 17px; }
        .exam-overview-grid h3 small { display: block; margin-top: 4px; color: #657086; font-size: 12px; font-weight: 700; }
        .exam-overview-grid p { margin: 10px 0 0; color: #657086; font-size: 13px; line-height: 1.5; }
        .exam-facts {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #dfe5ed;
          border-radius: 8px;
          overflow: hidden;
        }
        .exam-facts span { padding: 14px; color: #687287; text-align: center; background: #f6f8fb; }
        .exam-facts span + span { border-left: 1px solid #dfe5ed; }
        .exam-facts strong { color: #172033; font-size: 18px; }
        .exam-progress-copy { color: #536078; font-weight: 800; }
        .exam-progress-track { height: 8px; border-radius: 4px; background: #e9edf3; overflow: hidden; }
        .exam-progress-track span { display: block; height: 100%; border-radius: inherit; background: #168678; transition: width 180ms ease; }
        .exam-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .exam-tabs button {
          min-height: 48px;
          border: 1px solid #d8dfe9;
          border-radius: 8px;
          background: #fff;
          color: #48546a;
          font-weight: 800;
          cursor: pointer;
        }
        .exam-tabs button span {
          display: inline-grid;
          place-items: center;
          width: 24px;
          height: 24px;
          margin-right: 7px;
          border-radius: 50%;
          background: #eef1f5;
          font-size: 12px;
        }
        .exam-tabs button.active { border-color: #172033; background: #172033; color: #fff; }
        .exam-tabs button.active span { background: #d94734; color: #fff; }
        .exam-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 0;
          border-top: 1px solid #e4e8ef;
          border-bottom: 1px solid #e4e8ef;
        }
        .exam-section-head h3 { margin: 0; font-size: 24px; }
        .exam-section-head p { margin: 5px 0 0; color: #657086; }
        .exam-section-head > span { color: #168678; font-weight: 900; }
        .exam-question-list { display: grid; gap: 14px; }
        .exam-question-card {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 14px;
          border: 1px solid #dfe5ed;
          border-radius: 8px;
          padding: 18px;
          background: #fff;
        }
        .question-number {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #172033;
          color: #fff;
          font-weight: 900;
        }
        .question-content { min-width: 0; }
        .question-task { margin: 0 0 8px; color: #d94734; font-size: 12px; font-weight: 900; text-transform: uppercase; }
        .question-content h4 { margin: 14px 0; color: #172033; font-size: 18px; line-height: 1.5; }
        .reading-passage, .audio-transcript {
          border-left: 4px solid #e5b73b;
          border-radius: 4px;
          background: #fff9e8;
          color: #29354a;
          padding: 14px 16px;
          line-height: 1.7;
        }
        .audio-transcript { display: grid; gap: 5px; margin-top: 10px; border-left-color: #168678; background: #edf8f5; }
        .audio-transcript strong { color: #137368; font-size: 12px; text-transform: uppercase; }
        .listening-controls, .speaking-tools { display: flex; flex-wrap: wrap; gap: 9px; }
        .listen-button, .outline-command {
          min-height: 40px;
          border: 1px solid #cfd7e3;
          border-radius: 8px;
          background: #fff;
          color: #26344d;
          padding: 0 14px;
          font-weight: 800;
          cursor: pointer;
        }
        .listen-button { border-color: #168678; background: #168678; color: #fff; }
        .exam-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
        .exam-options label {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 52px;
          border: 1px solid #d8dfe9;
          border-radius: 8px;
          padding: 10px 12px;
          color: #37445a;
          cursor: pointer;
        }
        .exam-options label.selected { border-color: #168678; background: #edf8f5; color: #0e695f; font-weight: 800; }
        .exam-options input { accent-color: #168678; }
        .question-content textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid #cfd7e3;
          border-radius: 8px;
          padding: 14px;
          color: #172033;
          line-height: 1.7;
          outline: none;
        }
        .question-content textarea:focus { border-color: #168678; box-shadow: 0 0 0 3px rgba(22, 134, 120, 0.12); }
        .word-count { margin: 7px 0 10px; color: #6a7588; font-size: 13px; }
        .speaking-sample { margin: 10px 0 0; border-radius: 8px; background: #eef4ff; color: #243c68; padding: 14px; line-height: 1.7; }
        .self-checklist { display: grid; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e4e8ef; }
        .self-checklist > p { margin: 0 0 2px; color: #526078; font-weight: 800; }
        .self-checklist label { display: flex; align-items: center; gap: 9px; color: #4b586e; }
        .self-checklist input { accent-color: #168678; }
        .exam-footer { padding-top: 18px; border-top: 1px solid #e4e8ef; }
        .exam-footer span { color: #687287; font-size: 14px; }
        .exam-notice { margin: 0 0 5px; color: #b93627; font-weight: 900; }
        .score-ring {
          flex: 0 0 132px;
          height: 132px;
          border: 10px solid #d94734;
          border-radius: 50%;
          display: grid;
          place-content: center;
          text-align: center;
        }
        .score-ring.passed { border-color: #168678; }
        .score-ring strong { font-size: 42px; line-height: 1; }
        .score-ring span { color: #6b7587; font-size: 13px; }
        .result-breakdown { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .result-breakdown article { border: 1px solid #dfe5ed; border-radius: 8px; padding: 14px; background: #f8fafc; }
        .result-breakdown span, .result-breakdown strong { display: block; }
        .result-breakdown span { color: #687287; font-size: 13px; }
        .result-breakdown strong { margin-top: 5px; font-size: 20px; }
        .answer-review { display: grid; gap: 9px; }
        .answer-review h3 { margin: 0 0 4px; }
        .answer-review article { display: grid; gap: 5px; border-left: 4px solid #d94734; background: #fff4f1; padding: 12px 14px; }
        .answer-review p, .answer-review span, .answer-review small, .perfect-message { margin: 0; }
        .answer-review small { color: #687287; }
        .perfect-message { color: #147466; font-weight: 800; }
        @media (max-width: 1100px) {
          .meta-grid { grid-template-columns: repeat(3, 1fr); }
          .utility-panel { grid-template-columns: 1fr; }
          .filters, .category-grid, .rule-grid { grid-template-columns: repeat(2, 1fr); }
          .exam-overview-grid, .exam-facts { grid-template-columns: repeat(2, 1fr); }
          .exam-facts span:nth-child(3) { border-left: 0; border-top: 1px solid #dfe5ed; }
          .exam-facts span:nth-child(4) { border-top: 1px solid #dfe5ed; }
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
          .exam-intro, .exam-result-head, .exam-toolbar, .exam-footer { flex-direction: column; align-items: stretch; }
          .exam-overview-grid, .exam-facts, .exam-tabs, .result-breakdown, .exam-options { grid-template-columns: 1fr; }
          .exam-facts span + span { border-left: 0; border-top: 1px solid #dfe5ed; }
          .exam-question-card { grid-template-columns: 1fr; padding: 14px; }
          .exam-tabs { display: flex; overflow-x: auto; padding-bottom: 4px; }
          .exam-tabs button { min-width: 130px; }
          .exam-primary { width: 100%; }
          .score-ring { align-self: center; }
        }
      `}</style>
    </>
  );
}
