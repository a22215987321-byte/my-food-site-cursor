export default function LangToggle({ lang, onChange }) {
  return (
    <div className="ape-lang-toggle" role="group" aria-label="Language">
      <button
        type="button"
        className={`ape-lang-btn${lang === "zh" ? " active" : ""}`}
        onClick={() => onChange("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={`ape-lang-btn${lang === "en" ? " active" : ""}`}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
