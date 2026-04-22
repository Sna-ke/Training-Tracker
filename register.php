<?php
// ============================================================
//  register.php — New account registration
//  First registered user automatically gets admin role.
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

if (Auth::user()) { header('Location: journeys.php'); exit; }

$db       = Database::getInstance();
$userRepo = new UserRepository($db);

// Is this the very first user? → make them admin
$isFirst = (int)$db->fetchScalar('SELECT COUNT(*) FROM users') === 0;

$errors = [];
$values = ['name' => '', 'email' => ''];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name     = trim($_POST['name']     ?? '');
    $email    = trim($_POST['email']    ?? '');
    $password =      $_POST['password'] ?? '';
    $confirm  =      $_POST['confirm']  ?? '';

    if (!$name)                            $errors['name']     = 'Name is required.';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Valid email required.';
    elseif ($userRepo->emailExists($email)) $errors['email']   = 'Email already registered.';
    if (strlen($password) < 8)             $errors['password'] = 'Password must be at least 8 characters.';
    if ($password !== $confirm)            $errors['confirm']  = 'Passwords do not match.';

    $values = ['name' => $name, 'email' => $email];

    if (!$errors) {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $role = $isFirst ? 'admin' : 'user';
        $user = $userRepo->create($name, $email, $hash, $role);
        Auth::login($user->id);
        header('Location: journeys.php'); exit;
    }
}

$pageTitle = 'Create Account';
require __DIR__ . '/layout/header.php';
?>
<style>
.auth-wrap { max-width:420px;margin:3rem auto;padding:0 1rem }
.auth-card { background:var(--bg2);border:1px solid var(--bd);border-radius:var(--r);padding:2rem }
.auth-logo  { text-align:center;margin-bottom:1.75rem }
.auth-logo-mark { font-size:2rem;margin-bottom:.3rem }
.auth-logo-name { font-size:1.05rem;color:#f8fafc;font-weight:600 }
.auth-logo-sub  { font-size:.68rem;color:var(--t4) }
.field-err  { font-size:.68rem;color:#fb7185;margin-top:.25rem }
.auth-footer { text-align:center;margin-top:1.25rem;font-size:.75rem;color:var(--t4) }
.auth-footer a { color:var(--c2);text-decoration:none }
.first-badge { background:#0f2a1a;border:1px solid #16a34a;color:#86efac;border-radius:var(--rs);padding:.55rem .85rem;margin-bottom:1rem;font-size:.78rem;text-align:center }
</style>

<div class="auth-wrap">
  <div class="auth-card">
    <div class="auth-logo">
      <div class="auth-logo-mark">🏃</div>
      <div class="auth-logo-name">Training Tracker</div>
      <div class="auth-logo-sub">Create your account</div>
    </div>

    <?php if ($isFirst): ?>
    <div class="first-badge">👑 First account — you'll be set as admin</div>
    <?php endif; ?>

    <form method="POST">
      <div class="field" style="margin-bottom:.85rem">
        <label>Name</label>
        <input type="text" name="name" required autocomplete="name"
               value="<?= htmlspecialchars($values['name']) ?>"
               placeholder="Your name" style="min-height:46px;font-size:16px" autofocus>
        <?php if (!empty($errors['name'])): ?><div class="field-err"><?= $errors['name'] ?></div><?php endif; ?>
      </div>
      <div class="field" style="margin-bottom:.85rem">
        <label>Email</label>
        <input type="email" name="email" required autocomplete="email"
               value="<?= htmlspecialchars($values['email']) ?>"
               placeholder="you@example.com" style="min-height:46px;font-size:16px">
        <?php if (!empty($errors['email'])): ?><div class="field-err"><?= $errors['email'] ?></div><?php endif; ?>
      </div>
      <div class="field" style="margin-bottom:.85rem">
        <label>Password <span style="color:var(--t4);font-weight:normal">(min 8 chars)</span></label>
        <input type="password" name="password" required autocomplete="new-password"
               placeholder="••••••••" style="min-height:46px;font-size:16px">
        <?php if (!empty($errors['password'])): ?><div class="field-err"><?= $errors['password'] ?></div><?php endif; ?>
      </div>
      <div class="field" style="margin-bottom:1.25rem">
        <label>Confirm Password</label>
        <input type="password" name="confirm" required autocomplete="new-password"
               placeholder="••••••••" style="min-height:46px;font-size:16px">
        <?php if (!empty($errors['confirm'])): ?><div class="field-err"><?= $errors['confirm'] ?></div><?php endif; ?>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;min-height:48px;font-size:.9rem">
        Create Account
      </button>
    </form>

    <div class="auth-footer">
      Already have an account? <a href="login.php">Sign in</a>
    </div>
  </div>
</div>

<?php require __DIR__ . '/layout/footer.php'; ?>
