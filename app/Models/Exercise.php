<?php
namespace App\Models;

// ============================================================
//  Exercise — immutable value object representing a catalog
//  exercise. No database logic here — only data and validation.
// ============================================================
final class Exercise
{
    public const CATEGORIES = [
        'strength'  => ['label' => 'Strength',  'color' => '#f97316', 'icon' => '🏋️'],
        'cardio'    => ['label' => 'Cardio',     'color' => '#4ade80', 'icon' => '🏃'],
        'run'       => ['label' => 'Run',        'color' => '#38bdf8', 'icon' => '👟'],
        'stretching'=> ['label' => 'Stretching', 'color' => '#a78bfa', 'icon' => '🧘'],
        'yoga'      => ['label' => 'Yoga',       'color' => '#f472b6', 'icon' => '🪷'],
        'mobility'  => ['label' => 'Mobility',   'color' => '#94a3b8', 'icon' => '⚡'],
    ];

    public const UNIT_TYPES = ['reps', 'seconds', 'distance', 'duration'];

    public function __construct(
        public readonly int     $id,
        public readonly string  $slug,
        public readonly string  $name,
        public readonly ?string $description,
        public readonly string  $category,
        public readonly string  $unitType,
        public readonly ?int    $createdBy  = null,
        public readonly bool    $isPublic   = true,
    ) {}

    // ── Factory ────────────────────────────────────────────────

    public static function fromRow(array $row): self
    {
        return new self(
            id:          (int)$row['id'],
            slug:        $row['slug'],
            name:        $row['name'],
            description: $row['description'] ?? null,
            category:    $row['category'],
            unitType:    $row['unit_type'],
            createdBy:   isset($row['created_by']) ? (int)$row['created_by'] : null,
            isPublic:    isset($row['is_public']) ? (bool)$row['is_public'] : true,
        );
    }

    // ── Derived properties ─────────────────────────────────────

    public function categoryLabel(): string
    {
        return self::CATEGORIES[$this->category]['label'] ?? ucfirst($this->category);
    }

    public function categoryColor(): string
    {
        return self::CATEGORIES[$this->category]['color'] ?? '#64748b';
    }

    public function categoryIcon(): string
    {
        return self::CATEGORIES[$this->category]['icon'] ?? '';
    }

    public function unitLabel(): string
    {
        return match ($this->unitType) {
            'reps'     => 'Reps',
            'seconds'  => 'Seconds',
            'distance' => 'km',
            'duration' => 'Minutes',
            default    => $this->unitType,
        };
    }

    public function isRunBased(): bool
    {
        return in_array($this->unitType, ['distance', 'duration']);
    }

    public function isTimeBased(): bool
    {
        return $this->unitType === 'seconds';
    }

    // ── Serialisation ──────────────────────────────────────────

    public function toArray(): array
    {
        return [
            'id'          => $this->id,
            'slug'        => $this->slug,
            'name'        => $this->name,
            'description' => $this->description,
            'category'    => $this->category,
            'unit_type'   => $this->unitType,
            'created_by'  => $this->createdBy,
            'is_public'   => $this->isPublic,
        ];
    }

    // ── Validation (static, used by service layer) ─────────────

    public static function validateCategory(string $cat): bool
    {
        return isset(self::CATEGORIES[$cat]);
    }

    public static function validateUnitType(string $unit): bool
    {
        return in_array($unit, self::UNIT_TYPES);
    }

    public static function slugify(string $name): string
    {
        $slug = strtolower(trim($name));
        $slug = preg_replace('/[^a-z0-9]+/', '_', $slug);
        return trim($slug, '_');
    }
}
