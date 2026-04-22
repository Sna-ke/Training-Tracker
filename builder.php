<?php
// ============================================================
//  builder.php — Plan Builder (thin controller)
//  PHP: load data, serialise to BUILDER_BOOT.
//  UI: public/js/pages/builder/  (React)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Models\{Exercise, PlanDay};
use App\Repositories\{ExerciseRepository, PlanRepository};

$db       = Database::getInstance();
$exRepo   = new ExerciseRepository($db);
$planRepo = new PlanRepository($db);

$planId = isset($_GET['plan_id']) ? (int)$_GET['plan_id'] : 0;
$plan   = $planId ? $planRepo->findById($planId) : null;
if ($planId && !$plan) { header('Location: plans.php'); exit; }

$pageTitle      = $plan ? 'Build: ' . $plan->name : 'New Training Plan';
$inlineScript   = 'window.APP_PAGE="builder";window.BUILDER_BOOT = ' . json_encode([
    'planId'     => $plan?->id ?? 0,
    'totalWeeks' => $plan?->totalWeeks ?? 0,
    'exercises'  => array_map(fn($e) => $e->toArray(), $exRepo->findAll(userId: $currentUser->id)),
    'cats'       => Exercise::CATEGORIES,
    'days'       => PlanDay::NAMES,
    'units'      => ['reps'=>'Reps','seconds'=>'Seconds','distance'=>'km','duration'=>'Minutes'],
]) . ';';
require __DIR__ . '/layout/header.php';
?>

<app-root></app-root>

<?php require __DIR__ . '/layout/footer.php'; ?>
