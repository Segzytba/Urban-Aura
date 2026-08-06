// Shared logic used across all pages
// Cart item shape: { productName, price, size, quantity }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

// Renders the shop grid (#products-grid) from the `products` table in
// Supabase, so adding, removing, or updating stock only means editing
// that table (via the Supabase dashboard).
function renderProductCard(p) {
  const name = escapeHtml(p.name);
  const priceLabel = `&#8358;${p.price.toLocaleString()}.NGN`;
  const stock = Number.isFinite(p.stock) ? p.stock : 10;

  if (stock <= 0) {
    return `
      <div class="product sold-out" data-name="${name}" data-price="${p.price}">
        <img src="${p.image}" alt="${name}" loading="lazy">
        <span class="sold-out-badge">Sold Out</span>
        <h3>${name.toUpperCase()}</h3>
        <p>${priceLabel}</p>
        <a class="restock-link" href="https://wa.link/ao2tmy" target="_blank" rel="noopener">Ask about restock&nbsp;&rarr;</a>
      </div>`;
  }

  return `
    <div class="product" data-name="${name}" data-price="${p.price}" data-stock="${stock}">
      <img src="${p.image}" alt="${name}" loading="lazy">
      <h3>${name.toUpperCase()}</h3>
      <p>${priceLabel}</p>
      <div class="product-options">
        <select class="size-select" aria-label="Select size">
          <option value="S">S</option>
          <option value="M" selected>M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
        </select>
        <div class="qty-stepper">
          <button type="button" onclick="stepQty(this, -1)" aria-label="Decrease quantity">&minus;</button>
          <input type="number" class="qty-input" value="1" min="1" max="${stock}" inputmode="numeric">
          <button type="button" onclick="stepQty(this, 1)" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button type="button" onclick="addToCartFromCard(this)">Add to Cart</button>
    </div>`;
}

const PRODUCTS_CACHE_KEY = 'ua_products_cache_v1';
const PRODUCTS_CACHE_TTL = 60000; // 1 minute — long enough to make back/forth navigation instant, short enough to stay fresh

function renderProductSkeletons(grid, count) {
  grid.innerHTML = Array.from({ length: count }, () => `
    <div class="product product-skeleton" aria-hidden="true">
      <div class="skeleton-block skeleton-img"></div>
      <div class="skeleton-block skeleton-line" style="width:70%"></div>
      <div class="skeleton-block skeleton-line" style="width:40%"></div>
      <div class="skeleton-block skeleton-line skeleton-btn"></div>
    </div>`).join('');
}

async function renderProductsGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid || typeof supabaseClient === 'undefined') return;

  // Show cached data immediately if we have it (instant on repeat visits),
  // then silently refetch in the background to stay current. First-ever
  // visit has nothing cached, so it falls through to the skeleton below.
  let cachedData = null;
  try {
    const cached = sessionStorage.getItem(PRODUCTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < PRODUCTS_CACHE_TTL) {
        cachedData = parsed.data;
      }
    }
  } catch (e) { /* corrupt cache, ignore */ }

  if (cachedData && cachedData.length) {
    grid.innerHTML = cachedData.map(renderProductCard).join('');
  } else {
    renderProductSkeletons(grid, 8);
  }

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load products:', error);
    if (!cachedData) {
      grid.innerHTML = '<p class="empty-state">Couldn\'t load products right now. Please refresh the page.</p>';
    }
    return;
  }

  try {
    sessionStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) { /* storage full or unavailable, not critical */ }

  grid.innerHTML = data.map(renderProductCard).join('');
}

function getCart() {
  return JSON.parse(localStorage.getItem('cart')) || [];
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCartPreview();
  renderFullCart();
}

function cartTotal(cart) {
  return cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
}

function pulseCartIcon() {
  const icon = document.querySelector('.cart-floating');
  if (!icon) return;
  icon.classList.remove('pulse');
  void icon.offsetWidth; // restart animation if it's already mid-pulse
  icon.classList.add('pulse');
}

