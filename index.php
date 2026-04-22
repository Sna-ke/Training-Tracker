<?php
// ============================================================
//  index.php — Journey tracker
//
//  Controller: load data from repositories, prepare $bootData.
//  View: public/js/pages/tracker/ React components
//  ViewModel: TrackerApp.js + DayCard.js (state + event handling)
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Models\{Exercise, PlanDay};
use App\Repositories\{PlanRepository, PlanDayRepository};

// ── 1. Route guard ────────────────────────────────────────────
$planId = isset($_GET['plan_id']) ? (int)$_GET['plan_id'] : 0;
if (!$planId) { header('Location: journeys.php'); exit; }

// ── 2. Load data via repositories ─────────────────────────────
$db       = Database::getInstance();
$planRepo = new PlanRepository($db);
$dayRepo  = new PlanDayRepository($db);

$plan = $planRepo->findById($planId);
if (!$plan) { header('Location: journeys.php'); exit; }

$currentWeek  = $planRepo->currentActiveWeek($planId);
$selectedWeek = isset($_GET['week'])
    ? max(1, min($plan->totalWeeks, (int)$_GET['week']))
    : $currentWeek;

$weekGrid      = $planRepo->weekGrid($planId);
$completionMap = $dayRepo->completionGrid($planId);
$weekDays      = $dayRepo->findByWeek($planId, $selectedWeek);

// ── 3. Compute all view-data in the controller ─────────────────
// Phase definitions — could be stored per-plan, hard-coded here for this plan type
$phases = [
    ['f'=>1,  't'=>8,  'name'=>'Sharpening Base',    'col'=>'#38bdf8', 'sh'=>'Base'],
    ['f'=>9,  't'=>22, 'name'=>'Lactate Development', 'col'=>'#4ade80', 'sh'=>'Lactate'],
    ['f'=>23, 't'=>36, 'name'=>'VO₂max & Speed',      'col'=>'#facc15', 'sh'=>'Speed'],
    ['f'=>37, 't'=>999,'name'=>'Race Sharpening',      'col'=>'#f97316', 'sh'=>'Race'],
];
$specialWeeks = [
    8 =>['label'=>'⏱ Time Trial',    'color'=>'#a78bfa'],
    22=>['label'=>'⏱ Time Trial',    'color'=>'#a78bfa'],
    31=>['label'=>'🏁 Tune-Up Race', 'color'=>'#fb7185'],
    43=>['label'=>'🏁 Dress Run',    'color'=>'#fb7185'],
    47=>['label'=>'📉 Taper',        'color'=>'#94a3b8'],
    49=>['label'=>'🏆 Race Day',     'color'=>'#fbbf24'],
];

// Helper: return phase data for a week number
$phaseFor = function(int $w) use ($phases): array {
    foreach ($phases as $p) {
        if ($w >= $p['f'] && $w <= $p['t']) return $p;
    }
    return end($phases);
};

// Helper: phase color for the week-grid button
$weekColor = function(int $w) use ($phases): string {
    foreach ($phases as $p) {
        if ($w >= $p['f'] && $w <= $p['t']) return $p['col'];
    }
    return end($phases)['col'];
};

// Helper: completion pip HTML for one week
$weekPips = function(int $wk) use ($completionMap): string {
    $html = '';
    for ($d = 0; $d <= 5; $d++) {
        $inf  = $completionMap[$wk][$d] ?? null;
        $cls  = $inf ? ($inf['done'] ? ' done' : ($inf['skipped'] ? ' skip' : '')) : '';
        $html .= "<span class=\"pip{$cls}\"></span>";
    }
    return $html;
};

$currentPhase  = $phaseFor($selectedWeek);
$weekDone      = (int)(($weekGrid[$selectedWeek] ?? [])['done']  ?? 0);
$weekTotal     = (int)(($weekGrid[$selectedWeek] ?? [])['total'] ?? 6);
$weekPct       = $weekTotal > 0 ? round($weekDone / $weekTotal * 100) : 0;
$weekSpecial   = $specialWeeks[$selectedWeek] ?? null;
$firstDate     = $weekDays ? $weekDays[0]->scheduledDate->format('M j') : '';
$lastDate      = $weekDays ? end($weekDays)->scheduledDate->format('M j, Y') : '';

// ── 4. Serialise days for React boot data ────────────────────────
// Each day carries enough data for the DayCard component to render
// and interact without additional PHP.
$bootDays = array_map(fn(PlanDay $d) => [
    'id'              => $d->id,
    'day_of_week'     => $d->dayOfWeek,
    'day_name'        => $d->dayName(),
    'is_rest'         => $d->isRest,
    'skipped'         => $d->skipped,
    'completed'       => $d->completed,
    'scheduled_date'  => $d->scheduledDate->format('M j'),
    'workout_type_id' => $d->workoutTypeId,
    'wt_name'         => $d->workoutTypeName,
    'type_code'       => $d->workoutTypeCode,
    'color'           => $d->displayColor(),
    'is_race'         => $d->workoutTypeCode === 'race_event',
], $weekDays);

$bootData = [
    'planId'       => $planId,
    'selectedWeek' => $selectedWeek,
    'currentWeek'  => $currentWeek,
    'totalWeeks'   => $plan->totalWeeks,
    'phase'        => $currentPhase,
    'catColors'    => array_map(fn($c) => $c['color'], Exercise::CATEGORIES),
    'days'         => $bootDays,
];

// ── 5. Layout variables ────────────────────────────────────────
$pageTitle      = $plan->name;
$inlineScript   = 'window.APP_PAGE="tracker";window.TRACKER_BOOT = ' . json_encode($bootData) . ';';
require __DIR__ . '/layout/header.php';
?>

<app-root></app-root>

<?php require __DIR__ . '/layout/footer.php'; ?>
