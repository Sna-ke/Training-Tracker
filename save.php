<?php
// ============================================================
//  save.php — Tracking AJAX endpoint.
//
//  Responsibilities: parse input, call service/repo, return JSON.
//  No SQL. No business logic. No HTML.
// ============================================================
declare(strict_types=1);
require_once __DIR__ . '/app/autoload.php';
use App\Auth;
$currentUser = Auth::require();


use App\Database;
use App\Models\{Exercise, PlanDay};
use App\Repositories\{ExerciseRepository, PlanRepository, PlanDayRepository, WorkoutRepository};
use App\Services\PlanScheduleService;

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

function ok(mixed $d = null): never { echo json_encode(['success' => true,  'data'  => $d]);      exit; }
function fail(string $m, int $c = 400): never { http_response_code($c); echo json_encode(['success' => false, 'error' => $m]); exit; }

// ── Wire up dependencies ──────────────────────────────────────
$db          = Database::getInstance();
$exRepo      = new ExerciseRepository($db);
$planRepo    = new PlanRepository($db);
$dayRepo     = new PlanDayRepository($db);
$wtRepo      = new WorkoutRepository($db);
$schedSvc    = new PlanScheduleService($dayRepo, $db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ── GET ───────────────────────────────────────────────────────
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    // Load all items + existing logs for one plan day
    if ($action === 'get_day') {
        $pdId = filter_var($_GET['plan_day_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$pdId) fail('Invalid plan_day_id');

        $day = $dayRepo->findById((int)$pdId);
        if (!$day) fail('Plan day not found', 404);

        // Load override values from the template day
        $ptd = $db->fetchOne(
            'SELECT override_sets, override_distance_km, override_duration_min, override_notes
             FROM plan_template_days WHERE id = ?',
            [$day->templateDayId]
        );

        // Load workout items WITHOUT a log join — just the planned structure
        $items = [];
        if ($day->workoutTypeId) {
            $items = $db->fetchAll('
                SELECT wi.id AS item_id, wi.item_role, wi.planned_sets, wi.planned_reps,
                       wi.planned_weight_kg, wi.planned_distance_km, wi.planned_duration_min,
                       wi.item_note, wi.sort_order,
                       e.id AS exercise_id, e.slug AS exercise_slug,
                       e.name AS exercise_name, e.category, e.unit_type
                FROM workout_items wi
                LEFT JOIN exercises e ON wi.exercise_id = e.id
                WHERE wi.workout_type_id = ?
                ORDER BY wi.sort_order
            ', [$day->workoutTypeId]);
        }

        // Load saved log entries for this plan day in a separate, explicit query
        $logRows = $db->fetchAll('
            SELECT workout_item_id,
                   sets_done, reps_done, weight_kg,
                   distance_km, duration_min, pace_per_km,
                   heart_rate_avg, notes
            FROM exercise_logs
            WHERE plan_day_id = ?
        ', [(int)$pdId]);

        // Index logs by workout_item_id for O(1) merge
        $logByItemId = [];
        foreach ($logRows as $log) {
            $logByItemId[(int)$log['workout_item_id']] = $log;
        }

        // Merge log data into each item
        foreach ($items as &$it) {
            $itemId = (int)$it['item_id'];
            $log    = $logByItemId[$itemId] ?? null;
            $it['sets_done']      = $log['sets_done']      ?? null;
            $it['reps_done']      = $log['reps_done']      ?? null;
            $it['log_weight']     = $log['weight_kg']      ?? null;
            $it['distance_km']    = $log['distance_km']    ?? null;
            $it['duration_min']   = $log['duration_min']   ?? null;
            $it['pace_per_km']    = $log['pace_per_km']    ?? null;
            $it['heart_rate_avg'] = $log['heart_rate_avg'] ?? null;
            $it['log_notes']      = $log['notes']          ?? null;
        }
        unset($it);

        // Apply template-day overrides to the first main item
        $mainApplied = false;
        foreach ($items as &$it) {
            if (!$mainApplied && $it['item_role'] === 'main' && $it['exercise_id']) {
                if ($ptd['override_sets']         !== null) $it['planned_sets']         = $ptd['override_sets'];
                if ($ptd['override_distance_km']  !== null) $it['planned_distance_km']  = $ptd['override_distance_km'];
                if ($ptd['override_duration_min'] !== null) $it['planned_duration_min'] = $ptd['override_duration_min'];
                $mainApplied = true;
            }
        }
        unset($it);

        // Append override_notes as a display-only instruction item
        if (!empty($ptd['override_notes'])) {
            $items[] = [
                'item_id' => null, 'item_role' => 'instruction',
                'exercise_id' => null, 'item_note' => $ptd['override_notes'],
                'sort_order' => 99,
            ];
        }

        ok(['plan_day' => $day->toArray(), 'items' => $items]);
    }

    // Exercise progression history
    if ($action === 'exercise_history') {
        $exId   = filter_var($_GET['exercise_id'] ?? null, FILTER_VALIDATE_INT);
        $planId = filter_var($_GET['plan_id']     ?? null, FILTER_VALIDATE_INT);
        if (!$exId || !$planId) fail('Invalid params');

        $ex      = $exRepo->findById((int)$exId);
        if (!$ex) fail('Exercise not found', 404);

        $history = $dayRepo->exerciseHistory((int)$exId, (int)$planId);
        ok(['exercise' => $ex->toArray(), 'history' => $history]);
    }

    // Media links for an exercise
    if ($action === 'exercise_media') {
        $exId = filter_var($_GET['exercise_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$exId) fail('Invalid exercise_id');

        $ex    = $exRepo->findById((int)$exId);
        if (!$ex) fail('Exercise not found', 404);

        $media = $exRepo->findMedia((int)$exId);
        ok(['exercise' => $ex->toArray(), 'media' => $media]);
    }


    // Exercise catalog list (with optional search + category)
    if ($action === 'exercises_list') {
        $exercises = $exRepo->findAll(
            category: $_GET['cat'] ?? null,
            search:   $_GET['q']  ?? null,
            userId:   $currentUser->id,
        );
        ok(array_map(fn($e) => $e->toArray(), $exercises));
    }

    // Single exercise with all media
    if ($action === 'exercise_detail') {
        $exId = filter_var($_GET['exercise_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$exId) fail('Invalid exercise_id');
        $ex    = $exRepo->findById((int)$exId);
        if (!$ex) fail('Exercise not found', 404);
        $media = $exRepo->findMedia((int)$exId);
        ok(['exercise' => $ex->toArray(), 'media' => $media]);
    }

    // Template plan days for the plan editor
    if ($action === 'template_week') {
        $tplId = filter_var($_GET['template_id'] ?? null, FILTER_VALIDATE_INT);
        $week  = filter_var($_GET['week']        ?? null, FILTER_VALIDATE_INT);
        if (!$tplId || $week === false) fail('Invalid params');
        $days = $db->fetchAll('
            SELECT ptd.id AS ptd_id, ptd.day_of_week, ptd.is_rest,
                   ptd.workout_type_id, ptd.override_sets,
                   ptd.override_distance_km, ptd.override_duration_min, ptd.override_notes,
                   wt.name AS wt_name, wt.color AS wt_color, wt.type_code
            FROM plan_template_days ptd
            LEFT JOIN workout_types wt ON ptd.workout_type_id = wt.id
            WHERE ptd.plan_template_id=? AND ptd.week_number=?
            ORDER BY ptd.day_of_week
        ', [$tplId, $week]);
        $result = [];
        foreach ($days as $d) {
            $exercises = [];
            if ($d['workout_type_id']) {
                $exercises = $wtRepo->itemsForDay($d['workout_type_id'], 0);
            }
            $result[] = array_merge($d, ['exercises' => $exercises]);
        }
        ok($result);
    }

    fail('Unknown action');
}

// ── POST ──────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) fail('Invalid JSON body');
    $action = $body['action'] ?? '';

    // Journey = execution of a Plan template (alias accepted for UI clarity)
    if ($action === 'create_journey') $action = 'create_plan';
    if ($action === 'delete_journey') $action = 'delete_plan';


    // Add a new exercise to the catalog (also used by plan_editor.php + exercises.php)
    if ($action === 'save_exercise') {
        $name     = mb_substr(trim($body['name']      ?? ''), 0, 200);
        $desc     = mb_substr(trim($body['description']?? ''), 0, 2000) ?: null;
        $category = trim($body['category']  ?? '');
        $unit     = trim($body['unit_type'] ?? '');
        if (!$name)                                              fail('Name required');
        if (!Exercise::validateCategory($category)) fail('Invalid category');
        if (!Exercise::validateUnitType($unit))     fail('Invalid unit_type');
        $isAdmin = $currentUser->isAdmin();
        $ex = $exRepo->create($name, $category, $unit, $isAdmin ? null : $currentUser->id);
        // If description provided, update it immediately
        if ($desc !== null) {
            $db->execute('UPDATE exercises SET description=? WHERE id=?', [$desc, $ex->id]);
        }
        ok(array_merge($ex->toArray(), ['description' => $desc]));
    }

    // Mark a day complete / incomplete
    if ($action === 'complete') {
        $pdId = filter_var($body['plan_day_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$pdId) fail('Invalid plan_day_id');

        $schedSvc->completeDay(
            planDayId: (int)$pdId,
            complete:  !empty($body['completed']),
            notes:     mb_substr(trim($body['notes'] ?? ''), 0, 2000) ?: null,
        );
        ok(['completed' => !empty($body['completed'])]);
    }

    // Skip a day
    if ($action === 'skip') {
        $pdId = filter_var($body['plan_day_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$pdId) fail('Invalid plan_day_id');
        try {
            $schedSvc->skipDay((int)$pdId);
            ok();
        } catch (\InvalidArgumentException $e) {
            fail($e->getMessage(), 404);
        }
    }

    // Unskip a day
    if ($action === 'unskip') {
        $pdId = filter_var($body['plan_day_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$pdId) fail('Invalid plan_day_id');
        try {
            $schedSvc->unskipDay((int)$pdId);
            ok();
        } catch (\InvalidArgumentException $e) {
            fail($e->getMessage(), 404);
        }
    }

    // Save an exercise log entry
    if ($action === 'log') {
        $pdId  = filter_var($body['plan_day_id']     ?? null, FILTER_VALIDATE_INT);
        $wiId  = filter_var($body['workout_item_id'] ?? null, FILTER_VALIDATE_INT);
        $exId  = filter_var($body['exercise_id']     ?? null, FILTER_VALIDATE_INT);
        if (!$pdId || !$wiId || !$exId) fail('Missing required IDs');

        $toFloat = fn($v) => ($v !== null && $v !== '') ? (float)$v : null;
        $toInt   = fn($v) => ($v !== null && $v !== '') ? (int)$v   : null;

        $dayRepo->upsertLog(
            planDayId:    (int)$pdId,
            workoutItemId:(int)$wiId,
            exerciseId:   (int)$exId,
            sets:         $toInt($body['sets']     ?? null),
            reps:         $toInt($body['reps']     ?? null),
            weightKg:     $toFloat($body['weight'] ?? null),
            distanceKm:   $toFloat($body['distance']??null),
            durationMin:  $toFloat($body['duration']??null),
            pacePerKm:    $toFloat($body['pace']   ?? null),
            heartRate:    $toInt($body['hr']        ?? null),
            notes:        mb_substr(trim($body['notes'] ?? ''), 0, 500) ?: null,
        );
        ok();
    }

    // Create a plan from a template (used by plans.php)
    if ($action === 'create_plan') {
        $tplId  = filter_var($body['template_id'] ?? null, FILTER_VALIDATE_INT);
        $name   = mb_substr(trim($body['name']   ?? ''), 0, 200);
        $start  = trim($body['start_date'] ?? '');

        if (!$tplId || !$name || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $start))
            fail('template_id, name, and start_date (YYYY-MM-DD) are required');

        $tpl = $planRepo->findTemplateById((int)$tplId);
        if (!$tpl) fail('Template not found', 404);

        // Delegate to PlanRepository which handles the full transactional create
        $plan = $planRepo->createFromTemplate(
            templateId:  (int)$tplId,
            totalWeeks:  (int)$tpl['total_weeks'],
            name:        $name,
            startDate:   $start,
            userId:      $currentUser->id,
            athleteName: mb_substr(trim($body['athlete_name'] ?? ''), 0, 100) ?: null,
            notes:       mb_substr(trim($body['notes'] ?? ''), 0, 2000) ?: null,
        );
        ok(['plan_id' => $plan->id]);
    }

    // Delete a plan
    if ($action === 'delete_plan') {
        $planId = filter_var($body['plan_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$planId) fail('Invalid plan_id');
        $planRepo->delete((int)$planId);
        ok();
    }


    // Update exercise details (name, description, category, unit_type)
    if ($action === 'create_exercise') {
        $name  = mb_substr(trim($body['name']        ?? ''), 0, 200);
        $desc  = mb_substr(trim($body['description'] ?? ''), 0, 2000) ?: null;
        $cat   = $body['category']  ?? '';
        $unit  = $body['unit_type'] ?? 'reps';
        if (!$name) fail('Name required');
        if (!Exercise::validateCategory($cat))  fail('Invalid category');
        if (!Exercise::validateUnitType($unit)) fail('Invalid unit_type');
        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '_', $name));
        $slug = trim($slug, '_') ?: 'exercise';
        // Make slug unique
        $existing = $db->fetchScalar('SELECT COUNT(*) FROM exercises WHERE slug = ?', [$slug]);
        if ($existing) $slug .= '_' . time();
        $id = $db->insert(
            'INSERT INTO exercises (slug, name, description, category, unit_type) VALUES (?, ?, ?, ?, ?)',
            [$slug, $name, $desc, $cat, $unit]
        );
        $ex = $exRepo->findById((int)$id);
        ok($ex->toArray());
    }

    if ($action === 'update_exercise') {
        $exId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$exId) fail('Invalid id');
        $name  = mb_substr(trim($body['name']        ?? ''), 0, 200);
        $desc  = mb_substr(trim($body['description'] ?? ''), 0, 2000) ?: null;
        $cat   = $body['category']  ?? '';
        $unit  = $body['unit_type'] ?? 'reps';
        if (!$name) fail('Name required');
        if (!Exercise::validateCategory($cat))  fail('Invalid category');
        if (!Exercise::validateUnitType($unit)) fail('Invalid unit_type');
        $db->execute(
            'UPDATE exercises SET name=?, description=?, category=?, unit_type=? WHERE id=?',
            [$name, $desc, $cat, $unit, (int)$exId]
        );
        $ex = $exRepo->findById((int)$exId);
        ok($ex->toArray());
    }

    // Add a media link to an exercise
    if ($action === 'add_media') {
        $exId  = filter_var($body['exercise_id'] ?? null, FILTER_VALIDATE_INT);
        $url   = mb_substr(trim($body['url']     ?? ''), 0, 1000);
        $label = mb_substr(trim($body['label']   ?? ''), 0, 200);
        $type  = $body['type']   ?? 'video';
        $source= $body['source'] ?? 'web';
        if (!$exId || !$url) fail('exercise_id and url required');
        $maxOrd = $db->fetchScalar('SELECT COALESCE(MAX(sort_order)+1,0) FROM exercise_media WHERE exercise_id=?', [$exId]);
        $id = $db->insert(
            'INSERT INTO exercise_media (exercise_id,media_type,source,url,label,sort_order) VALUES (?,?,?,?,?,?)',
            [$exId, $type, $source, $url, $label ?: $url, (int)$maxOrd]
        );
        ok(['id' => $id, 'exercise_id' => $exId, 'media_type' => $type,
            'source' => $source, 'url' => $url, 'label' => $label ?: $url, 'sort_order' => (int)$maxOrd]);
    }

    // Update an existing media link
    if ($action === 'update_media') {
        $id    = filter_var($body['id']  ?? null, FILTER_VALIDATE_INT);
        $url   = mb_substr(trim($body['url']   ?? ''), 0, 1000);
        $label = mb_substr(trim($body['label'] ?? ''), 0, 200);
        $type  = $body['type']   ?? 'video';
        $source= $body['source'] ?? 'web';
        if (!$id || !$url) fail('id and url required');
        $db->execute(
            'UPDATE exercise_media SET media_type=?,source=?,url=?,label=? WHERE id=?',
            [$type, $source, $url, $label ?: $url, $id]
        );
        ok();
    }

    // Delete a media link
    if ($action === 'delete_media') {
        $id = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$id) fail('Invalid id');
        $db->execute('DELETE FROM exercise_media WHERE id=?', [$id]);
        ok();
    }

    // Save a template day from the plan editor (updates template + propagates to journeys)
    if ($action === 'save_template_day') {
        $tplId  = filter_var($body['template_id'] ?? null, FILTER_VALIDATE_INT);
        $week   = filter_var($body['week']        ?? null, FILTER_VALIDATE_INT);
        $dayIdx = filter_var($body['day_of_week'] ?? null, FILTER_VALIDATE_INT);
        $isRest = !empty($body['is_rest']);
        $exercises = is_array($body['exercises'] ?? null) ? $body['exercises'] : [];
        if (!$tplId || $week === false || $dayIdx === false) fail('Missing required fields');

        $toFloat = fn($v) => ($v !== null && $v !== '') ? (float)$v : null;
        $toInt   = fn($v) => ($v !== null && $v !== '') ? (int)$v   : null;

        try {
            $effectiveWtId = null;
            if (!$isRest && !empty($exercises)) {
                $slug  = "tpl_{$tplId}_w{$week}_d{$dayIdx}";
                $names = PlanDay::NAMES;
                $name  = "Wk{$week} " . ($names[$dayIdx] ?? "Day$dayIdx");
                // Determine color from exercises
                $ids = array_filter(array_map(fn($e) => (int)($e['id'] ?? 0), $exercises));
                $color = '#64748b';
                if ($ids) {
                    $ph   = implode(',', array_fill(0, count($ids), '?'));
                    $cats = array_column($db->fetchAll("SELECT DISTINCT category FROM exercises WHERE id IN ($ph)", array_values($ids)), 'category');
                    $pri  = ['run'=>'#38bdf8','strength'=>'#f97316','cardio'=>'#4ade80','stretching'=>'#a78bfa','yoga'=>'#f472b6','mobility'=>'#94a3b8'];
                    foreach ($pri as $cat => $col) { if (in_array($cat,$cats,true)){$color=$col;break;} }
                }
                $effectiveWtId = $wtRepo->upsertType($slug, $name, 'custom', $color);
                $items = [];
                foreach ($exercises as $ord => $ex) {
                    $exId = (int)($ex['id'] ?? 0);
                    if (!$exId) continue;
                    $items[] = ['exercise_id'=>$exId,'role'=>'main',
                        'sets'=>$toInt($ex['sets']??null),'reps'=>$toInt($ex['reps']??null),
                        'weight_kg'=>$toFloat($ex['weight_kg']??null),
                        'distance_km'=>$toFloat($ex['distance']??null),
                        'duration_min'=>$toFloat($ex['duration_min']??null),
                        'note'=>mb_substr(trim($ex['note']??''),0,300)];
                }
                $wtRepo->replaceItems($effectiveWtId, $items);
            }
            // Update template day
            $db->execute('UPDATE plan_template_days SET workout_type_id=?,is_rest=? WHERE plan_template_id=? AND week_number=? AND day_of_week=?',
                [$effectiveWtId,(int)$isRest,$tplId,$week,$dayIdx]);
            // Propagate to all uncompleted journey days linked to this template
            $db->execute('UPDATE plan_days pd
                JOIN plan_template_days ptd ON pd.plan_template_day_id=ptd.id
                SET pd.workout_type_id=?,pd.is_rest=?
                WHERE ptd.plan_template_id=? AND pd.week_number=? AND pd.day_of_week=?
                  AND pd.completed=0',
                [$effectiveWtId,(int)$isRest,$tplId,$week,$dayIdx]);
            ok(['workout_type_id' => $effectiveWtId]);
        } catch (\Exception $e) {
            fail('DB error: '.$e->getMessage(), 500);
        }
    }


    // Toggle plan template published state (owner or admin)
    if ($action === 'publish_plan') {
        $tplId     = filter_var($body['template_id'] ?? null, FILTER_VALIDATE_INT);
        $published = !empty($body['is_published']);
        if (!$tplId) fail('Invalid template_id');
        $tpl = $planRepo->findTemplateById($tplId);
        if (!$tpl) fail('Template not found', 404);
        // Only owner or admin may toggle
        $ownedByUser = ($tpl['created_by'] ?? null) === $currentUser->id;
        if (!$currentUser->isAdmin() && !$ownedByUser) fail('Forbidden', 403);
        // Global (created_by=null) plans can only be toggled by admin
        if ($tpl['created_by'] === null && !$currentUser->isAdmin()) fail('Forbidden', 403);
        $planRepo->setPublished($tplId, $published);
        ok(['is_published' => $published]);
    }

    fail('Unknown action');
}

fail('Method not allowed', 405);
