// ---------- Chat widget ----------
function toggleChatWidget() {
  const preview = document.getElementById('chat-preview');
  if (!preview) return;
  preview.classList.toggle('open');
}
