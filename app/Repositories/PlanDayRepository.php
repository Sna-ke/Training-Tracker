<?php
namespace App\Repositories;

use App\Models\PlanDay;

// ============================================================
//  PlanDayRepository
//  All SQL for plan_days, exercise_logs, and
//  the skip/complete operations.
// ============================================================
final class PlanDayRepository extends BaseRepository
{
    // ── Queries ────────────────────────────────────────────────

    /** All days for a given plan + week, ordered by scheduled date.
     *  Uses the week's date range from the week grid so skipped days
     *  that have shifted into a new scheduled_date still appear in the
     *  correct week view. */
    public function findByWeek(int $planId, int $week): array
    {
        // Derive the week's date range from the original week_number boundaries.
        // We use original_date for the range so the week boundaries never move
        // even when scheduled_dates shift due to skips.
        $rows = $this->db->fetchAll('
            SELECT pd.id, pd.training_plan_id, pd.plan_template_day_id,
                   pd.week_number, pd.day_of_week,
                   pd.workout_type_id, pd.is_rest,
                   pd.scheduled_date, pd.original_date,
                   pd.completed, pd.skipped, pd.day_notes,
                   pd.completed_at,
                   wt.name AS wt_name, wt.type_code, wt.color AS wt_col
            FROM plan_days pd
            LEFT JOIN workout_types wt ON pd.workout_type_id = wt.id
            WHERE pd.training_plan_id = ?
              AND pd.week_number = ?
            ORDER BY pd.scheduled_date, pd.day_of_week
        ', [$planId, $week]);

        return array_map(PlanDay::fromRow(...), $rows);
    }

    /** Single day by its ID (joined to workout type). */
    public function findById(int $planDayId): ?PlanDay
    {
        $row = $this->db->fetchOne('
            SELECT pd.*, wt.name AS wt_name, wt.type_code, wt.color AS wt_col
            FROM plan_days pd
            LEFT JOIN workout_types wt ON pd.workout_type_id = wt.id
            WHERE pd.id = ?
        ', [$planDayId]);
        return $row ? PlanDay::fromRow($row) : null;
    }

    /** Completion bitmap: [week][day_of_week] => [done, skipped]. */
    public function completionGrid(int $planId): array
    {
        $rows = $this->db->fetchAll(
            'SELECT week_number, day_of_week, completed, skipped
             FROM plan_days WHERE training_plan_id = ? AND is_rest = 0',
            [$planId]
        );
        $grid = [];
        foreach ($rows as $r) {
            $grid[(int)$r['week_number']][(int)$r['day_of_week']] = [
                'done'    => (bool)$r['completed'],
                'skipped' => (bool)$r['skipped'],
            ];
        }
        return $grid;
    }

    // ── Mark complete / incomplete ─────────────────────────────

    public function markComplete(int $planDayId, bool $complete, ?string $notes = null): void
    {
        $at = $complete ? date('Y-m-d H:i:s') : null;
        $this->db->execute(
            'UPDATE plan_days SET completed = ?, completed_at = ?, day_notes = ? WHERE id = ?',
            [(int)$complete, $at, $notes, $planDayId]
        );
    }

    // ── Exercise logs ──────────────────────────────────────────

    /** Upsert a single exercise log row. */
    public function upsertLog(
        int     $planDayId,
        int     $workoutItemId,
        int     $exerciseId,
        ?int    $sets,
        ?int    $reps,
        ?float  $weightKg,
        ?float  $distanceKm,
        ?float  $durationMin,
        ?float  $pacePerKm,
        ?int    $heartRate,
        ?string $notes,
    ): void {
        $this->db->execute('
            INSERT INTO exercise_logs
              (plan_day_id, workout_item_id, exercise_id, sets_done, reps_done,
               weight_kg, distance_km, duration_min, pace_per_km, heart_rate_avg, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              sets_done=VALUES(sets_done), reps_done=VALUES(reps_done),
              weight_kg=VALUES(weight_kg), distance_km=VALUES(distance_km),
              duration_min=VALUES(duration_min), pace_per_km=VALUES(pace_per_km),
              heart_rate_avg=VALUES(heart_rate_avg), notes=VALUES(notes),
              updated_at=CURRENT_TIMESTAMP
        ', [$planDayId, $workoutItemId, $exerciseId, $sets, $reps,
            $weightKg, $distanceKm, $durationMin, $pacePerKm, $heartRate, $notes]);
    }

    /** All saved logs for a plan day (keyed by workout_item_id). */
    public function logsForDay(int $planDayId): array
    {
        $rows = $this->db->fetchAll(
            'SELECT workout_item_id, sets_done, reps_done, weight_kg,
                    distance_km, duration_min, pace_per_km, heart_rate_avg, notes
             FROM exercise_logs WHERE plan_day_id = ?',
            [$planDayId]
        );
        $indexed = [];
        foreach ($rows as $r) {
            $indexed[(int)$r['workout_item_id']] = $r;
        }
        return $indexed;
    }

    /** Exercise progression history across a plan. */
    public function exerciseHistory(int $exerciseId, int $planId): array
    {
        return $this->db->fetchAll('
            SELECT pd.week_number, pd.scheduled_date, pd.day_of_week,
                   COALESCE(ptd.override_sets,         wi.planned_sets)         AS eff_sets,
                   COALESCE(ptd.override_distance_km,  wi.planned_distance_km)  AS eff_distance,
                   COALESCE(ptd.override_duration_min, wi.planned_duration_min) AS eff_duration,
                   wi.planned_sets, wi.planned_reps, wi.planned_weight_kg,
                   el.sets_done, el.reps_done, el.weight_kg,
                   el.distance_km, el.duration_min, el.pace_per_km, el.heart_rate_avg,
                   el.notes, el.logged_at
            FROM exercise_logs el
            JOIN plan_days          pd  ON el.plan_day_id          = pd.id
            JOIN workout_items      wi  ON el.workout_item_id      = wi.id
            JOIN plan_template_days ptd ON pd.plan_template_day_id = ptd.id
            WHERE el.exercise_id = ? AND pd.training_plan_id = ?
            ORDER BY pd.scheduled_date
        ', [$exerciseId, $planId]);
    }
}
