import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const htmlSource = fs.readFileSync("dist/a1-vocabulary.html", "utf8");
const appSource = fs.readFileSync("dist/a1-vocabulary.js", "utf8");
const data = JSON.parse(fs.readFileSync("dist/data/a1-vocabulary.json", "utf8"));
const expectedTitle = "西班牙語A1核心詞彙";

function sectionItems(section) {
  assert.ok(Array.isArray(section.groups), `${section.title} must contain groups`);
  return section.groups.flatMap((group) => {
    assert.ok(Array.isArray(group.items), `${section.title} / ${group.title} must contain items`);
    return group.items;
  });
}

assert.equal(data.title, expectedTitle, "the vocabulary-book title must be exact");
assert.equal(data.chapterCount, 15, "declared chapter count");
assert.equal(data.chapters.length, 15, "actual chapter count");

const numberItems = sectionItems(data.numbers);
const chapterItems = data.chapters.flatMap(sectionItems);
const allItems = [...numberItems, ...chapterItems];

assert.equal(data.itemCount, 1088, "declared item count");
assert.equal(allItems.length, 1088, "actual vocabulary and number item count");
assert.equal(numberItems.length, 101, "0-100 must contain 101 number entries");

const numericSequence = numberItems.map((item) => Number(item.chinese.match(/^(\d+)/)?.[1]));
assert.deepEqual(numericSequence, Array.from({ length: 101 }, (_, index) => index), "numbers must run from 0 through 100 in order");

function normalizedTerm(value) {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("es")
    .replace(/^(?:el|la|los|las|un|una|unos|unas)\s+/, "")
    .trim();
}

const terms = allItems.map((item) => normalizedTerm(item.term));
for (const term of ["bolígrafo", "Escucha", "médico", "hospital", "tener miedo", "tener hambre", "tener sed"]) {
  assert.ok(terms.includes(normalizedTerm(term)), `missing required vocabulary: ${term}`);
}

for (const term of [
  "cien",
  "ciento",
  "doscientos/as",
  "trescientos/as",
  "cuatrocientos/as",
  "quinientos/as",
  "seiscientos/as",
  "setecientos/as",
  "ochocientos/as",
  "novecientos/as",
  "mil",
]) {
  assert.ok(terms.includes(normalizedTerm(term)), `missing price/year number scale: ${term}`);
}

const doctorAtHospital = allItems.some((item) =>
  normalizedTerm(item.term) === "médico" && normalizedTerm(item.usage).includes("hospital"),
);
assert.ok(doctorAtHospital, "médico must be demonstrated with hospital as its workplace");

