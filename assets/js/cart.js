// Cart item shape: { productName, price, size, quantity, image, stock }

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
      const thumb = item.image ? `<img src="${item.image}" alt="${item.productName}">` : '';
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
