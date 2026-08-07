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
    console.error('Failed to load orders:', error);
    list.innerHTML = `<p class="empty-state">Failed to load orders: ${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data.length) {
    list.innerHTML = '<p class="empty-state">No orders yet.</p>';
    return;
  }

  const STATUSES = ['paid', 'oversold', 'shipped', 'delivered', 'cancelled'];

  list.innerHTML = data.map(o => {
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsLabel = items
      .map(it => `${it.productName || it.name || 'Item'} (${it.size || 'M'}) x${it.quantity || 1}`)
      .join(', ');
    const date = new Date(o.created_at).toLocaleString();
    const country = o.country || 'Nigeria';
    const isInternational = country !== 'Nigeria';
    const status = STATUSES.includes(o.status) ? o.status : 'paid';

    return `
      <div class="admin-order-row" data-status="${status}">
        <div class="admin-order-header">
          <strong>${escapeHtml(o.customer_name)}</strong>
          <span>&#8358;${Number(o.total).toLocaleString()}</span>
        </div>
        <div class="admin-order-meta">
          ${escapeHtml(date)} &middot; ${escapeHtml(o.state)}, ${escapeHtml(country)} &middot; ${escapeHtml(o.phone)} &middot; ${escapeHtml(o.email)}
          ${isInternational ? '<span class="admin-order-intl-badge">International — confirm shipping</span>' : ''}
          ${status === 'oversold' ? '<span class="admin-order-oversold-badge">⚠️ Oversold — refund or restock needed</span>' : ''}
        </div>
        <div class="admin-order-items">${escapeHtml(itemsLabel)}</div>
        <div class="admin-order-footer">
          <span class="admin-order-ref">Ref: ${escapeHtml(o.reference)}</span>
          <select class="admin-order-status" aria-label="Order status for ${escapeHtml(o.customer_name)}" onchange="updateOrderStatus('${o.id}', this)">
            <option value="paid" ${status === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="oversold" ${status === 'oversold' ? 'selected' : ''}>Oversold</option>
            <option value="shipped" ${status === 'shipped' ? 'selected' : ''}>Shipped</option>
            <option value="delivered" ${status === 'delivered' ? 'selected' : ''}>Delivered</option>
            <option value="cancelled" ${status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      </div>`;
  }).join('');
}

async function updateOrderStatus(id, selectEl) {
  const newStatus = selectEl.value;
  const row = selectEl.closest('.admin-order-row');

  selectEl.disabled = true;
  const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', id);
  selectEl.disabled = false;

  if (error) {
    showToast('Failed to update status: ' + error.message, 'error');
    return;
  }

  if (row) row.dataset.status = newStatus;
  showToast('Order status updated');
}
