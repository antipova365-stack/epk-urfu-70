// Сквозной сценарий: внутри .pin-wrap элемент .pin-stage зафиксирован (position: sticky),
// а прогресс скролла по высоте обёртки решает, какой .pin-beat / .pp-img сейчас активен.
// На мобильных (см. CSS) sticky отключается и всё показывается обычным списком —
// этот код там просто не находит смысла работать, но и не мешает.
function initPinScenes() {
  const wraps = Array.from(document.querySelectorAll(".pin-wrap"));
  if (!wraps.length) return;

  const scenes = wraps.map((wrap) => {
    const beats = Array.from(wrap.querySelectorAll("[data-beat]"));
    const count = beats.reduce((max, el) => Math.max(max, Number(el.dataset.beat)), 0) + 1;

    // точки-индикатор прогресса
    const dotsHost = document.createElement("div");
    dotsHost.className = "pin-progress";
    for (let i = 0; i < count; i++) {
      const dot = document.createElement("span");
      if (i === 0) dot.classList.add("is-active");
      dotsHost.appendChild(dot);
    }
    const stage = wrap.querySelector(".pin-stage");
    if (stage) stage.appendChild(dotsHost);

    return { wrap, beats, count, dots: Array.from(dotsHost.children) };
  });

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    scenes.forEach((scene) => {
      const rect = scene.wrap.getBoundingClientRect();
      const total = rect.height - vh;
      if (total <= 0) return;
      const progress = Math.min(Math.max(-rect.top / total, 0), 1);
      const active = Math.min(scene.count - 1, Math.floor(progress * scene.count));
      scene.beats.forEach((el) => {
        el.classList.toggle("is-active", Number(el.dataset.beat) === active);
      });
      scene.dots.forEach((d, i) => d.classList.toggle("is-active", i === active));
    });
  }
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}

// Скролл-анимации появления секций + поведение карточек-носителей на тач-устройствах.
document.addEventListener("DOMContentLoaded", () => {
  initPinScenes();
  const revealEls = document.querySelectorAll(".reveal, .reveal-stagger");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  // На телефоне hover не работает — по тапу переключаем открытое состояние карточки.
  document.querySelectorAll(".carrier-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".carrier-card.open").forEach((c) => {
        if (c !== card) c.classList.remove("open");
      });
      card.classList.toggle("open");
    });
  });

  // Шапка — лёгкая тень при скролле
  const nav = document.querySelector(".nav");
  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY > 12) nav.style.boxShadow = "0 8px 24px -20px rgba(31,78,121,0.4)";
      else nav.style.boxShadow = "none";
    },
    { passive: true }
  );
});
