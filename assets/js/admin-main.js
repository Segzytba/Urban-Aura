// Bootstraps admin.html. Loaded last so every function it wires up is
// already defined by the other assets/js/admin-*.js files loaded before it.
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
