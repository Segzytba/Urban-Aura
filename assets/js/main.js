// Bootstraps every page. Loaded last so every function it calls is already
// defined by the other assets/js/*.js files loaded before it.
document.addEventListener('DOMContentLoaded', function () {
  renderProductsGrid();
  renderProductDetailPage();
  renderCartPreview();
  renderFullCart();
  highlightActiveNavLink();
  initScrollReveal();
  initHeroSlideshow();
  syncHeaderHeightVar();
  window.addEventListener('resize', syncHeaderHeightVar);

  const copyrightYear = document.getElementById('copyright-year');
  if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

  document.querySelectorAll('#site-nav a').forEach(link => {
    link.addEventListener('click', closeNav);
  });
});
