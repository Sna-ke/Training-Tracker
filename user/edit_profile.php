<?php
// ============================================================
//  user/edit_profile.php — Edit Profile (Angular page)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/../app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

$authUser = Auth::require();
$db       = Database::getInstance();
$userRepo = new UserRepository($db);

$privacy          = $userRepo->getPrivacySettings($authUser->id);
$coaches          = $userRepo->getCoachesForAthlete($authUser->id);
$allCoaches       = $userRepo->findCoaches();
$invitedCoachIds  = array_column($coaches, 'coach_id');
$availableCoaches = array_values(array_filter(
    $allCoaches,
    fn($c) => !in_array($c->id, $invitedCoachIds)
));

$pageTitle = 'Edit Profile';
$basePath  = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/\\') . '/';

$inlineScript = 'window.APP_PAGE="edit_profile";window.EDIT_PROFILE_BOOT=' . json_encode([
    'user' => [
        'id'     => $authUser->id,
        'name'   => $authUser->name,
        'email'  => $authUser->email,
        'role'   => $authUser->role,
        'avatar' => $authUser->avatar,
        'bio'    => $authUser->bio,
    ],
    'privacy'          => $privacy,
    'coaches'          => $coaches,
    'availableCoaches' => array_map(fn($c) => [
        'id'     => $c->id,
        'name'   => $c->name,
        'email'  => $c->email,
        'avatar' => $c->avatar,
    ], $availableCoaches),
]) . ';';

require __DIR__ . '/../layout/header.php';
?>
<app-root></app-root>
<?php require __DIR__ . '/../layout/footer.php'; ?>
