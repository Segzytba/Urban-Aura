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
