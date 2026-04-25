<?php
// ============================================================
//  index.php — Journey tracker
//
//  Controller: load data from repositories, prepare $bootData.
//  View: Angular tracker component
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

$phaseFor = function(int $w) use ($phases): array {
    foreach ($phases as $p) {
        if ($w >= $p['f'] && $w <= $p['t']) return $p;
    }
    return end($phases);
};

$weekColor = function(int $w) use ($phases): string {
    foreach ($phases as $p) {
        if ($w >= $p['f'] && $w <= $p['t']) return $p['col'];
    }
    return end($phases)['col'];
};

// ── 4. Build weekPips — per-week, per-day pip state ───────────
// Also fetch which plan days in the selected week have any log entries
// so we can surface the 'logged' (in-progress) state on load.

// Fetch plan day IDs for the selected week alongside their day_of_week
$selectedWeekDayIds = [];
foreach ($weekDays as $d) {
    if (!$d->isRest) {
        $selectedWeekDayIds[$d->dayOfWeek] = $d->id;
    }
}

// Single query: which plan_day_ids in the selected week have at least one log row?
$loggedDayIds = [];
if ($selectedWeekDayIds) {
    $ids      = implode(',', array_map('intval', array_values($selectedWeekDayIds)));
    $logRows  = $db->fetchAll(
        "SELECT DISTINCT plan_day_id FROM exercise_logs WHERE plan_day_id IN ($ids)"
    );
    foreach ($logRows as $row) {
        $loggedDayIds[(int)$row['plan_day_id']] = true;
    }
}

// Build weekPips: [weekNum][dayOfWeek] => 'done'|'skipped'|'logged'|'rest'|'pending'
// For all weeks: done/skipped come from completionMap (already loaded).
// For the selected week only: 'logged' is added from the log query above.
$weekPips = [];
for ($w = 1; $w <= $plan->totalWeeks; $w++) {
    $weekPips[$w] = [];
    for ($d = 0; $d <= 6; $d++) {
        $inf = $completionMap[$w][$d] ?? null;
        if ($inf === null) {
            // day_of_week not present = rest day for this week
            $weekPips[$w][$d] = 'rest';
        } elseif ($inf['done']) {
            $weekPips[$w][$d] = 'done';
        } elseif ($inf['skipped']) {
            $weekPips[$w][$d] = 'skipped';
        } elseif ($w === $selectedWeek && isset($selectedWeekDayIds[$d]) && isset($loggedDayIds[$selectedWeekDayIds[$d]])) {
            $weekPips[$w][$d] = 'logged';
        } else {
            $weekPips[$w][$d] = 'pending';
        }
    }
}

$currentPhase  = $phaseFor($selectedWeek);
$weekDone      = (int)(($weekGrid[$selectedWeek] ?? [])['done']  ?? 0);
$weekTotal     = (int)(($weekGrid[$selectedWeek] ?? [])['total'] ?? 6);
$weekPct       = $weekTotal > 0 ? round($weekDone / $weekTotal * 100) : 0;
$weekSpecial   = $specialWeeks[$selectedWeek] ?? null;
$firstDate     = $weekDays ? $weekDays[0]->scheduledDate->format('M j') : '';
$lastDate      = $weekDays ? end($weekDays)->scheduledDate->format('M j, Y') : '';

// ── 5. Serialise days for Angular boot data ───────────────────
$bootDays = array_map(fn(PlanDay $d) => [
    'id'              => $d->id,
    'day_of_week'     => $d->dayOfWeek,
    'day_name'        => $d->dayName(),
    'is_rest'         => $d->isRest,
    'skipped'         => $d->skipped,
    'completed'       => $d->completed,
    'has_log'         => isset($loggedDayIds[$d->id]),
    'scheduled_date'  => $d->scheduledDate->format('Y-m-d'),
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
    'weekPips'     => $weekPips,
];

// ── 6. Layout variables ───────────────────────────────────────
$pageTitle      = $plan->name;
$inlineScript   = 'window.APP_PAGE="tracker";window.TRACKER_BOOT = ' . json_encode($bootData) . ';';
require __DIR__ . '/layout/header.php';
?>

<app-root></app-root>

<?php require __DIR__ . '/layout/footer.php'; ?>
