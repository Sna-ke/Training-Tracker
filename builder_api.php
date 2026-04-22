<?php
// ============================================================
//  builder_api.php — AJAX endpoint for the plan builder.
//
//  This file ONLY:
//    1. Bootstraps the autoloader
//    2. Parses and validates raw input
//    3. Calls the appropriate Service or Repository method
//    4. Serialises the response
//
//  No SQL. No business logic. No HTML.
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Repositories\{ExerciseRepository, PlanRepository, PlanDayRepository, WorkoutRepository};
use App\Services\PlanBuilderService;

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

function ok(mixed $d = null): never { echo json_encode(['success' => true,  'data'  => $d]);      exit; }
function fail(string $m, int $c = 400): never { http_response_code($c); echo json_encode(['success' => false, 'error' => $m]); exit; }

// ── Wire up dependencies ──────────────────────────────────────
$db      = Database::getInstance();
$exRepo  = new ExerciseRepository($db);
$planRepo= new PlanRepository($db);
$dayRepo = new PlanDayRepository($db);
$wtRepo  = new WorkoutRepository($db);
$builder = new PlanBuilderService($planRepo, $dayRepo, $wtRepo, $exRepo, $db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET actions ───────────────────────────────────────────────
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    if ($action === 'exercises') {
        $exercises = $exRepo->findAll(
            category: $_GET['cat']  ?? null,
            search:   $_GET['q']    ?? null,
        );
        ok(array_map(fn($e) => $e->toArray(), $exercises));
    }

    if ($action === 'week_days') {
        $planId = filter_var($_GET['plan_id'] ?? null, FILTER_VALIDATE_INT);
        $week   = filter_var($_GET['week']    ?? null, FILTER_VALIDATE_INT);
        if (!$planId || $week === false) fail('Invalid params');

        $plan = $planRepo->findById((int)$planId);
        if (!$plan) fail('Plan not found', 404);

        $days = $dayRepo->findByWeek((int)$planId, (int)$week);

        $result = [];
        foreach ($days as $day) {
            $row = $day->toArray();
            $row['wt_color']  = $row['color'];  // alias — WeekEditor reads wt_color
            $row['exercises'] = $day->workoutTypeId
                ? $wtRepo->itemsForDay($day->workoutTypeId, $day->id)
                : [];
            $result[] = $row;
        }
        ok($result);
    }

    fail('Unknown action');
}

// ── POST actions ──────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) fail('Invalid JSON body');
    $action = $body['action'] ?? '';

    if ($action === 'create_plan') {
        try {
            $plan = $builder->createPlan(
                name:        trim($body['name']        ?? ''),
                startDate:   trim($body['start_date']  ?? ''),
                totalWeeks:  (int)($body['total_weeks']  ?? 0),
                userId:      $currentUser->id,
                description: trim($body['description'] ?? '') ?: null,
                athleteName: trim($body['athlete_name']?? '') ?: null,
            );
            ok(['plan_id' => $plan->id, 'template_id' => $plan->templateId]);
        } catch (\InvalidArgumentException $e) {
            fail($e->getMessage());
        }
    }

    if ($action === 'save_exercise') {
        try {
            $ex = $builder->createExercise(
                name:     trim($body['name']      ?? ''),
                category: trim($body['category']  ?? ''),
                unitType: trim($body['unit_type'] ?? ''),
            );
            ok($ex->toArray());
        } catch (\InvalidArgumentException $e) {
            fail($e->getMessage());
        }
    }

    if ($action === 'save_day') {
        $planId = filter_var($body['plan_id']     ?? null, FILTER_VALIDATE_INT);
        $week   = filter_var($body['week']        ?? null, FILTER_VALIDATE_INT);
        $dayIdx = filter_var($body['day_of_week'] ?? null, FILTER_VALIDATE_INT);
        if ($planId === false || $week === false || $dayIdx === false) fail('Missing required fields');

        try {
            $wtId = $builder->saveDay(
                planId:    (int)$planId,
                week:      (int)$week,
                dayOfWeek: (int)$dayIdx,
                isRest:    !empty($body['is_rest']),
                exercises: is_array($body['exercises'] ?? null) ? $body['exercises'] : [],
            );
            ok(['workout_type_id' => $wtId]);
        } catch (\InvalidArgumentException $e) {
            fail($e->getMessage());
        }
    }

    if ($action === 'copy_week') {
        $planId   = filter_var($body['plan_id']   ?? null, FILTER_VALIDATE_INT);
        $fromWeek = filter_var($body['from_week'] ?? null, FILTER_VALIDATE_INT);
        $toWeeks  = array_filter((array)($body['to_weeks'] ?? []), 'is_numeric');
        if ($planId === false || $fromWeek === false || empty($toWeeks)) fail('Missing params');

        try {
            $copied = $builder->copyWeek((int)$planId, (int)$fromWeek, array_map('intval', $toWeeks));
            ok(['copied_to' => $copied]);
        } catch (\InvalidArgumentException $e) {
            fail($e->getMessage());
        }
    }

    fail('Unknown action');
}

fail('Method not allowed', 405);
