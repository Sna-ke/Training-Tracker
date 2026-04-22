<?php
namespace App\Services;

use App\Database;
use App\Repositories\PlanDayRepository;

// ============================================================
//  PlanScheduleService
//  Skip/unskip/complete business logic.
//
//  Skip behaviour:
//   - Today's slot becomes an impromptu rest day (marked skipped,
//     scheduled_date stays on today).
//   - Every subsequent non-rest, non-completed day shifts +1 day
//     (scheduled_date > today, i.e. strictly after the skipped day).
//   - Net result: today = rest; tomorrow = today's workout;
//     day-after = tomorrow's workout; and so on — n+1 cascade.
//
//  Unskip reverses this exactly:
//   - Every subsequent day (scheduled_date > today) shifts -1 day.
//   - The skip flag is cleared, restoring today's workout.
//
//  Using self-JOINs so we derive training_plan_id and
//  scheduled_date directly from the DB row rather than trusting
//  PHP-side values that could be stale or zero.
// ============================================================
final class PlanScheduleService
{
    public function __construct(
        private readonly PlanDayRepository $dayRepo,
        private readonly Database          $db,
    ) {}

    // ── Skip ──────────────────────────────────────────────────

    public function skipDay(int $planDayId): void
    {
        if (!$this->dayRepo->findById($planDayId)) {
            throw new \InvalidArgumentException("Plan day $planDayId not found");
        }

        $this->db->transaction(function () use ($planDayId) {
            // 1. Mark today as skipped (rest day — stays on today's date)
            $this->db->execute(
                'UPDATE plan_days SET skipped = 1 WHERE id = ?',
                [$planDayId]
            );

            // 2. Shift ONLY the days that come AFTER the skipped day
            //    (scheduled_date > skipped day's scheduled_date).
            //    Self-JOIN ensures we use the DB value, not a PHP-side copy.
            $this->db->execute('
                UPDATE plan_days AS pd
                JOIN  plan_days  AS ref ON ref.id = ?
                SET   pd.scheduled_date = DATE_ADD(pd.scheduled_date, INTERVAL 1 DAY)
                WHERE pd.training_plan_id = ref.training_plan_id
                  AND pd.scheduled_date  > ref.scheduled_date
                  AND pd.is_rest         = 0
                  AND pd.completed       = 0
            ', [$planDayId]);
        });
    }

    // ── Unskip ────────────────────────────────────────────────

    public function unskipDay(int $planDayId): void
    {
        if (!$this->dayRepo->findById($planDayId)) {
            throw new \InvalidArgumentException("Plan day $planDayId not found");
        }

        $this->db->transaction(function () use ($planDayId) {
            // 1. Restore the days that were pushed forward (shift back)
            $this->db->execute('
                UPDATE plan_days AS pd
                JOIN  plan_days  AS ref ON ref.id = ?
                SET   pd.scheduled_date = DATE_SUB(pd.scheduled_date, INTERVAL 1 DAY)
                WHERE pd.training_plan_id = ref.training_plan_id
                  AND pd.scheduled_date  > ref.scheduled_date
                  AND pd.is_rest         = 0
                  AND pd.completed       = 0
            ', [$planDayId]);

            // 2. Clear the skip flag — today's workout is active again
            $this->db->execute(
                'UPDATE plan_days SET skipped = 0 WHERE id = ?',
                [$planDayId]
            );
        });
    }

    // ── Complete / incomplete ──────────────────────────────────

    public function completeDay(int $planDayId, bool $complete, ?string $notes = null): void
    {
        $this->dayRepo->markComplete($planDayId, $complete, $notes);
    }
}
