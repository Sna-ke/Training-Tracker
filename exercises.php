<?php
// ============================================================
//  exercises.php — Exercise catalog manager (thin controller)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Models\Exercise;
use App\Repositories\ExerciseRepository;

$db     = Database::getInstance();
$exRepo = new ExerciseRepository($db);

$exercises = [];
$dbError   = null;
try {
    $exercises = $exRepo->findAll(userId: $currentUser->id);
} catch (\Exception $e) {
    $dbError = htmlspecialchars($e->getMessage());
}

$pageTitle      = 'Exercises';
$inlineScript   = 'window.APP_PAGE="exercises";window.EXERCISES_BOOT = ' . json_encode([
    'exercises'  => array_map(fn($e) => $e->toArray(), $exercises),
    'cats' => Exercise::CATEGORIES,
    'isAdmin' => $currentUser->isAdmin(),
]) . ';';
require __DIR__ . '/layout/header.php';
?>

<?php if (!empty($dbError)): ?><div style="margin:1rem 1.5rem" class="dberr">⚠ <?= $dbError ?></div><?php endif; ?>
<app-root></app-root>

<?php require __DIR__ . '/layout/footer.php'; ?>
