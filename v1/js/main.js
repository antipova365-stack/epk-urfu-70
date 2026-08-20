// Скролл-анимации появления секций + поведение карточек-носителей на тач-устройствах.
document.addEventListener("DOMContentLoaded", () => {
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
