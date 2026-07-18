(() => {
  const root = document.documentElement;
  const body = document.body;
  const pages = Array.from(document.querySelectorAll(".sheet"));
  const zoomLabel = document.querySelector("#zoomLabel");
  const pageSelect = document.querySelector("#pageSelect");
  const modeToggle = document.querySelector("#modeToggle");
  const printButton = document.querySelector("#printButton");
  const zoomIn = document.querySelector("#zoomIn");
  const zoomOut = document.querySelector("#zoomOut");
  let zoom = window.innerWidth < 620 ? 0.5 : window.innerWidth < 1000 ? 0.68 : 0.78;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const setZoom = (nextZoom) => {
    zoom = clamp(Math.round(nextZoom * 100) / 100, 0.42, 1.2);
    root.style.setProperty("--zoom", String(zoom));
    if (zoomLabel) zoomLabel.textContent = Math.round(zoom * 100) + "%";
  };

  if (pageSelect) {
    pages.forEach((page, index) => {
      const option = document.createElement("option");
      option.value = page.id;
      option.textContent = page.dataset.navLabel || "預覽頁 " + (index + 1);
      pageSelect.append(option);
    });

    pageSelect.addEventListener("change", () => {
      const page = document.getElementById(pageSelect.value);
      if (page) {
        page.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && pageSelect.value !== visible.target.id) {
          pageSelect.value = visible.target.id;
        }
      },
      { threshold: [0.35, 0.65] },
    );
    pages.forEach((page) => observer.observe(page));
  }

  if (zoomIn) zoomIn.addEventListener("click", () => setZoom(zoom + 0.08));
  if (zoomOut) zoomOut.addEventListener("click", () => setZoom(zoom - 0.08));

  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      body.classList.toggle("single-page");
      const single = body.classList.contains("single-page");
      modeToggle.textContent = single ? "雙頁檢視" : "單頁檢視";
      modeToggle.setAttribute("aria-pressed", String(single));
    });
  }

  if (printButton) printButton.addEventListener("click", () => window.print());

  document.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") setZoom(zoom + 0.08);
    if (event.key === "-") setZoom(zoom - 0.08);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
      event.preventDefault();
      window.print();
    }
  });

  setZoom(zoom);
})();

