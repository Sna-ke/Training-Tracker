<?php
// ============================================================
//  user/view_profile.php — View a user's public profile
//  URL: /user/view_profile.php?user_id=N
//  If user_id is omitted or matches the viewer, shows their own
//  profile as others would see it, with an edit prompt.
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/../app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

$viewer   = Auth::require();
$db       = Database::getInstance();
$userRepo = new UserRepository($db);

// Default to own profile if no user_id given
$targetId = filter_var($_GET['user_id'] ?? $viewer->id, FILTER_VALIDATE_INT);
if (!$targetId) $targetId = $viewer->id;

$isSelf = ($targetId === $viewer->id);

$target = $userRepo->findById($targetId);
if (!$target || !$target->isActive) {
    http_response_code(404);
    $pageTitle = 'User Not Found';
    $basePath  = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/\\') . '/';
    require __DIR__ . '/../layout/header.php';
    echo '<div style="padding:2rem;text-align:center;color:var(--text-300)">User not found.</div>';
    require __DIR__ . '/../layout/footer.php';
    exit;
}

// Check if viewer is an accepted coach of this athlete
$viewerIsCoach = false;
if (!$isSelf) {
    foreach ($userRepo->getCoachesForAthlete($targetId) as $c) {
        if ((int)$c['coach_id'] === $viewer->id && $c['status'] === 'accepted') {
            $viewerIsCoach = true;
            break;
        }
    }
}

$privacy         = $userRepo->getPrivacySettings($targetId);
$consecutiveDays = $userRepo->getConsecutiveDays($targetId);
$activity        = $userRepo->getRecentActivity($targetId, 10);

// Determine what sections to show
$showJourneys  = $viewerIsCoach || (bool)$privacy['share_journeys'];
$showLogs      = $viewerIsCoach || (bool)$privacy['share_exercise_logs'];

