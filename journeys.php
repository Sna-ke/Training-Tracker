<?php
// ============================================================
//  journeys.php — Journey list & creation (thin controller)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Repositories\PlanRepository;

$db       = Database::getInstance();
$planRepo = new PlanRepository($db);

$plansData = [];
$templates = [];
$dbError   = null;

try {
    $plansData = $planRepo->findAllWithProgress($currentUser->id);
    $templates = $planRepo->findAllTemplates($currentUser->id);
} catch (\Exception $e) {
    $dbError = htmlspecialchars($e->getMessage());
}

$pageTitle    = 'My Journeys';
$inlineScript = 'window.APP_PAGE="journeys";window.JOURNEYS_BOOT = ' . json_encode([
    'plans'     => $plansData,
    'templates' => $templates,
    'isAdmin'   => $currentUser->isAdmin(),
]) . ';';
require __DIR__ . '/layout/header.php';
?>

<app-root></app-root>

<?php require __DIR__ . '/layout/footer.php'; ?>
