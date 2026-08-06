// Admin dashboard: login, product management, order viewing.
// Relies on RLS policies that only grant write access to authenticated users
// (see README) — this file has no special privileges of its own, the
// database is what actually enforces who can do what.

function hideAllAuthViews() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('reset-request-view').style.display = 'none';
  document.getElementById('reset-password-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'none';
  stopInactivityWatcher();
}

// ---------- Auto-logout after inactivity ----------
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
let inactivityTimer = null;

async function logOutForInactivity() {
  await supabaseClient.auth.signOut();
  showToast("You've been logged out due to inactivity", 'error');
}

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(logOutForInactivity, INACTIVITY_LIMIT_MS);
}

function startInactivityWatcher() {
  ACTIVITY_EVENTS.forEach(evt => document.addEventListener(evt, resetInactivityTimer));
  resetInactivityTimer();
}

function stopInactivityWatcher() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = null;
  ACTIVITY_EVENTS.forEach(evt => document.removeEventListener(evt, resetInactivityTimer));
}

function showLoginView() {
  hideAllAuthViews();
  document.getElementById('login-view').style.display = 'block';
}

function showForgotPasswordView() {
  hideAllAuthViews();
  document.getElementById('reset-request-view').style.display = 'block';
}

function showResetPasswordView() {
  hideAllAuthViews();
  document.getElementById('reset-password-view').style.display = 'block';
}

function showDashboardView(email) {
  hideAllAuthViews();
  document.getElementById('dashboard-view').style.display = 'block';
  document.getElementById('admin-email-label').textContent = email || '';
  loadProducts();
  loadOrders();
  startInactivityWatcher();
}

// Single source of truth for which view is shown, driven entirely by
// Supabase's own auth state — avoids race conditions between "already
// logged in" and "arrived via a password recovery link" on page load.
function initAuthListener() {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showResetPasswordView();
    } else if (event === 'SIGNED_OUT') {
      showLoginView();
    } else if (session) {
      showDashboardView(session.user.email);
    } else {
      showLoginView();
    }
  });
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Log In';

  if (error) {
    showToast('Login failed: ' + error.message, 'error');
  }
  // On success, the onAuthStateChange listener switches to the dashboard.
}

async function handleAdminLogout() {
  await supabaseClient.auth.signOut();
  // onAuthStateChange handles the view switch.
}

async function handleResetRequest(e) {
  e.preventDefault();
  const email = document.getElementById('reset-email').value.trim();
  const btn = document.getElementById('reset-request-btn');

  btn.disabled = true;
  btn.textContent = 'Sending...';

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });

  btn.disabled = false;
  btn.textContent = 'Send Reset Link';

  if (error) {
    showToast('Failed to send reset link: ' + error.message, 'error');
    return;
  }
  showToast('Check your email for a reset link');
}