const titleHeading = htmlSource.match(/<h1\b[^>]*\bid=["']book-title["'][^>]*>([\s\S]*?)<\/h1>/i);
assert.ok(titleHeading, "missing #book-title heading");
assert.equal(titleHeading[1].replace(/<[^>]+>/g, "").replace(/\s+/g, ""), expectedTitle, "visible heading title");
assert.match(htmlSource, /<html\b[^>]*\blang=["']zh-Hant["']/i, "Traditional Chinese document language");
assert.match(htmlSource, /<meta\b[^>]*\bproperty=["']og:title["'][^>]*\bcontent=["']西班牙語A1核心詞彙["']/i, "Open Graph title");
assert.match(htmlSource, /<script\b[^>]*\bsrc=["']\/a1-vocabulary\.js["']/i, "page JavaScript reference");
assert.match(htmlSource, /<link\b[^>]*\bhref=["']\/a1-vocabulary\.css["']/i, "page stylesheet reference");

for (const id of [
  "library",
  "itemCount",
  "chapterCount",
  "startNumbers",
  "chapterSelect",
  "chapterNav",
  "vocabularySearch",
  "searchStatus",
  "chapterContent",
  "topButton",
]) {
  assert.match(htmlSource, new RegExp(`\\bid=["']${id}["']`), `missing required HTML element #${id}`);
}
const searchStatusTag = htmlSource.match(/<p\b[^>]*\bid=["']searchStatus["'][^>]*>/i);
const chapterContentTag = htmlSource.match(/<div\b[^>]*\bid=["']chapterContent["'][^>]*>/i);
assert.match(searchStatusTag?.[0] || "", /\baria-live=["']polite["']/i, "search status must announce concise result counts");
assert.doesNotMatch(chapterContentTag?.[0] || "", /\baria-live=/i, "large dynamic result regions must not be live-announced");
assert.equal((htmlSource.match(/\bdata-view=["']/g) || []).length, 2, "card/list view buttons");
assert.match(appSource, /fetch\(["']\/data\/a1-vocabulary\.json["']/, "vocabulary JSON fetch path");

function classList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    contains(value) {
      return values.has(value);
    },
    toggle(value, force) {
      if (force === true) values.add(value);
      else if (force === false) values.delete(value);
      else if (values.has(value)) values.delete(value);
      else values.add(value);
      return values.has(value);
    },
  };
}

function interactiveElement(initial = {}) {
  const listeners = new Map();
  return {
    textContent: "",
    innerHTML: "",
    value: "",
    dataset: {},
    classList: classList(),
    attributes: new Map(),
    scrollIntoViewCalls: 0,
    ...initial,
    listeners,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    scrollIntoView() {
      this.scrollIntoViewCalls += 1;
    },
  };
}

const chapterNav = interactiveElement();
const chapterSelect = interactiveElement();
const chapterContent = interactiveElement();
const searchInput = interactiveElement();
const searchStatus = interactiveElement();
const reader = interactiveElement();
const startNumbers = interactiveElement();
const topButton = interactiveElement();
const itemCount = interactiveElement();
const chapterCount = interactiveElement();
const library = interactiveElement();
const cardView = interactiveElement({ dataset: { view: "cards" }, classList: classList(["active"]) });
const listView = interactiveElement({ dataset: { view: "list" } });

const elements = new Map([
  ["#chapterNav", chapterNav],
  ["#chapterSelect", chapterSelect],
  ["#chapterContent", chapterContent],
  ["#vocabularySearch", searchInput],
  ["#searchStatus", searchStatus],
  [".reader", reader],
  ["#startNumbers", startNumbers],
  ["#topButton", topButton],
  ["#itemCount", itemCount],
  ["#chapterCount", chapterCount],
  ["#library", library],
]);

const document = {
  title: "",
  querySelector(selector) {
    return elements.get(selector) || null;
  },
  querySelectorAll(selector) {
    return selector === "[data-view]" ? [cardView, listView] : [];
  },
};

const storage = new Map();
const windowListeners = new Map();
const historyCalls = [];
const scrollCalls = [];
const window = {
  innerWidth: 1280,
  scrollY: 0,
  location: { hash: "", pathname: "/a1-vocabulary", search: "" },
  history: {
    replaceState(_state, _unused, url) {
      historyCalls.push(url);
    },
  },
  localStorage: {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  },
  addEventListener(type, listener) {
    windowListeners.set(type, listener);
  },
  scrollTo(options) {
    scrollCalls.push(options);
  },
};

const fetchCalls = [];
async function fetch(url, options) {
  fetchCalls.push({ url, options });
  return { ok: true, async json() { return data; } };
}

vm.runInNewContext(appSource, { console, document, fetch, Intl, URLSearchParams, window });
await new Promise((resolve) => setImmediate(resolve));

assert.equal(fetchCalls.length, 1, "the app should load vocabulary data once");
assert.equal(fetchCalls[0].url, "/data/a1-vocabulary.json", "runtime vocabulary JSON request");
assert.equal(itemCount.textContent, "1,088", "rendered item count");
assert.equal(chapterCount.textContent, "15", "rendered chapter count");
assert.equal((chapterNav.innerHTML.match(/\bdata-chapter=/g) || []).length, 16, "number section plus 15 chapter navigation buttons");
assert.equal((chapterSelect.innerHTML.match(/<option\b/g) || []).length, 16, "number section plus 15 chapter select options");
assert.match(chapterContent.innerHTML, /數字 0–100/, "initial number section render");

chapterSelect.value = data.chapters[9].id;
chapterSelect.listeners.get("change")();
assert.match(chapterContent.innerHTML, new RegExp(data.chapters[9].title), "chapter selection renders the requested chapter");
assert.equal(library.scrollIntoViewCalls, 1, "chapter selector scrolls the reader into view");

searchInput.value = "boligrafo";
searchInput.listeners.get("input")();
assert.match(searchStatus.textContent, /找到 \d+ 項結果/, "accent-insensitive search reports results");
assert.match(chapterContent.innerHTML, /bolígrafo/, "accent-insensitive search renders the matching vocabulary");
assert.match(chapterContent.innerHTML, /class="usage-example" lang="es"/, "Spanish usage examples declare their language");

listView.listeners.get("click")();
assert.equal(reader.classList.contains("list-view"), true, "list view interaction");
assert.equal(listView.attributes.get("aria-pressed"), "true", "list view aria state");

startNumbers.listeners.get("click")();
assert.match(chapterContent.innerHTML, /數字 0–100/, "number shortcut interaction");
assert.ok(historyCalls.at(-1).endsWith("#numbers-0-100"), "number shortcut updates the URL hash");

window.scrollY = 901;
windowListeners.get("scroll")();
assert.equal(topButton.classList.contains("visible"), true, "back-to-top button visibility");
topButton.listeners.get("click")();
assert.equal(scrollCalls.at(-1)?.top, 0, "back-to-top target");
assert.equal(scrollCalls.at(-1)?.behavior, "smooth", "back-to-top scroll behavior");

console.log("A1 vocabulary smoke test passed: 1,088 items, 15 chapters, complete 0-100 numbers plus hundred/thousand scale, required vocabulary, and core interactions.");
