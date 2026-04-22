<?php
namespace App\Services;

use App\Database;
use App\Models\{Plan, PlanDay};
use App\Repositories\{ExerciseRepository, PlanRepository, PlanDayRepository, WorkoutRepository};

// ============================================================
//  PlanBuilderService
//  Handles creating and editing custom training plans
//  via the builder UI. Orchestrates the repositories —
//  no SQL here, no HTTP concerns.
// ============================================================
final class PlanBuilderService
{
    public function __construct(
        private readonly PlanRepository     $planRepo,
        private readonly PlanDayRepository  $dayRepo,
        private readonly WorkoutRepository  $workoutRepo,
        private readonly ExerciseRepository $exRepo,
        private readonly Database           $db,
    ) {}

    // ── Plan creation ──────────────────────────────────────────

    public function createPlan(
        string  $name,
        string  $startDate,
        int     $totalWeeks,
        int     $userId,
        ?string $description = null,
        ?string $athleteName = null,
    ): Plan {
        if (empty(trim($name)))                   throw new \InvalidArgumentException('Name is required');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) throw new \InvalidArgumentException('Invalid start date');
        if ($totalWeeks < 1 || $totalWeeks > 104) throw new \InvalidArgumentException('Weeks must be 1–104');

        return $this->planRepo->create($name, $startDate, $totalWeeks, $userId, $description, $athleteName);
    }

    // ── Day editor ─────────────────────────────────────────────

    /**
     * Save the exercise list for one day in the builder.
     * Creates or updates a 'custom' workout_type for the slot,
     * replaces its items, then syncs template + plan days.
     */
    public function saveDay(
        int   $planId,
        int   $week,
        int   $dayOfWeek,
        bool  $isRest,
        array $exercises, // [{id, sets, reps, duration_min, weight_kg, note}]
    ): ?int {
        $plan = $this->planRepo->findById($planId);
        if (!$plan) throw new \InvalidArgumentException("Plan $planId not found");

        $effectiveWtId = null;

        if (!$isRest && !empty($exercises)) {
            $slug  = "b_{$plan->templateId}_w{$week}_d{$dayOfWeek}";
            $name  = "Wk{$week} " . (PlanDay::NAMES[$dayOfWeek] ?? "Day$dayOfWeek");
            $color = $this->colorForExercises($exercises);

            $wtId = $this->workoutRepo->upsertType($slug, $name, 'custom', $color);

            // Map exercise IDs to full models so we can build item rows
            $items = [];
            foreach ($exercises as $ord => $ex) {
                $exId = (int)($ex['id'] ?? 0);
                if (!$exId) continue;
                $model = $this->exRepo->findById($exId);
                if (!$model) continue;

                $items[] = [
                    'exercise_id'  => $exId,
                    'role'         => 'main',
                    'sets'         => isset($ex['sets'])         ? (int)$ex['sets']         : null,
                    'reps'         => isset($ex['reps'])         ? (int)$ex['reps']         : null,
                    'weight_kg'    => isset($ex['weight_kg'])    ? (float)$ex['weight_kg']  : null,
                    'distance_km'  => isset($ex['distance'])     ? (float)$ex['distance']   : null,
                    'duration_min' => isset($ex['duration_min']) ? (float)$ex['duration_min']:null,
                    'note'         => $ex['note'] ?? null,
                ];
            }

            $this->workoutRepo->replaceItems($wtId, $items);
            $effectiveWtId = $wtId;
        }

        $this->planRepo->updateTemplateDay(
            templateId:     $plan->templateId,
            weekNum:        $week,
            dayOfWeek:      $dayOfWeek,
            workoutTypeId:  $effectiveWtId,
            isRest:         (int)$isRest,
            planId:         $planId,
        );

        return $effectiveWtId;
    }

    // ── Week copy ──────────────────────────────────────────────

    /**
     * Copy all day definitions from one week to one or more target weeks.
     * Creates fresh workout_type + items for each target, so they can be
     * independently edited later without affecting the source.
     */
    public function copyWeek(int $planId, int $fromWeek, array $toWeeks): int
    {
        $plan = $this->planRepo->findById($planId);
        if (!$plan) throw new \InvalidArgumentException("Plan $planId not found");

        $sourceDays = $this->db->fetchAll('
            SELECT ptd.day_of_week, ptd.is_rest, ptd.workout_type_id
            FROM plan_template_days ptd
            WHERE ptd.plan_template_id = ? AND ptd.week_number = ?
            ORDER BY ptd.day_of_week
        ', [$plan->templateId, $fromWeek]);

        $copied = 0;
        $this->db->transaction(function () use ($plan, $sourceDays, $toWeeks, $planId, &$copied) {
            $dayNames = PlanDay::NAMES;

            foreach ($toWeeks as $toWeek) {
                $toWeek = (int)$toWeek;
                if ($toWeek < 1) continue;

                foreach ($sourceDays as $sd) {
                    $di      = (int)$sd['day_of_week'];
                    $isRest  = (int)$sd['is_rest'];
                    $srcWtId = $sd['workout_type_id'] ? (int)$sd['workout_type_id'] : null;
                    $newWtId = null;

                    if ($srcWtId && !$isRest) {
                        $srcWt  = $this->db->fetchOne(
                            'SELECT color FROM workout_types WHERE id = ?', [$srcWtId]
                        );
                        $color  = $srcWt['color'] ?? '#64748b';
                        $slug   = "b_{$plan->templateId}_w{$toWeek}_d{$di}";
                        $name   = "Wk{$toWeek} " . ($dayNames[$di] ?? "Day$di");
                        $newWtId = $this->workoutRepo->upsertType($slug, $name, 'custom', $color);
                        $this->workoutRepo->copyItems($srcWtId, $newWtId);
                    }

                    $this->planRepo->updateTemplateDay(
                        templateId:    $plan->templateId,
                        weekNum:       $toWeek,
                        dayOfWeek:     $di,
                        workoutTypeId: $newWtId,
                        isRest:        $isRest,
                        planId:        $planId,
                    );
                }
                $copied++;
            }
        });

        return $copied;
    }

    // ── Exercise management ────────────────────────────────────

    public function createExercise(string $name, string $category, string $unitType): Exercise
    {
        if (empty(trim($name)))                           throw new \InvalidArgumentException('Name required');
        if (!Exercise::validateCategory($category))  throw new \InvalidArgumentException('Invalid category');
        if (!Exercise::validateUnitType($unitType))  throw new \InvalidArgumentException('Invalid unit type');

        return $this->exRepo->create(trim($name), $category, $unitType);
    }

    // ── Private helpers ────────────────────────────────────────

    private function colorForExercises(array $exercises): string
    {
        $ids = array_filter(array_map(fn($e) => (int)($e['id'] ?? 0), $exercises));
        if (empty($ids)) return '#64748b';

        $ph   = implode(',', array_fill(0, count($ids), '?'));
        $cats = array_column(
            $this->db->fetchAll("SELECT DISTINCT category FROM exercises WHERE id IN ($ph)", array_values($ids)),
            'category'
        );

        $priority = ['run', 'strength', 'cardio', 'stretching', 'yoga', 'mobility'];
        foreach ($priority as $cat) {
            if (in_array($cat, $cats, true)) {
                return Exercise::CATEGORIES[$cat]['color'] ?? '#64748b';
            }
        }
        return '#64748b';
    }
}
