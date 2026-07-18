(() => {
  "use strict";

  const chapterNav = document.querySelector("#chapterNav");
  const chapterSelect = document.querySelector("#chapterSelect");
  const chapterContent = document.querySelector("#chapterContent");
  const searchInput = document.querySelector("#vocabularySearch");
  const searchStatus = document.querySelector("#searchStatus");
  const reader = document.querySelector(".reader");
  const startNumbers = document.querySelector("#startNumbers");
  const topButton = document.querySelector("#topButton");
  const viewButtons = Array.from(document.querySelectorAll("[data-view]"));

  const state = {
    data: null,
    sections: [],
    activeId: "numbers-0-100",
    query: "",
    view: readStored("a1-vocabulary-view") || "cards",
    resultLimit: 120,
  };

  function readStored(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  function writeStored(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* Storage is optional. */ }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function fold(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  }

  function spanishLangAttribute(value) {
    return /[\u3400-\u9fff]/u.test(String(value)) ? "" : ' lang="es"';
  }

  function sectionCount(section) {
    return section.groups.reduce((total, group) => total + group.items.length, 0);
  }

  function sectionLabel(section) {
    const number = section.number === 0 ? "00" : String(section.number).padStart(2, "0");
    return `${number}. ${section.title}`;
  }

  function setView(view) {
    state.view = view === "list" ? "list" : "cards";
    reader.classList.toggle("list-view", state.view === "list");
    viewButtons.forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    writeStored("a1-vocabulary-view", state.view);
  }

  function renderNavigation() {
    chapterNav.innerHTML = state.sections.map((section) => {
      const number = section.number === 0 ? "00" : String(section.number).padStart(2, "0");
      const active = section.id === state.activeId;
      return `<button type="button" data-chapter="${escapeHtml(section.id)}" class="${active ? "active" : ""}" ${active ? 'aria-current="page"' : ""}>
        <span class="nav-number">${number}</span>
        <span class="nav-label">${escapeHtml(section.title)}</span>
        <span class="nav-count">${sectionCount(section)}</span>
      </button>`;
    }).join("");

    chapterSelect.innerHTML = state.sections.map((section) =>
      `<option value="${escapeHtml(section.id)}" ${section.id === state.activeId ? "selected" : ""}>${escapeHtml(sectionLabel(section))} · ${sectionCount(section)} 項</option>`,
    ).join("");
  }

  function renderCard(item, context = "") {
    return `<article class="vocab-card">
      <div class="vocab-card-head">
        <strong lang="es">${escapeHtml(item.term)}</strong>
        <span>${escapeHtml(item.pos)}</span>
      </div>
      <div class="vocab-card-body">
        ${context ? `<p class="result-context">${escapeHtml(context)}</p>` : ""}
        <p class="vocab-meaning">${escapeHtml(item.chinese)}</p>
        <p class="vocab-usage"><span class="usage-label">用法</span> <span class="usage-example"${spanishLangAttribute(item.usage)}>${escapeHtml(item.usage)}</span></p>
      </div>
    </article>`;
  }

  function renderExpressions(expressions) {
    if (!expressions || !expressions.length) return "";
    return `<section class="expression-box" aria-labelledby="expressions-heading">
      <h3 id="expressions-heading">先開口說這幾句</h3>
      <dl class="expression-list">
        ${expressions.map((item) => `<div><dt lang="es">${escapeHtml(item.spanish)}</dt><dd>${escapeHtml(item.chinese)}</dd></div>`).join("")}
      </dl>
    </section>`;
  }

  function renderSection(section) {
    const number = section.number === 0 ? "00" : String(section.number).padStart(2, "0");
    chapterContent.innerHTML = `<article class="chapter-view">
      <header class="chapter-header" data-number="${number}">
        <p class="chapter-kicker">CHAPTER ${number} · ${sectionCount(section)} ITEMS</p>
        <h2>${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.focus)}</p>
      </header>
      ${renderExpressions(section.expressions)}
      ${section.groups.map((group) => `<section class="vocabulary-group">
        <div class="group-heading"><h3>${escapeHtml(group.title)}</h3><span>${group.items.length} 項</span></div>
        <div class="vocabulary-grid ${section.number === 0 ? "number-grid" : ""}">
          ${group.items.map((item) => renderCard(item)).join("")}
        </div>
      </section>`).join("")}
    </article>`;
    chapterContent.setAttribute("aria-busy", "false");
    searchStatus.textContent = `${sectionLabel(section)}，共 ${sectionCount(section)} 項。`;
    document.title = `${section.title}｜西班牙語A1核心詞彙`;
  }

  function searchable(item, group, section) {
    return fold([item.term, item.pos, item.chinese, item.usage, group.title, section.title].join(" "));
  }

  function searchAll(query) {
    const needle = fold(query.trim());
    if (!needle) return [];
    const matches = [];
    state.sections.forEach((section) => {
      section.groups.forEach((group) => {
        group.items.forEach((item) => {
          if (searchable(item, group, section).includes(needle)) {
            matches.push({ section, group, item });
          }
        });
      });
    });
    return matches;
  }

  function renderSearch() {
    const matches = searchAll(state.query);
    const visible = matches.slice(0, state.resultLimit);
    const query = state.query.trim();
    document.title = `搜尋「${query}」｜西班牙語A1核心詞彙`;
    searchStatus.textContent = matches.length
      ? `找到 ${matches.length} 項結果${matches.length > visible.length ? `，目前顯示前 ${visible.length} 項` : ""}。`
      : `找不到「${query}」的結果。`;

    if (!matches.length) {
      chapterContent.innerHTML = `<div class="empty-results"><strong>找不到相符詞彙</strong><span>可以改用單字的一部分、中文意思或不加重音符號再試一次。</span></div>`;
      return;
    }

    chapterContent.innerHTML = `<section class="search-view">
      <header class="search-results-header">
        <div><p>SEARCH RESULTS</p><h2>「${escapeHtml(query)}」</h2></div>
        <strong>${matches.length} 項</strong>
      </header>
      <section class="vocabulary-group">
        <div class="group-heading"><h3>全書搜尋結果</h3><span>${visible.length} / ${matches.length}</span></div>
        <div class="vocabulary-grid">
          ${visible.map(({ section, group, item }) => renderCard(item, `${section.title} · ${group.title}`)).join("")}
        </div>
      </section>
      ${matches.length > visible.length ? `<button class="load-more" type="button" id="loadMore">顯示更多結果</button>` : ""}
    </section>`;
    chapterContent.setAttribute("aria-busy", "false");
  }

  function selectChapter(id, options = {}) {
    const section = state.sections.find((item) => item.id === id) || state.sections[0];
    state.activeId = section.id;
    state.query = "";
    state.resultLimit = 120;
    searchInput.value = "";
    writeStored("a1-vocabulary-chapter", state.activeId);
    renderNavigation();
    renderSection(section);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${state.activeId}`);
    if (options.scroll) document.querySelector("#library").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSearch() {
    state.query = searchInput.value;
    state.resultLimit = 120;
    if (state.query.trim()) renderSearch();
    else renderSection(state.sections.find((section) => section.id === state.activeId) || state.sections[0]);
  }

  chapterNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-chapter]");
    if (button) selectChapter(button.dataset.chapter, { scroll: window.innerWidth < 840 });
  });

  chapterSelect.addEventListener("change", () => selectChapter(chapterSelect.value, { scroll: true }));
  searchInput.addEventListener("input", handleSearch);
  viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  startNumbers.addEventListener("click", () => selectChapter("numbers-0-100", { scroll: true }));
  chapterContent.addEventListener("click", (event) => {
    if (event.target.closest("#loadMore")) {
      state.resultLimit += 120;
      renderSearch();
    }
  });

  window.addEventListener("scroll", () => topButton.classList.toggle("visible", window.scrollY > 900), { passive: true });
  topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  async function init() {
    setView(state.view);
    try {
      const response = await fetch("/data/a1-vocabulary.json", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.data = await response.json();
      state.sections = [state.data.numbers, ...state.data.chapters];
      document.querySelector("#itemCount").textContent = new Intl.NumberFormat("zh-Hant").format(state.data.itemCount);
      document.querySelector("#chapterCount").textContent = String(state.data.chapterCount);
      const hash = window.location.hash.slice(1);
      const stored = readStored("a1-vocabulary-chapter");
      const requested = [hash, stored].find((id) => state.sections.some((section) => section.id === id));
      selectChapter(requested || state.sections[0].id);
      const initialQuery = new URLSearchParams(window.location.search).get("q");
      if (initialQuery) {
        searchInput.value = initialQuery;
        handleSearch();
      }
    } catch (error) {
      console.error("Unable to load vocabulary data", error);
      chapterContent.setAttribute("aria-busy", "false");
      chapterContent.innerHTML = `<div class="empty-results"><strong>詞彙資料暫時無法載入</strong><span>請重新整理頁面；若問題持續，可先返回旅行必學句子頁面。</span></div>`;
      searchStatus.textContent = "詞彙資料載入失敗。";
    }
  }

  init();
})();
