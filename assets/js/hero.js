// ---------- Hero photo backdrop ----------
// Ambient, autoplay-only crossfade — deliberately no click/swipe navigation.
let heroSlideIndex = 0;

function initHeroSlideshow() {
  const slides = document.querySelectorAll('#lookbook-slideshow .hero-slide');
  if (slides.length <= 1) return;

  const dotsContainer = document.getElementById('hero-dots');
  let dots = [];
  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from({ length: slides.length }, (_, i) =>
      `<span class="hero-dot${i === 0 ? ' active' : ''}"></span>`
    ).join('');
    dots = Array.from(dotsContainer.querySelectorAll('.hero-dot'));
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  setInterval(() => {
    heroSlideIndex = (heroSlideIndex + 1) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === heroSlideIndex));
    dots.forEach((dot, i) => dot.classList.toggle('active', i === heroSlideIndex));
  }, 3200);
}
