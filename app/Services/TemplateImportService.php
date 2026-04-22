<?php
namespace App\Services;

use App\Database;
use App\Repositories\{ExerciseRepository, PlanRepository, WorkoutRepository};

// ============================================================
//  TemplateImportService
//  Parses an uploaded plan JSON file and writes it to the DB
//  transactionally. Called from templates.php controller.
//  Returns a summary array on success; throws on failure.
// ============================================================
final class TemplateImportService
{
    public function __construct(
        private readonly ExerciseRepository $exRepo,
        private readonly WorkoutRepository  $workoutRepo,
        private readonly PlanRepository     $planRepo,
        private readonly Database           $db,
    ) {}

    // ── Validation ─────────────────────────────────────────────

    public function validate(array $data): void
    {
        foreach (['template', 'exercises', 'workout_types', 'weeks'] as $key) {
            if (!isset($data[$key])) {
                throw new \InvalidArgumentException("Missing required key: \"$key\"");
            }
        }
        $tpl = $data['template'];
        if (empty($tpl['name']))        throw new \InvalidArgumentException('template.name is required');
        if (empty($tpl['total_weeks'])) throw new \InvalidArgumentException('template.total_weeks is required');
        if (!is_array($data['exercises']))    throw new \InvalidArgumentException('"exercises" must be an array');
        if (!is_array($data['workout_types'])) throw new \InvalidArgumentException('"workout_types" must be an array');
        if (!is_array($data['weeks']))  throw new \InvalidArgumentException('"weeks" must be an array');
    }

    // ── Import ─────────────────────────────────────────────────

    public function import(array $data): array
    {
        $this->validate($data);

        return $this->db->transaction(function () use ($data): array {

            // 1. Upsert exercises + media
            foreach ($data['exercises'] as $ex) {
                $exId = $this->exRepo->upsert(
                    slug:     $ex['slug'],
                    name:     $ex['name'],
                    category: $ex['category'],
                    unitType: $ex['unit_type'],
                );
                if (!empty($ex['media'])) {
                    $this->exRepo->replaceMedia($exId, $ex['media']);
                }
            }
            $exMap = $this->exRepo->slugToIdMap();

            // 2. Upsert workout types + replace their items
            $wtCount = 0;
            foreach ($data['workout_types'] as $wt) {
                $wtId = $this->workoutRepo->upsertType(
                    slug:     $wt['slug'],
                    name:     $wt['name'],
                    typeCode: $wt['type_code'],
                    color:    $wt['color'],
                );

                // Build items array, resolving exercise slugs to IDs
                $items = [];
                foreach ($wt['items'] ?? [] as $it) {
                    $exId = (!empty($it['exercise_slug']) && isset($exMap[$it['exercise_slug']]))
                          ? $exMap[$it['exercise_slug']] : null;
                    $items[] = [
                        'exercise_id'  => $exId,
                        'role'         => $it['role']         ?? 'main',
                        'sets'         => $it['sets']         ?? null,
                        'reps'         => $it['reps']         ?? null,
                        'weight_kg'    => $it['weight_kg']    ?? null,
                        'distance_km'  => $it['distance_km']  ?? null,
                        'duration_min' => $it['duration_min'] ?? null,
                        'note'         => $it['note']         ?? null,
                        'sort'         => $it['sort']         ?? 0,
                    ];
                }
                $this->workoutRepo->replaceItems($wtId, $items);
                $wtCount++;
            }
            $wtMap = $this->workoutRepo->slugToIdMap();

            // 3. Create the plan template record
            $tpl = $data['template'];
            $ptId = $this->db->insert(
                'INSERT INTO plan_templates (name, description, total_weeks, is_published) VALUES (?, ?, ?, 1)',
                [$tpl['name'], $tpl['description'] ?? null, (int)$tpl['total_weeks']]
            );

            // 4. Insert template days
            $ptdIns = $this->db->pdo()->prepare('
                INSERT INTO plan_template_days
                  (plan_template_id, week_number, day_of_week, workout_type_id, is_rest,
                   override_sets, override_distance_km, override_duration_min, override_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $dayCount = 0;
            foreach ($data['weeks'] as $weekData) {
                $wkNum = (int)$weekData['week'];
                foreach ($weekData['days'] as $d) {
                    $wtId = (!empty($d['workout_type']) && isset($wtMap[$d['workout_type']]))
                          ? $wtMap[$d['workout_type']] : null;
                    $ptdIns->execute([
                        $ptId, $wkNum, (int)$d['day'],
                        $wtId,
                        (int)($d['is_rest'] ?? false),
                        $d['override_sets']         ?? null,
                        $d['override_distance_km']  ?? null,
                        $d['override_duration_min'] ?? null,
                        $d['override_notes']        ?? null,
                    ]);
                    $dayCount++;
                }
            }

            // 5. Count media
            $mediaCount = array_sum(array_map(
                fn($ex) => count($ex['media'] ?? []),
                $data['exercises']
            ));

            return [
                'name'        => $tpl['name'],
                'wt_count'    => $wtCount,
                'day_count'   => $dayCount,
                'media_count' => $mediaCount,
            ];
        });
    }
}
