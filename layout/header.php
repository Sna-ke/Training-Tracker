<?php
if (!isset($pageTitle)) $pageTitle = 'Training Tracker';
$_authUser = \App\Auth::user();

if (!isset($basePath)) {
    $_scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
    $basePath   = ($_scriptDir === '' || $_scriptDir === '.') ? '/' : $_scriptDir . '/';
}

// Which nav item is active?
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
<!-- Shell layout (sidebar/topbar/main) -->
<link rel="stylesheet" href="<?= htmlspecialchars($basePath) ?>public/css/app.css">
<!-- All design tokens, PrimeNG, component styles — every page -->
<link rel="stylesheet" href="<?= htmlspecialchars($basePath) ?>public/dist/styles.css">
<?php endif; ?>
</head>
<body>

<?php if ($_authUser): ?>
<!-- ══════════════════════════════════════════════════════
     SIDEBAR + MAIN SHELL
     ══════════════════════════════════════════════════════ -->
<div class="tt-shell">

  <!-- ── Sidebar ── -->
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
      <div class="tt-sidebar-user">
        <span class="tt-sidebar-avatar"><?= strtoupper(substr($_authUser->name, 0, 1)) ?></span>
        <div class="tt-sidebar-user-info">
          <div class="tt-sidebar-user-name"><?= htmlspecialchars($_authUser->name) ?></div>
          <a href="<?= htmlspecialchars($basePath) ?>logout.php" class="tt-sidebar-logout">Sign out</a>
        </div>
      </div>
    </div>
  </aside>

  <!-- ── Mobile top bar ── -->
  <header class="tt-topbar">
    <button class="tt-menu-btn" onclick="document.querySelector('.tt-sidebar').classList.toggle('open')" aria-label="Menu">
      <span></span><span></span><span></span>
    </button>
    <a href="<?= htmlspecialchars($basePath) ?>journeys.php" class="tt-topbar-brand">🏃 Training Tracker</a>
    <a href="<?= htmlspecialchars($basePath) ?>logout.php" class="tt-topbar-logout" title="Sign out">→</a>
  </header>

  <!-- Sidebar backdrop for mobile -->
  <div class="tt-sidebar-backdrop" onclick="document.querySelector('.tt-sidebar').classList.remove('open')"></div>

  <!-- ── Main content area ── -->
  <main class="tt-main">
<?php else: ?>
<main class="tt-main tt-main-full">
<?php endif; ?>
