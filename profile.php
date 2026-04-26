<?php
// ============================================================
//  profile.php — Edit own user profile
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

$authUser = Auth::require();          // redirects to login if not authenticated
$db       = Database::getInstance();
$userRepo = new UserRepository($db);

$errors  = [];
$success = false;

// ── Available avatar emojis ────────────────────────────────────
$avatarOptions = ['🏃','🚴','🏊','🧗','⛷️','🤸','🏋️','🧘','🤾','🚵','🏇','🤼','🥇','🔥','⚡','🌟','💪','🎯'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'profile';

    if ($action === 'profile') {
        // ── Update profile ─────────────────────────────────────
        $name   = trim($_POST['name']   ?? '');
        $email  = trim($_POST['email']  ?? '');
        $avatar = trim($_POST['avatar'] ?? '');
        $bio    = trim($_POST['bio']    ?? '');

        if (!$name)  $errors[] = 'Name is required.';
        if (!$email) $errors[] = 'Email is required.';
        elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Invalid email address.';
        elseif ($userRepo->emailExists($email, $authUser->id)) $errors[] = 'That email is already in use.';

        if (!$errors) {
            $userRepo->updateFullProfile($authUser->id, $name, $email, $avatar ?: null, $bio ?: null);
            // Refresh cached user
            Auth::bustCache();
            $authUser = $userRepo->findById($authUser->id);
            $success  = 'Profile updated.';
        }

    } elseif ($action === 'password') {
        // ── Change password ────────────────────────────────────
        $current  = $_POST['current_password']  ?? '';
        $newPw    = $_POST['new_password']       ?? '';
        $confirm  = $_POST['confirm_password']   ?? '';

        // Fetch raw row to verify current password
        $raw = $userRepo->findByEmail($authUser->email);
        if (!$current || !password_verify($current, $raw['password_hash'] ?? '')) {
            $errors[] = 'Current password is incorrect.';
        }
        if (strlen($newPw) < 8) $errors[] = 'New password must be at least 8 characters.';
        if ($newPw !== $confirm)  $errors[] = 'New passwords do not match.';

        if (!$errors) {
            $userRepo->updatePassword($authUser->id, password_hash($newPw, PASSWORD_DEFAULT));
            $success = 'Password changed.';
        }
    }
}

$pageTitle = 'Edit Profile';
require __DIR__ . '/layout/header.php';
?>
<style>
.profile-wrap {
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
}
.profile-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.25rem;
}
.profile-section h2 {
  font-size: .95rem;
  font-weight: 700;
  color: var(--text-900);
  margin: 0 0 1.25rem;
  padding-bottom: .6rem;
  border-bottom: 1px solid var(--surface-border);
}
.form-row { margin-bottom: 1rem; }
.form-row label {
  display: block;
  font-size: .78rem;
  font-weight: 600;
  color: var(--text-300);
  margin-bottom: .35rem;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.form-row input,
.form-row textarea {
  width: 100%;
  background: var(--surface-page);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-sm);
  color: var(--text-900);
  padding: .55rem .75rem;
  font-size: .9rem;
  font-family: var(--font-family);
  transition: border-color .15s;
}
.form-row input:focus,
.form-row textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}
.form-row textarea { resize: vertical; min-height: 80px; }

