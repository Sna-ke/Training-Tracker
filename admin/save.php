<?php
// ============================================================
//  admin/save.php — Admin-only API
//  All actions require admin role.
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/../app/autoload.php';

use App\Auth;
use App\Database;
use App\Repositories\UserRepository;

header('Content-Type: application/json');

function ok(mixed $data = null): never
{
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}
function fail(string $msg, int $code = 400): never
{
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $msg]);
    exit;
}

$currentUser = Auth::requireAdmin();

$db       = Database::getInstance();
$userRepo = new UserRepository($db);

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';

// ── POST actions ──────────────────────────────────────────────

if ($action === 'add_user') {
    $name     = mb_substr(trim($body['name']     ?? ''), 0, 200);
    $email    = mb_strtolower(trim($body['email'] ?? ''));
    $password = $body['password'] ?? '';
    $roleIn   = $body['role'] ?? 'athlete';
    $role     = in_array($roleIn, ['admin','athlete','user']) ? ($roleIn === 'athlete' ? 'athlete' : $roleIn) : 'athlete';

    if (!$name)                                       fail('Name required');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))   fail('Valid email required');
    if ($userRepo->emailExists($email))               fail('Email already registered');
    if (strlen($password) < 8)                        fail('Password must be at least 8 characters');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $user = $userRepo->create($name, $email, $hash, $role);
    ok($user->toArray());
}

if ($action === 'set_role') {
    $userId = filter_var($body['user_id'] ?? null, FILTER_VALIDATE_INT);
    $role   = in_array($body['role'] ?? '', ['admin','athlete','user']) ? $body['role'] : null;

    if (!$userId || !$role) fail('Invalid params');
    if ($userId === $currentUser->id) fail('Cannot change your own role');

    // Prevent removing the last admin
    if ($role === 'user' && $userRepo->countAdmins() <= 1) {
        $target = $userRepo->findById($userId);
        if ($target?->isAdmin()) fail('Cannot remove the last admin');
    }

    $userRepo->setRole($userId, $role);
    ok();
}

if ($action === 'set_active') {
    $userId   = filter_var($body['user_id'] ?? null, FILTER_VALIDATE_INT);
    $isActive = !empty($body['is_active']);

    if (!$userId) fail('Invalid user_id');
    if ($userId === $currentUser->id) fail('Cannot deactivate your own account');

    // Prevent deactivating last admin
    if (!$isActive) {
        $target = $userRepo->findById($userId);
        if ($target?->isAdmin() && $userRepo->countAdmins() <= 1) {
            fail('Cannot deactivate the last admin account');
        }
    }

    $userRepo->setActive($userId, $isActive);

    // Force-logout deactivated user
    if (!$isActive) {
        $userRepo->deleteAllSessions($userId);
    }

    ok();
}

if ($action === 'reset_password') {
    $userId   = filter_var($body['user_id'] ?? null, FILTER_VALIDATE_INT);
    $password = $body['password'] ?? '';

    if (!$userId)              fail('Invalid user_id');
    if (strlen($password) < 8) fail('Password must be at least 8 characters');

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $userRepo->updatePassword($userId, $hash);
    $userRepo->deleteAllSessions($userId);
    ok();
}

fail('Unknown action');
