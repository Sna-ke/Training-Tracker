<?php
namespace App\Repositories;

// ============================================================
//  WorkoutRepository
//  All SQL for workout_types and workout_items.
// ============================================================
final class WorkoutRepository extends BaseRepository
{
    /** Items for a workout type, joined to exercise data and saved logs. */
    public function itemsForDay(int $workoutTypeId, int $planDayId): array
    {
        return $this->db->fetchAll('
            SELECT wi.id AS item_id, wi.item_role, wi.planned_sets, wi.planned_reps,
                   wi.planned_weight_kg, wi.planned_distance_km, wi.planned_duration_min,
                   wi.item_note, wi.sort_order,
                   e.id AS exercise_id, e.slug AS exercise_slug,
                   e.name AS exercise_name, e.category, e.unit_type,
                   el.sets_done, el.reps_done, el.weight_kg AS log_weight,
                   el.distance_km, el.duration_min, el.pace_per_km,
                   el.heart_rate_avg, el.notes AS log_notes
            FROM workout_items wi
            LEFT JOIN exercises e ON wi.exercise_id = e.id
            LEFT JOIN exercise_logs el
              ON el.workout_item_id = wi.id AND el.plan_day_id = ?
            WHERE wi.workout_type_id = ?
            ORDER BY wi.sort_order
        ', [$planDayId, $workoutTypeId]);
    }

    /** Upsert a workout type by slug. Returns its ID. */
    public function upsertType(string $slug, string $name, string $typeCode, string $color): int
    {
        $this->db->execute('
            INSERT INTO workout_types (slug, name, type_code, color)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE name=VALUES(name), type_code=VALUES(type_code), color=VALUES(color)
        ', [$slug, $name, $typeCode, $color]);
        return (int)$this->db->fetchScalar('SELECT id FROM workout_types WHERE slug = ?', [$slug]);
    }

    /** Replace all items for a workout type. */
    public function replaceItems(int $workoutTypeId, array $items): void
    {
        $this->db->execute('DELETE FROM workout_items WHERE workout_type_id = ?', [$workoutTypeId]);

        if (empty($items)) return;

        $stmt = $this->db->pdo()->prepare('
            INSERT INTO workout_items
              (workout_type_id, exercise_id, item_role, planned_sets, planned_reps,
               planned_weight_kg, planned_distance_km, planned_duration_min, item_note, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        foreach ($items as $ord => $it) {
            $stmt->execute([
                $workoutTypeId,
                $it['exercise_id'] ?? null,
                $it['role']         ?? 'main',
                $it['sets']         ?? null,
                $it['reps']         ?? null,
                $it['weight_kg']    ?? null,
                $it['distance_km']  ?? null,
                $it['duration_min'] ?? null,
                $it['note']         ?? null,
                (int)($it['sort'] ?? $ord),
            ]);
        }
    }

    /** All workout types as slug→id map (used by importers). */
    public function slugToIdMap(): array
    {
        return array_column(
            $this->db->fetchAll('SELECT id, slug FROM workout_types'),
            'id', 'slug'
        );
    }

    /** Copy all items from one workout_type to another. */
    public function copyItems(int $fromTypeId, int $toTypeId): void
    {
        $items = $this->db->fetchAll(
            'SELECT * FROM workout_items WHERE workout_type_id = ? ORDER BY sort_order',
            [$fromTypeId]
        );
        $this->replaceItems($toTypeId, array_map(fn($wi) => [
            'exercise_id'  => $wi['exercise_id'],
            'role'         => $wi['item_role'],
            'sets'         => $wi['planned_sets'],
            'reps'         => $wi['planned_reps'],
            'weight_kg'    => $wi['planned_weight_kg'],
            'distance_km'  => $wi['planned_distance_km'],
            'duration_min' => $wi['planned_duration_min'],
            'note'         => $wi['item_note'],
        ], $items));
    }
}
