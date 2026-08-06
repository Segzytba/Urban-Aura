// ---------- Back to top ----------
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  btn.classList.toggle('show', window.scrollY > 400);
});

// Closes the mini-cart preview, the mobile nav drawer, and the chat widget
// preview when the user clicks anywhere outside of them.
document.addEventListener('click', function (e) {
  const preview = document.getElementById('cart-preview');
  const cartIcon = document.querySelector('.cart-floating');
  if (preview && cartIcon && !preview.contains(e.target) && !cartIcon.contains(e.target)) {
    preview.classList.remove('open');
  }

  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (nav && nav.classList.contains('open') && !nav.contains(e.target) && toggle && !toggle.contains(e.target)) {
    closeNav();
  }

  const chatPreview = document.getElementById('chat-preview');
  const chatWidget = document.querySelector('.chat-widget');
  if (chatPreview && chatWidget && !chatWidget.contains(e.target)) {
    chatPreview.classList.remove('open');
  }
});

function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal-on-scroll');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  targets.forEach(el => observer.observe(el));
}
