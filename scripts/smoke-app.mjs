import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const appSource = fs.readFileSync("dist/app.js", "utf8");
const htmlSource = fs.readFileSync("dist/index.html", "utf8");
const pageCount = (htmlSource.match(/<section class="[^"]*\bsheet\b/g) || []).length;

assert.equal(pageCount, 26, "expected all 26 ebook preview pages");

function classList() {
  const values = new Set();
  return {
    contains(value) {
      return values.has(value);
    },
    toggle(value) {
      if (values.has(value)) values.delete(value);
      else values.add(value);
    },
  };
}

function interactiveElement(initial = {}) {
  const listeners = new Map();
  return {
    ...initial,
    listeners,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  };
}

function runAtWidth(width) {
  const cssVariables = new Map();
  const root = {
    style: {
      setProperty(name, value) {
        cssVariables.set(name, value);
      },
    },
  };
  const body = { classList: classList() };
  const pages = Array.from({ length: pageCount }, (_, index) => ({
    id: `page-${index + 1}`,
    dataset: { navLabel: `頁面 ${index + 1}` },
    scrollIntoViewCalls: 0,
    scrollIntoView() {
      this.scrollIntoViewCalls += 1;
    },
  }));
  const pageMap = new Map(pages.map((page) => [page.id, page]));
  const zoomLabel = { textContent: "" };
  const pageSelect = interactiveElement({
    value: "",
    options: [],
    append(option) {
      this.options.push(option);
      if (!this.value) this.value = option.value;
    },
  });
  const modeToggle = interactiveElement({ textContent: "單頁檢視" });
  const printButton = interactiveElement();
  const zoomIn = interactiveElement();
  const zoomOut = interactiveElement();
  const keyboardListeners = new Map();
  let printCalls = 0;

  const selectorMap = new Map([
    ["#zoomLabel", zoomLabel],
    ["#pageSelect", pageSelect],
    ["#modeToggle", modeToggle],
    ["#printButton", printButton],
    ["#zoomIn", zoomIn],
    ["#zoomOut", zoomOut],
  ]);

  class IntersectionObserver {
    observe() {}
  }

  const document = {
    documentElement: root,
    body,
    querySelectorAll(selector) {
      return selector === ".sheet" ? pages : [];
    },
    querySelector(selector) {
      return selectorMap.get(selector) || null;
    },
    createElement() {
      return {};
    },
    getElementById(id) {
      return pageMap.get(id) || null;
    },
    addEventListener(type, listener) {
      keyboardListeners.set(type, listener);
    },
  };

  const window = {
    innerWidth: width,
    print() {
      printCalls += 1;
    },
  };

  vm.runInNewContext(appSource, { document, window, IntersectionObserver });

  assert.equal(pageSelect.options.length, pageCount, `${width}px page selector count`);
  assert.ok(cssVariables.has("--zoom"), `${width}px initial zoom`);

  pageSelect.value = "page-13";
  pageSelect.listeners.get("change")();
  assert.equal(pageMap.get("page-13").scrollIntoViewCalls, 1, `${width}px page navigation`);

  const previousZoom = Number(cssVariables.get("--zoom"));
  zoomIn.listeners.get("click")();
  assert.ok(Number(cssVariables.get("--zoom")) > previousZoom, `${width}px zoom button`);

  modeToggle.listeners.get("click")();
  assert.equal(body.classList.contains("single-page"), true, `${width}px view toggle`);
  assert.equal(modeToggle["aria-pressed"], "true", `${width}px view toggle aria state`);

  printButton.listeners.get("click")();
  assert.equal(printCalls, 1, `${width}px print button`);
  assert.ok(keyboardListeners.has("keydown"), `${width}px keyboard controls`);
}

for (const width of [375, 390, 430, 768, 1280, 1440, 1920]) {
  runAtWidth(width);
}

console.log("App smoke test passed at 375, 390, 430, 768, 1280, 1440, and 1920px.");
