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
