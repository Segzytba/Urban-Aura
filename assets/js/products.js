// Renders the shop grid (#products-grid) and the product detail page
// (#product-detail) from the `products` table in Supabase, so adding,
// removing, or updating stock only means editing that table (via the
// admin panel or the Supabase dashboard).

function renderProductCard(p) {
  const name = escapeHtml(p.name);
  const priceLabel = `&#8358;${p.price.toLocaleString()}.NGN`;
  const stock = Number.isFinite(p.stock) ? p.stock : 10;
  const detailHref = `product.html?id=${encodeURIComponent(p.id)}`;

  if (stock <= 0) {
    return `
      <div class="product sold-out" data-name="${name}" data-price="${p.price}">
        <a href="${detailHref}" class="product-media-link" aria-label="View ${name} details">
          <img src="${p.image}" alt="${name}" loading="lazy">
        </a>
        <span class="sold-out-badge">Sold Out</span>
        <a href="${detailHref}" class="product-title-link"><h3>${name.toUpperCase()}</h3></a>
        <p>${priceLabel}</p>
        <a class="restock-link" href="https://wa.link/ao2tmy" target="_blank" rel="noopener">Ask about restock&nbsp;&rarr;</a>
      </div>`;
  }

  return `
    <div class="product" data-name="${name}" data-price="${p.price}" data-stock="${stock}">
      <a href="${detailHref}" class="product-media-link" aria-label="View ${name} details">
        <img src="${p.image}" alt="${name}" loading="lazy">
      </a>
      <a href="${detailHref}" class="product-title-link"><h3>${name.toUpperCase()}</h3></a>
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

// ---------- Product detail page ----------
function renderProductDetail(p) {
  const name = escapeHtml(p.name);
  const priceLabel = `&#8358;${p.price.toLocaleString()}.NGN`;
  const stock = Number.isFinite(p.stock) ? p.stock : 10;

  if (stock <= 0) {
    return `
      <div class="product product-detail-box sold-out" data-name="${name}" data-price="${p.price}">
        <img src="${p.image}" alt="${name}">
        <div class="product-detail-info">
          <span class="sold-out-badge">Sold Out</span>
          <h3>${name.toUpperCase()}</h3>
          <p>${priceLabel}</p>
          <a class="restock-link" href="https://wa.link/ao2tmy" target="_blank" rel="noopener">Ask about restock&nbsp;&rarr;</a>
        </div>
      </div>`;
  }

  return `
    <div class="product product-detail-box" data-name="${name}" data-price="${p.price}" data-stock="${stock}">
      <img src="${p.image}" alt="${name}">
      <div class="product-detail-info">
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
      </div>
    </div>`;
}

async function renderProductDetailPage() {
  const container = document.getElementById('product-detail');
  if (!container || typeof supabaseClient === 'undefined') return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if (!id) {
    container.innerHTML = '<p class="empty-state">Product not found. <a href="shop.html">Back to shop &rarr;</a></p>';
    return;
  }

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    container.innerHTML = '<p class="empty-state">Sorry, we couldn\'t find that product. <a href="shop.html">Back to shop &rarr;</a></p>';
    return;
  }

  document.title = `${data.name} - Urban Aura`;
  container.innerHTML = renderProductDetail(data);
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
