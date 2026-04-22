<?php
// ============================================================
//  admin/users.php — User management (admin only)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/../app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

$currentUser = Auth::requireAdmin();

$db       = Database::getInstance();
$userRepo = new UserRepository($db);
$users    = $userRepo->findAll();

$pageTitle    = 'Admin · Users';
$inlineScript = 'window.APP_PAGE="admin";window.ADMIN_BOOT = ' . json_encode([
    'users'       => array_map(fn($u) => $u->toArray(), $users),
    'currentId'   => $currentUser->id,
    'adminCount'  => $userRepo->countAdmins(),
]) . ';';
// Assets are one level up from admin/
$basePath = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/\\') . '/';
require __DIR__ . '/../layout/header.php';
?>

<app-root></app-root>

<?php require __DIR__ . '/../layout/footer.php'; ?>
