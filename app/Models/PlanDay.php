<?php
namespace App\Models;

use DateTimeImmutable;

// ============================================================
//  PlanDay — one scheduled day within a plan instance.
// ============================================================
final class PlanDay
{
    /** Day-of-week constants (0 = Mon … 6 = Sun) */
    public const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    public function __construct(
        public readonly int               $id,
        public readonly int               $planId,
        public readonly int               $templateDayId,
        public readonly int               $weekNumber,
        public readonly int               $dayOfWeek,
        public readonly ?int              $workoutTypeId,
        public readonly bool              $isRest,
        public readonly DateTimeImmutable $scheduledDate,
        public readonly DateTimeImmutable $originalDate,
        public readonly bool              $completed,
        public readonly bool              $skipped,
        public readonly ?string           $dayNotes,
        public readonly ?string           $workoutTypeName,
        public readonly ?string           $workoutTypeCode,
        public readonly ?string           $workoutColor,
    ) {}

    public static function fromRow(array $row): self
    {
        return new self(
            id:               (int)$row['id'],
            planId:           (int)$row['training_plan_id'],
            templateDayId:    (int)$row['plan_template_day_id'],
            weekNumber:       (int)$row['week_number'],
            dayOfWeek:        (int)$row['day_of_week'],
            workoutTypeId:    isset($row['workout_type_id']) ? (int)$row['workout_type_id'] : null,
            isRest:           (bool)$row['is_rest'],
            scheduledDate:    new DateTimeImmutable($row['scheduled_date']),
            originalDate:     new DateTimeImmutable($row['original_date']),
            completed:        (bool)$row['completed'],
            skipped:          (bool)$row['skipped'],
            dayNotes:         $row['day_notes'] ?? null,
            workoutTypeName:  $row['wt_name']   ?? null,
            workoutTypeCode:  $row['type_code'] ?? null,
            workoutColor:     $row['wt_col']    ?? null,
        );
    }

    public function dayName(): string
    {
        return self::NAMES[$this->dayOfWeek] ?? "Day{$this->dayOfWeek}";
    }

    public function isActive(): bool
    {
        return !$this->isRest && !$this->skipped;
    }

    public function displayColor(): string
    {
        return $this->workoutColor ?? '#334155';
    }

    public function toArray(): array
    {
        return [
            'id'              => $this->id,
            'plan_id'         => $this->planId,
            'week_number'     => $this->weekNumber,
            'day_of_week'     => $this->dayOfWeek,
            'day_name'        => $this->dayName(),
            'workout_type_id' => $this->workoutTypeId,
            'is_rest'         => $this->isRest,
            'scheduled_date'  => $this->scheduledDate->format('Y-m-d'),
            'original_date'   => $this->originalDate->format('Y-m-d'),
            'completed'       => $this->completed,
            'skipped'         => $this->skipped,
            'day_notes'       => $this->dayNotes,
            'wt_name'         => $this->workoutTypeName,
            'type_code'       => $this->workoutTypeCode,
            'color'           => $this->displayColor(),
        ];
    }
}
