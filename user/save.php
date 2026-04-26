<?php
// ============================================================
//  user/save.php — Profile API
//  Actions: update_profile, save_privacy, invite_coach,
//           remove_coach, change_password
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

$authUser = Auth::require();
$db       = Database::getInstance();
$userRepo = new UserRepository($db);

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';

// ── update_profile ────────────────────────────────────────────
if ($action === 'update_profile') {
    $name   = mb_substr(trim($body['name']   ?? ''), 0, 200);
    $email  = mb_strtolower(trim($body['email']  ?? ''));
    $avatar = trim($body['avatar'] ?? '') ?: null;
    $bio    = mb_substr(trim($body['bio']    ?? ''), 0, 500) ?: null;

    if (!$name)  fail('Name is required.');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Invalid email address.');
    if ($userRepo->emailExists($email, $authUser->id)) fail('That email is already in use.');

    $userRepo->updateFullProfile($authUser->id, $name, $email, $avatar, $bio);
    Auth::bustCache();
    ok();
}

// ── save_privacy ──────────────────────────────────────────────
if ($action === 'save_privacy') {
    $userRepo->savePrivacySettings(
        $authUser->id,
        !empty($body['share_journeys']),
        !empty($body['share_exercise_logs']),
        !empty($body['share_status']),
    );
    ok();
}

// ── invite_coach ──────────────────────────────────────────────
if ($action === 'invite_coach') {
    $coachId = filter_var($body['coach_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$coachId || $coachId === $authUser->id) fail('Invalid coach.');

    $coach = $userRepo->findById($coachId);
    if (!$coach || $coach->role !== 'coach') fail('User is not a coach.');

    $userRepo->inviteCoach($authUser->id, $coachId);

    ok([
        'coaches'           => $userRepo->getCoachesForAthlete($authUser->id),
        'available_coaches' => coachList($userRepo, $authUser->id),
    ]);
}

// ── remove_coach ──────────────────────────────────────────────
if ($action === 'remove_coach') {
    $coachId = filter_var($body['coach_id'] ?? null, FILTER_VALIDATE_INT);
    if (!$coachId) fail('Invalid coach_id.');

    $userRepo->removeCoach($authUser->id, $coachId);

    ok([
        'coaches'           => $userRepo->getCoachesForAthlete($authUser->id),
        'available_coaches' => coachList($userRepo, $authUser->id),
    ]);
}

// ── change_password ───────────────────────────────────────────
if ($action === 'change_password') {
    $current = $body['current_password'] ?? '';
    $newPw   = $body['new_password']     ?? '';

    $raw = $userRepo->findByEmail($authUser->email);
    if (!$current || !password_verify($current, $raw['password_hash'] ?? '')) {
        fail('Current password is incorrect.');
    }
    if (strlen($newPw) < 8) fail('New password must be at least 8 characters.');

    $userRepo->updatePassword($authUser->id, password_hash($newPw, PASSWORD_DEFAULT));
    ok();
}

fail('Unknown action');

// ── Helper ────────────────────────────────────────────────────
function coachList(UserRepository $repo, int $athleteId): array
{
    $invited = array_column($repo->getCoachesForAthlete($athleteId), 'coach_id');
    return array_values(array_filter(
        array_map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'email' => $c->email, 'avatar' => $c->avatar],
                  $repo->findCoaches()),
        fn($c) => !in_array($c['id'], $invited)
    ));
}
