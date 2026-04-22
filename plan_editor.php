<?php
// ============================================================
//  plan_editor.php — Plan template editor (thin controller)
//  PHP: load data, serialise to EDITOR_BOOT.
//  UI: public/js/pages/plan_editor/  (React)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Models\{Exercise, PlanDay};
use App\Repositories\{ExerciseRepository, PlanRepository};

$db       = Database::getInstance();
$planRepo = new PlanRepository($db);
$exRepo   = new ExerciseRepository($db);

$tplId = isset($_GET['template_id']) ? (int)$_GET['template_id'] : 0;
if (!$tplId) { header('Location: plans.php'); exit; }

$template = $planRepo->findTemplateById($tplId);
if (!$template) { header('Location: plans.php'); exit; }

$pageTitle    = 'Edit: ' . $template['name'];
$pageScript   = 'public/js/pages/plan_editor/main.js';
$inlineScript = 'window.EDITOR_BOOT = ' . json_encode([
    'templateId' => $tplId,
    'totalWeeks' => (int)$template['total_weeks'],
    'exercises'  => array_map(fn($e) => $e->toArray(), $exRepo->findAll(userId: $currentUser->id)),
    'cats'       => Exercise::CATEGORIES,
    'days'       => PlanDay::NAMES,
    'units'      => ['reps'=>'Reps','seconds'=>'Seconds','distance'=>'km','duration'=>'Minutes'],
]) . ';';
require __DIR__ . '/layout/header.php';
?>

<div class="app-hdr">
  <div class="app-hdr-inner wrap">
    <div>
      <div class="app-hdr-eye">Plan Editor</div>
      <div class="app-hdr-title"><?= htmlspecialchars($template['name']) ?></div>
      <div class="app-hdr-sub"><?= (int)$template['total_weeks'] ?> weeks · editing blueprint</div>
    </div>
    <a href="plans.php" class="btn btn-ghost">← Plans</a>
  </div>
</div>

<div id="app"></div>

<?php require __DIR__ . '/layout/footer.php'; ?>
