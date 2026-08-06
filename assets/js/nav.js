// ---------- Mobile nav ----------
function toggleNav() {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const backdrop = document.getElementById('nav-backdrop');
  if (!nav) return;
  const isOpen = nav.classList.toggle('open');
  if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));
  if (backdrop) backdrop.classList.toggle('show', isOpen);
  document.body.classList.toggle('nav-open-lock', isOpen);
}

function closeNav() {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const backdrop = document.getElementById('nav-backdrop');
  if (nav) nav.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
  if (backdrop) backdrop.classList.remove('show');
  document.body.classList.remove('nav-open-lock');
}

function highlightActiveNavLink() {
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('#site-nav a').forEach(link => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (href === page) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

// ---------- Full-screen hero sizing ----------
// The hero is styled as `calc(100vh - var(--header-h))` so it fills exactly
// what's left below the header. --header-h has a static CSS fallback, but
// the header's real height varies slightly by breakpoint (font/padding
// changes), so we measure it directly here for a pixel-perfect fit.
function syncHeaderHeightVar() {
  const header = document.querySelector('header');
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
}