function addToCart(productName, price, size, quantity, image, stock) {
  size = size || 'M';
  quantity = Math.max(1, Math.floor(Number(quantity)) || 1);
  const stockLimit = Number.isFinite(stock) ? stock : Infinity;

  const cart = getCart();
  const existing = cart.find(item => item.productName === productName && item.size === size);

  if (existing) {
    existing.stock = stockLimit;
    existing.quantity = Math.min(stockLimit, (existing.quantity || 1) + quantity);
  } else {
    cart.push({ productName, price, size, quantity: Math.min(stockLimit, quantity), image: image || '', stock: stockLimit });
  }

  saveCart(cart);
  showToast(`${productName} (${size}) x${quantity} added to cart`);
  pulseCartIcon();
}

// Reads product name/price/image/stock from the card's data attributes plus
// the chosen size/quantity controls, then adds it to the cart — capped at
// whatever stock is actually left once what's already in the cart is counted.
function addToCartFromCard(button) {
  const card = button.closest('.product');
  if (!card) return;

  const name = card.dataset.name;
  const price = Number(card.dataset.price);
  const stock = Number(card.dataset.stock) || 0;
  const sizeSelect = card.querySelector('.size-select');
  const qtyInput = card.querySelector('.qty-input');
  const img = card.querySelector('img');
  const size = sizeSelect ? sizeSelect.value : 'M';
  let quantity = qtyInput ? Number(qtyInput.value) : 1;
  const image = img ? img.getAttribute('src') : '';

  const alreadyInCart = getCart()
    .filter(item => item.productName === name && item.size === size)
    .reduce((sum, item) => sum + (item.quantity || 1), 0);
  const remaining = Math.max(0, stock - alreadyInCart);

  if (remaining <= 0) {
    showToast(`You already have all ${stock} in stock in your cart`, 'error');
    return;
  }

  if (quantity > remaining) {
    quantity = remaining;
    showToast(`Only ${stock} in stock — added ${quantity}`, 'error');
  }

  addToCart(name, price, size, quantity, image, stock);

  if (qtyInput) qtyInput.value = 1;

  const originalLabel = button.textContent;
  button.classList.add('added');
  button.textContent = 'Added ✓';
  setTimeout(() => {
    button.classList.remove('added');
    button.textContent = originalLabel;
  }, 1100);
}

function stepQty(button, delta) {
  const input = button.closest('.qty-stepper').querySelector('.qty-input');
  const max = Number(input.max) || 99;
  const next = (parseInt(input.value, 10) || 1) + delta;
  input.value = Math.min(max, Math.max(1, next));
}

function updateQuantity(index, delta) {
  const cart = getCart();
  if (!cart[index]) return;

  const stock = Number.isFinite(cart[index].stock) ? cart[index].stock : Infinity;
  const nextQty = (cart[index].quantity || 1) + delta;

  if (delta > 0 && nextQty > stock) {
    showToast(`Only ${stock} in stock`, 'error');
    return;
  }

  cart[index].quantity = nextQty;
  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const items = document.querySelectorAll('#cart-items .cart-item');
  const el = items[index];

  const commit = () => {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    showToast('Item removed from cart');
  };

  if (el) {
    el.classList.add('removing');
    setTimeout(commit, 200);
  } else {
    commit();
  }
}

function clearCart() {
  localStorage.removeItem('cart');
  renderCartPreview();
  renderFullCart();
  showToast('Cart cleared');
}

// ---------- Floating mini-cart (every page) ----------
function renderCartPreview() {
  const countEl = document.getElementById('cart-count');
  const listEl = document.getElementById('preview-items');
  const totalEl = document.getElementById('preview-total');
  if (!countEl || !listEl || !totalEl) return;

  const cart = getCart();
  const totalItems = cart.reduce((n, item) => n + (item.quantity || 1), 0);
  countEl.textContent = totalItems;
  listEl.innerHTML = '';

  if (cart.length === 0) {
    listEl.innerHTML = '<li class="empty">Your cart is empty</li>';
  } else {
    cart.forEach(item => {
      const li = document.createElement('li');
      const qty = item.quantity || 1;
      const thumb = item.image ? `<img src="${item.image}" alt="">` : '';
      li.innerHTML = `${thumb}<span>${item.productName} (${item.size || 'M'}) x${qty} - ₦${(item.price * qty).toLocaleString()}</span>`;
      listEl.appendChild(li);
    });
  }

  totalEl.textContent = cartTotal(cart).toLocaleString();
}