async function handleSetNewPassword(e) {
  e.preventDefault();
  const password = document.getElementById('new-admin-password').value;
  const confirmPassword = document.getElementById('confirm-admin-password').value;

  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  if (password !== confirmPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  const btn = document.getElementById('set-password-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const { error } = await supabaseClient.auth.updateUser({ password });

  btn.disabled = false;
  btn.textContent = 'Set New Password';

  if (error) {
    showToast('Failed to update password: ' + error.message, 'error');
    return;
  }
  showToast('Password updated');
  // onAuthStateChange (USER_UPDATED, session still present) shows the dashboard.
}

// ---------- Confirm modal (shared by add + delete) ----------
function showConfirmModal(message, onConfirm, confirmLabel) {
  const modal = document.getElementById('confirm-modal');
  const msgEl = document.getElementById('confirm-modal-message');
  const okBtn = document.getElementById('confirm-modal-ok');
  const cancelBtn = document.getElementById('confirm-modal-cancel');

  msgEl.textContent = message;
  okBtn.textContent = confirmLabel || 'Confirm';
  modal.style.display = 'flex';

  function cleanup() {
    modal.style.display = 'none';
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  }
  function onOk() { cleanup(); onConfirm(); }
  function onCancel() { cleanup(); }

  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
}

// ---------- Products ----------
let cachedProducts = [];

async function loadProducts() {
  const list = document.getElementById('admin-products-list');
  if (!list) return;

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = '<p class="empty-state">Failed to load products.</p>';
    return;
  }

  cachedProducts = data;

  if (!data.length) {
    list.innerHTML = '<p class="empty-state">No products yet.</p>';
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="admin-product-row">
      <img src="${p.image}" alt="${escapeHtml(p.name)}" class="admin-product-thumb">
      <div class="admin-product-info">
        <strong>${escapeHtml(p.name)}</strong>
        <span>&#8358;${Number(p.price).toLocaleString()}</span>
      </div>
      <div class="admin-product-stock">
        <input type="number" min="0" value="${p.stock}" class="admin-stock-input" data-id="${p.id}">
        <button type="button" class="btn" onclick="saveStock('${p.id}', this)">Save</button>
      </div>
      <button type="button" class="btn admin-edit-btn" onclick="openEditModalById('${p.id}')">Edit</button>
      <button type="button" class="admin-delete-btn" onclick="confirmDeleteProduct('${p.id}', '${escapeHtml(p.name).replace(/'/g, "\\'")}')" aria-label="Delete product">&times;</button>
    </div>`).join('');
}

async function saveStock(id, button) {
  const input = document.querySelector(`.admin-stock-input[data-id="${id}"]`);
  const newStock = Math.max(0, Math.floor(Number(input.value)) || 0);
  input.value = newStock;

  button.disabled = true;
  button.textContent = 'Saving...';

  const { error } = await supabaseClient.from('products').update({ stock: newStock }).eq('id', id);

  button.disabled = false;
  button.textContent = 'Save';

  if (error) {
    showToast('Failed to update stock: ' + error.message, 'error');
    return;
  }
  showToast('Stock updated');
}

function confirmDeleteProduct(id, name) {
  showConfirmModal(`Delete "${name}"? This can't be undone.`, () => deleteProduct(id), 'Delete');
}

async function deleteProduct(id) {
  const { error } = await supabaseClient.from('products').delete().eq('id', id);

  if (error) {
    showToast('Failed to delete: ' + error.message, 'error');
    return;
  }
  showToast('Product deleted');
  loadProducts();
}

async function uploadProductImage(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
  const filePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

  const { error } = await supabaseClient.storage.from('product-images').upload(filePath, file);
  if (error) return { error };

  const { data } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
  return { url: data.publicUrl };
}

function handleAddProduct(e) {
  e.preventDefault();

  const name = document.getElementById('new-name').value.trim();
  const price = Number(document.getElementById('new-price').value);
  const stock = Math.max(0, Math.floor(Number(document.getElementById('new-stock').value)) || 0);
  const fileInput = document.getElementById('new-image-file');
  const file = fileInput.files[0];

  if (!name || !price || !file) {
    showToast('Fill in all fields and choose a photo', 'error');
    return;
  }

  showConfirmModal(
    `Add "${name}" — ₦${price.toLocaleString()}, ${stock} in stock?`,
    () => submitNewProduct(name, price, stock, file),
    'Add Product'
  );
}

async function submitNewProduct(name, price, stock, file) {
  const btn = document.getElementById('add-product-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading photo...';

  const { error: uploadError, url } = await uploadProductImage(file);

  if (uploadError) {
    btn.disabled = false;
    btn.textContent = 'Add Product';
    showToast('Photo upload failed: ' + uploadError.message, 'error');
    return;
  }

  btn.textContent = 'Saving product...';

  const { error } = await supabaseClient.from('products').insert({ name, price, image: url, stock });

  btn.disabled = false;
  btn.textContent = 'Add Product';

  if (error) {
    showToast('Failed to add product: ' + error.message, 'error');
    return;
  }

  showToast('Product added');
  document.getElementById('add-product-form').reset();
  loadProducts();
}

// ---------- Edit product ----------
function openEditModalById(id) {
  const product = cachedProducts.find(p => p.id === id);
  if (!product) return;

  document.getElementById('edit-id').value = product.id;
  document.getElementById('edit-name').value = product.name;
  document.getElementById('edit-price').value = product.price;
  document.getElementById('edit-stock').value = product.stock;
  document.getElementById('edit-image-file').value = '';
  document.getElementById('edit-modal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

async function handleEditProduct(e) {
  e.preventDefault();

  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('edit-name').value.trim();
  const price = Number(document.getElementById('edit-price').value);
  const stock = Math.max(0, Math.floor(Number(document.getElementById('edit-stock').value)) || 0);
  const file = document.getElementById('edit-image-file').files[0];

  if (!name || !price) {
    showToast('Fill in all fields', 'error');
    return;
  }

  const btn = document.getElementById('edit-modal-save');
  btn.disabled = true;
  btn.textContent = file ? 'Uploading photo...' : 'Saving...';

  const updates = { name, price, stock };

  if (file) {
    const { error: uploadError, url } = await uploadProductImage(file);
    if (uploadError) {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
      showToast('Photo upload failed: ' + uploadError.message, 'error');
      return;
    }
    updates.image = url;
  }

  const { error } = await supabaseClient.from('products').update(updates).eq('id', id);

  btn.disabled = false;
  btn.textContent = 'Save Changes';

  if (error) {
    showToast('Failed to save changes: ' + error.message, 'error');
    return;
  }

  showToast('Product updated');
  closeEditModal();
  loadProducts();
}

// ---------- Orders ----------
async function loadOrders() {
  const list = document.getElementById('admin-orders-list');
  if (!list) return;

  const { data, error } = await supabaseClient
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    list.innerHTML = '<p class="empty-state">Failed to load orders.</p>';
    return;
  }

  if (!data.length) {
    list.innerHTML = '<p class="empty-state">No orders yet.</p>';
    return;
  }

  list.innerHTML = data.map(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsLabel = items
      .map(it => `${it.productName || it.name || 'Item'} (${it.size || 'M'}) x${it.quantity || 1}`)
      .join(', ');
    const date = new Date(o.created_at).toLocaleString();
    const country = o.country || 'Nigeria';
    const isInternational = country !== 'Nigeria';

    return `
      <div class="admin-order-row">
        <div class="admin-order-header">
          <strong>${escapeHtml(o.customer_name)}</strong>
          <span>&#8358;${Number(o.total).toLocaleString()}</span>
        </div>
        <div class="admin-order-meta">
          ${escapeHtml(date)} &middot; ${escapeHtml(o.state)}, ${escapeHtml(country)} &middot; ${escapeHtml(o.phone)} &middot; ${escapeHtml(o.email)}
          ${isInternational ? '<span class="admin-order-intl-badge">International — confirm shipping</span>' : ''}
        </div>
        <div class="admin-order-items">${escapeHtml(itemsLabel)}</div>
        <div class="admin-order-ref">Ref: ${escapeHtml(o.reference)}</div>
      </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  const addProductForm = document.getElementById('add-product-form');
  const logoutBtn = document.getElementById('logout-btn');
  const editForm = document.getElementById('edit-product-form');
  const editCancelBtn = document.getElementById('edit-modal-cancel');
  const forgotLink = document.getElementById('forgot-password-link');
  const backToLoginLink = document.getElementById('back-to-login-link');
  const resetRequestForm = document.getElementById('reset-request-form');
  const resetPasswordForm = document.getElementById('reset-password-form');

  if (!loginForm) return; // not on admin.html

  initAuthListener();
  loginForm.addEventListener('submit', handleAdminLogin);
  addProductForm.addEventListener('submit', handleAddProduct);
  logoutBtn.addEventListener('click', handleAdminLogout);
  editForm.addEventListener('submit', handleEditProduct);
  editCancelBtn.addEventListener('click', closeEditModal);

  forgotLink.addEventListener('click', function (e) { e.preventDefault(); showForgotPasswordView(); });
  backToLoginLink.addEventListener('click', function (e) { e.preventDefault(); showLoginView(); });
  resetRequestForm.addEventListener('submit', handleResetRequest);
  resetPasswordForm.addEventListener('submit', handleSetNewPassword);
});
