<?php
namespace App\Models;

use DateTimeImmutable;

// ============================================================
//  Plan — aggregate root representing a training plan instance.
// ============================================================
final class Plan
{
    public function __construct(
        public readonly int                $id,
        public readonly int                $templateId,
        public readonly string             $name,
        public readonly DateTimeImmutable  $startDate,
        public readonly int                $totalWeeks,
        public readonly ?string            $athleteName,
        public readonly ?string            $notes,
        public readonly ?string            $templateName,
    ) {}

    public static function fromRow(array $row): self
    {
        return new self(
            id:           (int)$row['id'],
            templateId:   (int)$row['plan_template_id'],
            name:         $row['name'],
            startDate:    new DateTimeImmutable($row['start_date']),
            totalWeeks:   (int)($row['total_weeks'] ?? 0),
            athleteName:  $row['athlete_name'] ?? null,
            notes:        $row['notes'] ?? null,
            templateName: $row['template_name'] ?? null,
        );
    }

    public function currentWeek(): int
    {
        $today   = new DateTimeImmutable();
        $diff    = (int)$today->diff($this->startDate)->days;
        $elapsed = $today >= $this->startDate ? $diff : 0;
        return max(1, min($this->totalWeeks, (int)floor($elapsed / 7) + 1));
    }

    public function toArray(): array
    {
        return [
            'id'           => $this->id,
            'template_id'  => $this->templateId,
            'name'         => $this->name,
            'start_date'   => $this->startDate->format('Y-m-d'),
            'total_weeks'  => $this->totalWeeks,
            'athlete_name' => $this->athleteName,
            'notes'        => $this->notes,
            'template_name'=> $this->templateName,
        ];
    }
}