/* Avatar picker */
.avatar-preview {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: #3b82f6;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.9rem;
  margin-bottom: 1rem;
  border: 3px solid var(--surface-border);
  transition: border-color .15s;
  user-select: none;
}
.avatar-grid {
  display: flex; flex-wrap: wrap; gap: .45rem;
}
.avatar-opt {
  width: 44px; height: 44px;
  border-radius: 50%;
  background: var(--surface-page);
  border: 2px solid var(--surface-border);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.avatar-opt:hover { background: rgba(59,130,246,.1); border-color: #3b82f6; }
.avatar-opt.selected { border-color: #3b82f6; background: rgba(59,130,246,.15); }
.avatar-opt-clear {
  font-size: .7rem; font-weight: 700;
  color: var(--text-300);
  border-color: var(--surface-border);
}

.alert {
  padding: .7rem .9rem;
  border-radius: var(--radius-sm);
  font-size: .85rem;
  margin-bottom: 1rem;
}
.alert-success { background: #0d2318; border: 1px solid #22c55e; color: #4ade80; }
.alert-error   { background: #2a0c0c; border: 1px solid #fb7185; color: #fca5a5; }

.btn-primary {
  background: #3b82f6; color: #fff;
  border: none; border-radius: var(--radius-sm);
  padding: .6rem 1.25rem;
  font-size: .88rem; font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.btn-primary:hover { background: #2563eb; }

.page-header-back {
  display: flex; align-items: center; gap: .5rem;
  color: var(--text-300); font-size: .82rem;
  text-decoration: none;
  margin-bottom: 1.25rem;
  transition: color .15s;
}
.page-header-back:hover { color: var(--text-900); }
</style>

<div class="profile-wrap">
  <a href="journeys.php" class="page-header-back">← Back</a>

  <div class="page-header" style="margin-bottom:1.25rem;border-radius:var(--radius-lg)">
    <div>
      <p class="page-eyebrow">Account</p>
      <h1 class="page-title">Edit Profile</h1>
    </div>
    <div class="avatar-preview" id="avatarBig">
      <?= htmlspecialchars($authUser->displayAvatar()) ?>
    </div>
  </div>

  <?php if ($success): ?>
  <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
  <?php endif; ?>
  <?php if ($errors): ?>
  <div class="alert alert-error"><?= implode('<br>', array_map('htmlspecialchars', $errors)) ?></div>
  <?php endif; ?>

  <!-- ── Profile form ── -->
  <form method="POST" action="profile.php">
    <input type="hidden" name="action" value="profile">

    <div class="profile-section">
      <h2>Avatar</h2>
      <div class="avatar-grid">
        <!-- Clear / initials option -->
        <button type="button"
                class="avatar-opt avatar-opt-clear <?= !$authUser->avatar ? 'selected' : '' ?>"
                onclick="selectAvatar('')"
                title="Use initials">A</button>
        <?php foreach ($avatarOptions as $emoji): ?>
        <button type="button"
                class="avatar-opt <?= $authUser->avatar === $emoji ? 'selected' : '' ?>"
                onclick="selectAvatar('<?= $emoji ?>')"><?= $emoji ?></button>
        <?php endforeach; ?>
      </div>
      <input type="hidden" name="avatar" id="avatarInput"
             value="<?= htmlspecialchars($authUser->avatar ?? '') ?>">
    </div>

    <div class="profile-section">
      <h2>Personal Info</h2>

      <div class="form-row">
        <label>Name *</label>
        <input type="text" name="name" required maxlength="200"
               value="<?= htmlspecialchars($authUser->name) ?>">
      </div>

      <div class="form-row">
        <label>Email *</label>
        <input type="email" name="email" required maxlength="255"
               value="<?= htmlspecialchars($authUser->email) ?>">
      </div>

      <div class="form-row">
        <label>Bio</label>
        <textarea name="bio" maxlength="500"
                  placeholder="A short description about yourself…"><?= htmlspecialchars($authUser->bio ?? '') ?></textarea>
      </div>
    </div>

    <div style="text-align:right">
      <button type="submit" class="btn-primary">Save Profile</button>
    </div>
  </form>

  <!-- ── Password form ── -->
  <form method="POST" action="profile.php" style="margin-top:1.5rem">
    <input type="hidden" name="action" value="password">

    <div class="profile-section">
      <h2>Change Password</h2>

      <div class="form-row">
        <label>Current Password</label>
        <input type="password" name="current_password" autocomplete="current-password">
      </div>
      <div class="form-row">
        <label>New Password</label>
        <input type="password" name="new_password" autocomplete="new-password" minlength="8">
      </div>
      <div class="form-row">
        <label>Confirm New Password</label>
        <input type="password" name="confirm_password" autocomplete="new-password">
      </div>
    </div>

    <div style="text-align:right">
      <button type="submit" class="btn-primary">Change Password</button>
    </div>
  </form>
</div>

<script>
const initialName = <?= json_encode(strtoupper(substr($authUser->name, 0, 1))) ?>;

function selectAvatar(emoji) {
  document.getElementById('avatarInput').value = emoji;
  document.getElementById('avatarBig').textContent = emoji || initialName;
  document.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.classList.toggle('selected',
      (emoji === '' && btn.classList.contains('avatar-opt-clear')) ||
      (emoji !== '' && btn.textContent === emoji)
    );
  });
}
</script>

<?php require __DIR__ . '/layout/footer.php'; ?>
