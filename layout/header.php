<?php
if (!isset($pageTitle)) $pageTitle = 'Training Tracker';
$_authUser = \App\Auth::user();

if (!isset($basePath)) {
    $_scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
    $basePath   = ($_scriptDir === '' || $_scriptDir === '.') ? '/' : $_scriptDir . '/';
}

$_currentPage = basename($_SERVER['SCRIPT_NAME'] ?? '');
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#1e3a5f">
<title><?= htmlspecialchars($pageTitle) ?> — Training Tracker</title>
<link rel="stylesheet" href="<?= htmlspecialchars($basePath) ?>public/dist/styles.css">
<style>
.tt-user-menu-trigger {
  cursor: pointer; border-radius: 8px;
  padding: .4rem .5rem; margin: -.4rem -.5rem;
  transition: background .15s; position: relative;
}
.tt-user-menu-trigger:hover { background: rgba(255,255,255,.08); }
.tt-sidebar-logout-hint { font-size: .72rem; color: rgba(255,255,255,.45); }
.tt-user-popup {
  position: fixed; bottom: auto; left: auto;
  background: #1e2d45; border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.4);
  z-index: 9999; overflow: hidden; display: none; min-width: 220px; width: 220px;
}
.tt-user-popup.open { display: block; }
.tt-user-popup-header { display: flex; align-items: center; gap: .65rem; padding: .9rem 1rem .75rem; }
.tt-user-popup-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #3b82f6; display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 700; color: #fff; flex-shrink: 0;
}
.tt-user-popup-name  { font-size: .84rem; font-weight: 600; color: #fff; }
.tt-user-popup-email { font-size: .72rem; color: rgba(255,255,255,.45); }
.tt-user-popup-divider { height: 1px; background: rgba(255,255,255,.1); }
.tt-user-popup-item {
  display: flex; align-items: center; gap: .6rem; padding: .65rem 1rem;
  font-size: .84rem; color: rgba(255,255,255,.8); text-decoration: none;
  transition: background .12s, color .12s;
}
.tt-user-popup-item:hover { background: rgba(255,255,255,.08); color: #fff; }
.tt-user-popup-signout { color: rgba(251,113,133,.85); }
.tt-user-popup-signout:hover { background: rgba(251,113,133,.1); color: #fb7185; }
.tt-user-popup-icon { font-style: normal; width: 1.1rem; text-align: center; }
</style>
<script>
function ttToggleUserMenu(e) {
  e.stopPropagation();
  var popup   = document.getElementById('ttUserPopup');
  var trigger = document.getElementById('ttUserMenuTrigger');
  var isOpen  = popup.classList.contains('open');
  if (!isOpen) {
    var rect = trigger.getBoundingClientRect();
    popup.style.left   = rect.left + 'px';
    popup.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    popup.style.top    = 'auto';
  }
  popup.classList.toggle('open', !isOpen);
  trigger.setAttribute('aria-expanded', String(!isOpen));
}
document.addEventListener('click', function(e) {
  var popup   = document.getElementById('ttUserPopup');
  var trigger = document.getElementById('ttUserMenuTrigger');
  if (!popup || !trigger) return;
  if (!popup.contains(e.target) && !trigger.contains(e.target)) {
    popup.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  var popup   = document.getElementById('ttUserPopup');
  var trigger = document.getElementById('ttUserMenuTrigger');
  if (popup) { popup.classList.remove('open'); trigger && trigger.setAttribute('aria-expanded', 'false'); }
});
</script>
</head>
<body>

<?php if ($_authUser): ?>
<div class="tt-shell">

  <aside class="tt-sidebar">
    <div class="tt-sidebar-brand">
      <span class="tt-sidebar-logo">🏃</span>
      <span class="tt-sidebar-name">Training<br>Tracker</span>
    </div>

    <nav class="tt-sidebar-nav">
      <a href="<?= htmlspecialchars($basePath) ?>journeys.php"
         class="tt-nav-item <?= in_array($_currentPage, ['journeys.php','index.php']) ? 'active' : '' ?>">
        <i class="tt-nav-icon">🗓</i>
        <span>Journeys</span>
      </a>
      <a href="<?= htmlspecialchars($basePath) ?>builder.php"
         class="tt-nav-item <?= $_currentPage === 'builder.php' ? 'active' : '' ?>">
        <i class="tt-nav-icon">🔨</i>
        <span>Plan Builder</span>
      </a>
      <a href="<?= htmlspecialchars($basePath) ?>plans.php"
         class="tt-nav-item <?= $_currentPage === 'plans.php' ? 'active' : '' ?>">
        <i class="tt-nav-icon">📋</i>
        <span>Plans</span>
      </a>
      <a href="<?= htmlspecialchars($basePath) ?>exercises.php"
         class="tt-nav-item <?= $_currentPage === 'exercises.php' ? 'active' : '' ?>">
        <i class="tt-nav-icon">💪</i>
        <span>Exercises</span>
      </a>
      <?php if ($_authUser->isAdmin()): ?>
      <a href="<?= htmlspecialchars($basePath) ?>admin/users.php"
         class="tt-nav-item <?= $_currentPage === 'users.php' ? 'active' : '' ?>">
        <i class="tt-nav-icon">⚙️</i>
        <span>Admin</span>
      </a>
      <?php endif; ?>
    </nav>

    <div class="tt-sidebar-footer">
      <!-- User popup trigger -->
      <div class="tt-sidebar-user tt-user-menu-trigger" id="ttUserMenuTrigger"
           onclick="ttToggleUserMenu(event)" role="button" tabindex="0"
           aria-haspopup="true" aria-expanded="false">
        <span class="tt-sidebar-avatar"><?= htmlspecialchars($_authUser->displayAvatar()) ?></span>
        <div class="tt-sidebar-user-info">
          <div class="tt-sidebar-user-name"><?= htmlspecialchars($_authUser->name) ?></div>
          <span class="tt-sidebar-logout-hint">Account ▾</span>
        </div>
      </div>

      <!-- Popup menu -->
      <div class="tt-user-popup" id="ttUserPopup" role="menu">
        <div class="tt-user-popup-header">
          <span class="tt-user-popup-avatar"><?= htmlspecialchars($_authUser->displayAvatar()) ?></span>
          <div>
            <div class="tt-user-popup-name"><?= htmlspecialchars($_authUser->name) ?></div>
            <div class="tt-user-popup-email"><?= htmlspecialchars($_authUser->email) ?></div>
          </div>
        </div>
        <div class="tt-user-popup-divider"></div>
        <a href="<?= htmlspecialchars($basePath) ?>profile.php" class="tt-user-popup-item" role="menuitem">
          <span class="tt-user-popup-icon">✏️</span> Edit Profile
        </a>
        <div class="tt-user-popup-divider"></div>
        <a href="<?= htmlspecialchars($basePath) ?>logout.php" class="tt-user-popup-item tt-user-popup-signout" role="menuitem">
          <span class="tt-user-popup-icon">→</span> Sign out
        </a>
      </div>
    </div>
  </aside>

  <header class="tt-topbar">
    <button class="tt-menu-btn" onclick="document.querySelector('.tt-sidebar').classList.toggle('open')" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <a href="<?= htmlspecialchars($basePath) ?>journeys.php" class="tt-topbar-brand">🏃 Training Tracker</a>
    <a href="<?= htmlspecialchars($basePath) ?>logout.php" class="tt-topbar-logout" title="Sign out">→</a>
  </header>

  <div class="tt-sidebar-backdrop" onclick="document.querySelector('.tt-sidebar').classList.remove('open')"></div>

  <main class="tt-main">
<?php else: ?>
<main class="tt-main tt-main-full">
<?php endif; ?>
