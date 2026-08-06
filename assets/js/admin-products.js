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
