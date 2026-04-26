<?php
// ============================================================
//  user/view_profile.php — View Profile (Angular page)
//  URL: /user/view_profile.php?user_id=N  (omit for own profile)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/../app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

$viewer   = Auth::require();
$db       = Database::getInstance();
$userRepo = new UserRepository($db);

$targetId = filter_var($_GET['user_id'] ?? $viewer->id, FILTER_VALIDATE_INT) ?: $viewer->id;
$isSelf   = ($targetId === $viewer->id);

$target = $userRepo->findById($targetId);
if (!$target || !$target->isActive) {
    http_response_code(404);
    $pageTitle = 'User Not Found';
    $basePath  = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/\\') . '/';
    require __DIR__ . '/../layout/header.php';
    echo '<div class="page-body" style="text-align:center;color:var(--text-300)">User not found.</div>';
    require __DIR__ . '/../layout/footer.php';
    exit;
}

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

$pageTitle    = $isSelf ? 'My Public Profile' : $target->name . "'s Profile";
$basePath     = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/\\') . '/';
$inlineScript = 'window.APP_PAGE="view_profile";window.VIEW_PROFILE_BOOT=' . json_encode([
    'target' => [
        'id'     => $target->id,
        'name'   => $target->name,
        'email'  => $target->email,
        'role'   => $target->role,
        'avatar' => $target->avatar,
        'bio'    => $target->bio,
    ],
    'isSelf'          => $isSelf,
    'viewerIsCoach'   => $viewerIsCoach,
    'privacy'         => $privacy,
    'consecutiveDays' => $consecutiveDays,
    'activity'        => $activity,
]) . ';';

require __DIR__ . '/../layout/header.php';
?>
<app-root></app-root>
<?php require __DIR__ . '/../layout/footer.php'; ?>