function toggleCartPreview() {
  const preview = document.getElementById('cart-preview');
  if (!preview) return;
  preview.classList.toggle('open');
}

// ---------- Full cart page ----------
function renderFullCart() {
  const cartDiv = document.getElementById('cart-items');
  if (!cartDiv) return;

  const cart = getCart();
  const actions = document.querySelector('.cart-actions');
  const countLabel = document.getElementById('cart-item-count');

  if (cart.length === 0) {
    cartDiv.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.5 9h-12z"></path><path d="M6 6 5 3H2"></path><circle cx="9" cy="20" r="1.5"></circle><circle cx="18" cy="20" r="1.5"></circle></svg>
        <h3>Your cart is empty</h3>
        <p>Looks like you haven't added anything yet.</p>
        <a href="shop.html" class="btn btn-primary">Start Shopping</a>
      </div>`;
    if (actions) actions.classList.add('cart-actions-empty');
    if (countLabel) countLabel.textContent = '';
    return;
  }

  if (actions) actions.classList.remove('cart-actions-empty');
  if (countLabel) {
    const totalItems = cart.reduce((n, item) => n + (item.quantity || 1), 0);
    countLabel.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;
  }

  let html = "<ul class='cart-list'>";
  cart.forEach((item, index) => {
    const qty = item.quantity || 1;
    const stock = Number.isFinite(item.stock) ? item.stock : Infinity;
    const atMax = qty >= stock;
    const thumb = item.image
      ? `<img class="cart-item-img" src="${item.image}" alt="${item.productName}">`
      : `<div class="cart-item-img cart-item-img-placeholder">🧺</div>`;
    html += `
      <li class="cart-item">
        ${thumb}
        <div class="cart-item-info">
          <span class="cart-item-name">${item.productName}</span>
          <span class="cart-item-size">Size: ${item.size || 'M'}</span>
          ${atMax ? '<span class="cart-item-max-note">Max available in stock</span>' : ''}
        </div>
        <div class="cart-item-actions">
          <div class="cart-item-qty">
            <button type="button" onclick="updateQuantity(${index}, -1)" aria-label="Decrease quantity">&minus;</button>
            <span>${qty}</span>
            <button type="button" onclick="updateQuantity(${index}, 1)" aria-label="Increase quantity" ${atMax ? 'disabled' : ''}>+</button>
          </div>
          <span class="cart-item-price">₦${(item.price * qty).toLocaleString()}</span>
          <button type="button" class="cart-item-remove" onclick="removeFromCart(${index})" aria-label="Remove item">&times;</button>
        </div>
      </li>`;
  });
  html += `</ul><p class="cart-total"><strong>Total: ₦${cartTotal(cart).toLocaleString()}</strong></p>`;
  cartDiv.innerHTML = html;
}

// ---------- Toast notifications ----------
function showToast(message, type) {
  type = type || 'success';

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ---------- Hero photo backdrop ----------
// Ambient, autoplay-only crossfade — deliberately no click/swipe navigation.
let heroSlideIndex = 0;

function initHeroSlideshow() {
  const slides = document.querySelectorAll('#lookbook-slideshow .hero-slide');
  if (slides.length <= 1) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  setInterval(() => {
    heroSlideIndex = (heroSlideIndex + 1) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle('active', i === heroSlideIndex));
  }, 3200);
}

// ---------- Back to top ----------
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', function () {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  btn.classList.toggle('show', window.scrollY > 400);
});

// ---------- Mobile nav ----------
function toggleNav() {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (!nav) return;
  const isOpen = nav.classList.toggle('open');
  if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));
}

function closeNav() {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.nav-toggle');
  if (nav) nav.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
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

// ---------- Chat widget ----------
function toggleChatWidget() {
  const preview = document.getElementById('chat-preview');
  if (!preview) return;
  preview.classList.toggle('open');
}

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

document.addEventListener('DOMContentLoaded', function () {
  renderProductsGrid();
  renderCartPreview();
  renderFullCart();
  highlightActiveNavLink();
  initScrollReveal();
  initHeroSlideshow();

  const copyrightYear = document.getElementById('copyright-year');
  if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

  document.querySelectorAll('#site-nav a').forEach(link => {
    link.addEventListener('click', closeNav);
  });
});
