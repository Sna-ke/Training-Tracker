<?php
// ============================================================
//  login.php — Email + password authentication
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

// Already logged in?
if (Auth::user()) {
    header('Location: journeys.php'); exit;
}

$db       = Database::getInstance();
$userRepo = new UserRepository($db);

$error  = null;
$next   = preg_replace('/[^a-zA-Z0-9\/_\-\.?=&]/', '', $_GET['next'] ?? '');
if (!$next || str_starts_with($next, '//')) $next = 'journeys.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email']    ?? '');
    $password =      $_POST['password'] ?? '';

    if (!$email || !$password) {
        $error = 'Email and password are required.';
    } else {
        $row = $userRepo->findByEmail($email);

        if (!$row || !(bool)$row['is_active']) {
            $error = 'Invalid email or password.';
        } elseif (!password_verify($password, $row['password_hash'] ?? '')) {
            $error = 'Invalid email or password.';
        } else {
            Auth::login((int)$row['id']);
            header('Location: ' . $next); exit;
        }
    }
}

$pageTitle = 'Sign In';
require __DIR__ . '/layout/header.php';
?>
<style>
.auth-wrap { max-width:420px;margin:3rem auto;padding:0 1rem }
.auth-card { background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:2rem }
.auth-logo  { text-align:center;margin-bottom:1.75rem }
.auth-logo-mark { font-size:2rem;margin-bottom:.3rem }
.auth-logo-name { font-size:1.05rem;color:#f8fafc;font-weight:600 }
.auth-logo-sub  { font-size:.68rem;color:var(--t4) }
.auth-err { background:#2a0c0c;border:1px solid #fb7185;color:#fca5a5;border-radius:var(--rs);padding:.7rem .85rem;margin-bottom:1rem;font-size:.8rem }
.auth-footer { text-align:center;margin-top:1.25rem;font-size:.75rem;color:var(--t4) }
.auth-footer a { color:var(--c2);text-decoration:none }
</style>

<div class="auth-wrap">
  <div class="auth-card">
    <div class="auth-logo">
      <div class="auth-logo-mark">🏃</div>
      <div class="auth-logo-name">Training Tracker</div>
      <div class="auth-logo-sub">Sign in to your account</div>
    </div>

    <?php if ($error): ?>
    <div class="auth-err"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST" action="login.php<?= $next !== 'journeys.php' ? '?next='.urlencode($next) : '' ?>">
      <div class="field" style="margin-bottom:.9rem">
        <label>Email</label>
        <input type="email" name="email" required autocomplete="email"
               value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
               placeholder="you@example.com"
               style="min-height:46px;font-size:16px" autofocus>
      </div>
      <div class="field" style="margin-bottom:1.25rem">
        <label>Password</label>
        <input type="password" name="password" required autocomplete="current-password"
               placeholder="••••••••"
               style="min-height:46px;font-size:16px">
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;min-height:48px;font-size:.9rem">
        Sign In
      </button>
    </form>

    <div class="auth-footer">
      No account? <a href="register.php">Create one</a>
    </div>
  </div>
</div>

<?php require __DIR__ . '/layout/footer.php'; ?>