$pageTitle = $isSelf ? 'My Public Profile' : $target->name . "'s Profile";
$basePath  = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/\\') . '/';
require __DIR__ . '/../layout/header.php';
?>
<style>
.profile-view-wrap {
  max-width: 660px;
  margin: 0 auto;
  padding: 1.5rem;
}
.profile-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  margin-bottom: 1.25rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}
.profile-avatar-lg {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: #3b82f6;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.2rem;
  border: 3px solid var(--surface-border);
  flex-shrink: 0;
}
.profile-meta { flex: 1; min-width: 0; }
.profile-name {
  font-size: 1.3rem; font-weight: 700;
  color: var(--text-900);
  margin: 0 0 .2rem;
}
.profile-role {
  font-size: .72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-300);
  margin-bottom: .6rem;
}
.profile-bio {
  font-size: .88rem;
  color: var(--text-300);
  line-height: 1.5;
}
.stat-row { display: flex; gap: 1rem; margin-top: .9rem; }
.stat-chip {
  background: rgba(59,130,246,.12);
  border: 1px solid rgba(59,130,246,.25);
  border-radius: 8px;
  padding: .5rem .9rem;
  text-align: center;
}
.stat-chip-value { font-size: 1.4rem; font-weight: 800; color: #3b82f6; line-height: 1; }
.stat-chip-label {
  font-size: .68rem; font-weight: 600;
  color: var(--text-300);
  text-transform: uppercase; letter-spacing: .05em;
  margin-top: .2rem;
}
.section-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.25rem;
}
.section-title {
  font-size: .9rem; font-weight: 700;
  color: var(--text-900);
  margin: 0 0 1rem;
  padding-bottom: .5rem;
  border-bottom: 1px solid var(--surface-border);
}
.journey-row { padding: .6rem 0; border-bottom: 1px solid var(--surface-border); }
.journey-row:last-child { border-bottom: none; }
.journey-name { font-size: .88rem; font-weight: 600; color: var(--text-900); }
.journey-sub  { font-size: .75rem; color: var(--text-300); margin-top: .15rem; }
.progress-bar-wrap {
  height: 5px; background: var(--surface-border);
  border-radius: 3px; margin-top: .4rem; overflow: hidden;
}
.progress-bar-fill { height: 100%; background: #3b82f6; border-radius: 3px; }
.log-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: .55rem 0; border-bottom: 1px solid var(--surface-border); font-size: .85rem;
}
.log-row:last-child { border-bottom: none; }
.log-name  { color: var(--text-900); font-weight: 500; }
.log-date  { color: var(--text-300); font-size: .75rem; }
.log-stats { color: var(--text-300); font-size: .78rem; text-align: right; }
.private-notice {
  text-align: center; color: var(--text-300); font-size: .85rem;
  padding: 1.5rem; background: var(--surface-card);
  border: 1px dashed var(--surface-border);
  border-radius: var(--radius-lg); margin-bottom: 1.25rem;
}
.preview-banner {
  background: #1c2d45; border: 1px solid rgba(59,130,246,.35);
  border-radius: var(--radius-lg); padding: .75rem 1rem; margin-bottom: 1.25rem;
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; font-size: .84rem; color: rgba(255,255,255,.7);
}
.preview-banner strong { color: #fff; }
.preview-banner a { color: #60a5fa; text-decoration: none; white-space: nowrap; font-weight: 600; }
.preview-banner a:hover { text-decoration: underline; }
.page-header-back {
  display: flex; align-items: center; gap: .5rem;
  color: var(--text-300); font-size: .82rem; text-decoration: none;
  margin-bottom: 1.25rem; transition: color .15s;
}
.page-header-back:hover { color: var(--text-900); }
.coach-badge {
  display: inline-block; font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .05em;
  background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.3);
  color: #4ade80; border-radius: 4px; padding: .15rem .45rem;
  margin-left: .5rem; vertical-align: middle;
}
</style>

<div class="profile-view-wrap">
  <a href="<?= htmlspecialchars($basePath) ?>journeys.php" class="page-header-back">← Back</a>

  <?php if ($isSelf): ?>
  <div class="preview-banner">
    <span>👁 <strong>Profile preview</strong> — this is how other users see your profile.</span>
    <a href="<?= htmlspecialchars($basePath) ?>user/edit_profile.php">Edit Profile →</a>
  </div>
  <?php endif; ?>

  <!-- ── Identity card ── -->
  <div class="profile-card">
    <div class="profile-avatar-lg"><?= htmlspecialchars($target->displayAvatar()) ?></div>
    <div class="profile-meta">
      <h1 class="profile-name">
        <?= htmlspecialchars($target->name) ?>
        <?php if ($viewerIsCoach): ?>
          <span class="coach-badge">Your Athlete</span>
        <?php endif; ?>
      </h1>
      <div class="profile-role"><?= htmlspecialchars(ucfirst($target->role)) ?></div>
      <?php if ($target->bio): ?>
        <div class="profile-bio"><?= nl2br(htmlspecialchars($target->bio)) ?></div>
      <?php endif; ?>
      <div class="stat-row">
        <div class="stat-chip">
          <div class="stat-chip-value"><?= $consecutiveDays ?></div>
          <div class="stat-chip-label">Day Streak</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Current Journeys ── -->
  <?php if ($showJourneys && !empty($activity['journeys'])): ?>
  <div class="section-card">
    <div class="section-title">Current Journeys</div>
    <?php foreach ($activity['journeys'] as $j): ?>
    <div class="journey-row">
      <div class="journey-name"><?= htmlspecialchars($j['plan_name']) ?></div>
      <div class="journey-sub"><?= htmlspecialchars($j['template_name']) ?> · <?= (int)$j['total_weeks'] ?> weeks</div>
      <?php $pct = $j['days_total'] > 0 ? round($j['days_done'] / $j['days_total'] * 100) : 0; ?>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width:<?= $pct ?>%"></div>
      </div>
      <div class="journey-sub" style="margin-top:.2rem"><?= (int)$j['days_done'] ?> / <?= (int)$j['days_total'] ?> days · <?= $pct ?>%</div>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>

  <!-- ── Recent Activity ── -->
  <?php if ($showLogs && !empty($activity['exercise_logs'])): ?>
  <div class="section-card">
    <div class="section-title">Recent Activity</div>
    <?php foreach ($activity['exercise_logs'] as $log): ?>
    <div class="log-row">
      <div>
        <div class="log-name"><?= htmlspecialchars($log['exercise_name']) ?></div>
        <div class="log-date"><?= htmlspecialchars($log['scheduled_date'] ?? '') ?></div>
      </div>
      <div class="log-stats">
        <?php
          $parts = [];
          if ($log['sets_done'] && $log['reps_done']) $parts[] = $log['sets_done'].'×'.$log['reps_done'];
          if ($log['weight_kg'])    $parts[] = $log['weight_kg'].'kg';
          if ($log['distance_km']) $parts[] = $log['distance_km'].'km';
          if ($log['duration_min']) $parts[] = $log['duration_min'].'min';
          echo htmlspecialchars(implode(' · ', $parts));
        ?>
      </div>
    </div>
    <?php endforeach; ?>
  </div>
  <?php endif; ?>

  <!-- ── Empty state ── -->
  <?php
    $hasVisible = ($showJourneys && !empty($activity['journeys']))
               || ($showLogs    && !empty($activity['exercise_logs']));
    if (!$hasVisible):
  ?>
  <div class="private-notice">
    <?php if ($isSelf): ?>
      Your activity is not visible to others yet.
      <a href="edit_profile.php" style="color:#60a5fa">Update your sharing settings →</a>
    <?php else: ?>
      🔒 <?= htmlspecialchars($target->name) ?> hasn't shared any activity yet.
    <?php endif; ?>
  </div>
  <?php endif; ?>

</div>

<?php require __DIR__ . '/../layout/footer.php'; ?>
