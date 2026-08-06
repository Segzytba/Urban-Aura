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
