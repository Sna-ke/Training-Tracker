<?php
namespace App\Repositories;

use App\Models\Plan;

// ============================================================
//  PlanRepository
//  All SQL for training_plans, plan_templates, and
//  plan_template_days lives here.
// ============================================================
final class PlanRepository extends BaseRepository
{
    // ── Plan queries ───────────────────────────────────────────

    /** All plans as model objects, newest first. */
    public function findAll(): array
    {
        $rows = $this->db->fetchAll('
            SELECT tp.*, pt.name AS template_name, pt.total_weeks
            FROM training_plans tp
            JOIN plan_templates pt ON tp.plan_template_id = pt.id
            ORDER BY tp.created_at DESC
        ');
        return array_map(Plan::fromRow(...), $rows);
    }

    /**
     * All plans with completion progress stats — for the plans list page.
     * Returns plain arrays (not models) because progress is a view concern.
     */
    public function findAllWithProgress(int $userId): array
    {
        $rows = $this->db->fetchAll('
            SELECT tp.id, tp.name, tp.start_date, tp.athlete_name, tp.notes,
                   tp.plan_template_id, tp.created_at,
                   pt.name AS template_name, pt.total_weeks,
                   COALESCE(SUM(pd.completed), 0)           AS days_done,
                   COUNT(CASE WHEN pd.is_rest=0 THEN 1 END) AS days_total
            FROM training_plans tp
            JOIN plan_templates pt ON tp.plan_template_id = pt.id
            LEFT JOIN plan_days pd ON pd.training_plan_id = tp.id
            WHERE tp.user_id = ?
            GROUP BY tp.id
            ORDER BY tp.created_at DESC
        ', [$userId]);

        return array_map(function (array $r): array {
            $done  = (int)$r['days_done'];
            $total = (int)$r['days_total'];

            // Per-week summary: [week_number => [done, total]] for the mini grid
            $weekRows = $this->db->fetchAll('
                SELECT week_number,
                       COUNT(CASE WHEN is_rest=0 THEN 1 END)            AS total,
                       COALESCE(SUM(CASE WHEN is_rest=0 THEN completed END), 0) AS done
                FROM plan_days
                WHERE training_plan_id = ?
                GROUP BY week_number
                ORDER BY week_number
            ', [(int)$r['id']]);

            $weeks = [];
            foreach ($weekRows as $w) {
                $weeks[(int)$w['week_number']] = [
                    'done'  => (int)$w['done'],
                    'total' => (int)$w['total'],
                ];
            }

            return array_merge($r, [
                'days_done'     => $done,
                'days_total'    => $total,
                'pct'           => $total > 0 ? round($done / $total * 100) : 0,
                'week_summaries'=> $weeks,
            ]);
        }, $rows);
    }

    /** Single plan by ID, joined to its template. Returns null if not found. */
    public function findById(int $id): ?Plan
    {
        $row = $this->db->fetchOne('
            SELECT tp.*, pt.name AS template_name, pt.total_weeks
            FROM training_plans tp
            JOIN plan_templates pt ON tp.plan_template_id = pt.id
            WHERE tp.id = ?
        ', [$id]);
        return $row ? Plan::fromRow($row) : null;
    }

    /** Create a plan + template + all empty template days in a single transaction. */
    public function create(
        string  $name,
        string  $startDate,
        int     $totalWeeks,
        int     $userId,
        ?string $description  = null,
        ?string $athleteName  = null,
    ): Plan {
        return $this->db->transaction(function () use ($name, $startDate, $totalWeeks, $userId, $description, $athleteName) {

            // 1. Template
            $templateId = $this->db->insert(
                'INSERT INTO plan_templates (name, description, total_weeks) VALUES (?, ?, ?)',
                [$name, $description, $totalWeeks]
            );

            // 2. All template days (all rest=1 initially)
            $ptdStmt = $this->db->pdo()->prepare('
                INSERT INTO plan_template_days
                  (plan_template_id, week_number, day_of_week, workout_type_id, is_rest)
                VALUES (?, ?, ?, NULL, 1)
            ');
            $ptdIds = [];
            for ($w = 1; $w <= $totalWeeks; $w++) {
                $ptdIds[$w] = [];
                for ($d = 0; $d <= 6; $d++) {
                    $ptdStmt->execute([$templateId, $w, $d]);
                    $ptdIds[$w][$d] = (int)$this->db->pdo()->lastInsertId();
                }
            }

            // 3. Plan instance
            $planId = $this->db->insert(
                'INSERT INTO training_plans
                   (plan_template_id, name, start_date, athlete_name, notes, user_id)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$templateId, $name, $startDate, $athleteName, $description, $userId]
            );

            // 4. Plan days (one per template day)
            $pdStmt = $this->db->pdo()->prepare('
                INSERT INTO plan_days
                  (training_plan_id, plan_template_day_id, week_number, day_of_week,
                   workout_type_id, is_rest, original_date, scheduled_date)
                VALUES (?, ?, ?, ?, NULL, 1, ?, ?)
            ');
            $start = new \DateTimeImmutable($startDate);
            for ($w = 1; $w <= $totalWeeks; $w++) {
                for ($d = 0; $d <= 6; $d++) {
                    $offset = ($w - 1) * 7 + $d;
                    $date   = $start->modify("+$offset days")->format('Y-m-d');
                    $pdStmt->execute([$planId, $ptdIds[$w][$d], $w, $d, $date, $date]);
                }
            }

            return $this->findById($planId);
        });
    }

    /** Delete a plan. Pass $userId=null to skip ownership check (admin). */
    public function delete(int $planId, ?int $userId = null): void
    {
        if ($userId !== null) {
            $this->db->execute('DELETE FROM training_plans WHERE id = ? AND user_id = ?', [$planId, $userId]);
        } else {
            $this->db->execute('DELETE FROM training_plans WHERE id = ?', [$planId]);
        }
    }

    // ── Template queries ───────────────────────────────────────

    /**
     * Templates visible to a user:
     *   - Global defaults (created_by IS NULL, is_published=1)
     *   - Published user templates (is_published=1, any creator)
     *   - This user's own drafts
     * Pass $userId=null for admin-only view (all templates).
     */
    public function findAllTemplates(?int $userId = null): array
    {
        if ($userId !== null) {
            $sql    = '
                SELECT pt.id, pt.name, pt.description, pt.total_weeks, pt.created_at,
                       pt.created_by, pt.is_published,
                       COUNT(DISTINCT ptd.id) AS day_count,
                       COUNT(DISTINCT wt.id)  AS wt_count
                FROM plan_templates pt
                LEFT JOIN plan_template_days ptd ON ptd.plan_template_id = pt.id
                LEFT JOIN workout_types wt ON wt.id = ptd.workout_type_id
                WHERE pt.created_by IS NULL OR pt.is_published = 1 OR pt.created_by = ?
                GROUP BY pt.id
                ORDER BY pt.created_by IS NULL DESC, pt.created_at DESC
            ';
            return $this->db->fetchAll($sql, [$userId]);
        }
        // Admin: all templates
        return $this->db->fetchAll('
            SELECT pt.id, pt.name, pt.description, pt.total_weeks, pt.created_at,
                   pt.created_by, pt.is_published,
                   COUNT(DISTINCT ptd.id) AS day_count,
                   COUNT(DISTINCT wt.id)  AS wt_count
            FROM plan_templates pt
            LEFT JOIN plan_template_days ptd ON ptd.plan_template_id = pt.id
            LEFT JOIN workout_types wt ON wt.id = ptd.workout_type_id
            GROUP BY pt.id
            ORDER BY pt.created_by IS NULL DESC, pt.created_at DESC
        ');
    }

    /** Toggle the is_published flag on a user-owned template. */
    public function setPublished(int $templateId, bool $published): void
    {
        $this->db->execute(
            'UPDATE plan_templates SET is_published=? WHERE id=?',
            [(int)$published, $templateId]
        );
    }

    public function findTemplateById(int $id): ?array
    {
        return $this->db->fetchOne(
            'SELECT id, name, description, total_weeks FROM plan_templates WHERE id = ?',
            [$id]
        );
    }

    public function deleteTemplate(int $id): void
    {
        $this->db->execute('DELETE FROM plan_templates WHERE id = ?', [$id]);
    }

    public function templateIsInUse(int $id): bool
    {
        return (int)$this->db->fetchScalar(
            'SELECT COUNT(*) FROM training_plans WHERE plan_template_id = ?', [$id]
        ) > 0;
    }

    // ── Template days ──────────────────────────────────────────

    public function findTemplateDays(int $templateId): array
    {
        return $this->db->fetchAll(
            'SELECT * FROM plan_template_days WHERE plan_template_id = ? ORDER BY week_number, day_of_week',
            [$templateId]
        );
    }

    /** Update a template day and its corresponding plan_days in one shot. */
    public function updateTemplateDay(
        int   $templateId,
        int   $weekNum,
        int   $dayOfWeek,
        ?int  $workoutTypeId,
        int   $isRest,
        int   $planId,
    ): void {
        $this->db->execute('
            UPDATE plan_template_days
            SET workout_type_id = ?, is_rest = ?
            WHERE plan_template_id = ? AND week_number = ? AND day_of_week = ?
        ', [$workoutTypeId, $isRest, $templateId, $weekNum, $dayOfWeek]);

        $this->db->execute('
            UPDATE plan_days pd
            JOIN plan_template_days ptd ON pd.plan_template_day_id = ptd.id
            SET pd.workout_type_id = ?, pd.is_rest = ?
            WHERE pd.training_plan_id = ? AND pd.week_number = ? AND pd.day_of_week = ?
        ', [$workoutTypeId, $isRest, $planId, $weekNum, $dayOfWeek]);
    }

    // ── Grid data ──────────────────────────────────────────────

    /** Per-week summary for the week strip (completion counts etc). */
    public function weekGrid(int $planId): array
    {
        $rows = $this->db->fetchAll('
            SELECT week_number,
                   COUNT(CASE WHEN is_rest=0 THEN 1 END)                   AS total,
                   SUM(completed)                                           AS done,
                   SUM(CASE WHEN skipped=1 AND completed=0 THEN 1 END)     AS skipped,
                   MIN(scheduled_date)                                      AS week_start,
                   MAX(scheduled_date)                                      AS week_end
            FROM plan_days WHERE training_plan_id = ?
            GROUP BY week_number ORDER BY week_number
        ', [$planId]);

        // Key by week_number for O(1) lookup
        $grid = [];
        foreach ($rows as $r) {
            $grid[(int)$r['week_number']] = $r;
        }
        return $grid;
    }

    /** The lowest incomplete week on or after today (for auto-navigation). */
    public function currentActiveWeek(int $planId): int
    {
        $week = $this->db->fetchScalar('
            SELECT week_number FROM plan_days
            WHERE training_plan_id = ? AND is_rest = 0
              AND completed = 0 AND skipped = 0
              AND scheduled_date >= ?
            ORDER BY scheduled_date LIMIT 1
        ', [$planId, date('Y-m-d')]);

        return $week !== null ? (int)$week : 1;
    }

    // ── Create from imported template (used by plans.php "New Plan" form) ──
    public function createFromTemplate(
        int     $templateId,
        int     $totalWeeks,
        string  $name,
        string  $startDate,
        int     $userId,
        ?string $athleteName = null,
        ?string $notes       = null,
    ): Plan {
        return $this->db->transaction(function () use ($templateId, $totalWeeks, $name, $startDate, $userId, $athleteName, $notes) {

            $planId = $this->db->insert(
                'INSERT INTO training_plans(plan_template_id,name,start_date,athlete_name,notes,user_id) VALUES(?,?,?,?,?,?)',
                [$templateId, $name, $startDate, $athleteName, $notes, $userId]
            );

            $ptdRows = $this->db->fetchAll(
                'SELECT * FROM plan_template_days WHERE plan_template_id=? ORDER BY week_number,day_of_week',
                [$templateId]
            );

            $pdIns = $this->db->pdo()->prepare('
                INSERT INTO plan_days(training_plan_id,plan_template_day_id,week_number,day_of_week,
                  workout_type_id,is_rest,original_date,scheduled_date)
                VALUES(?,?,?,?,?,?,?,?)
            ');
            $start = new \DateTimeImmutable($startDate);
            foreach ($ptdRows as $d) {
                $offset = ($d['week_number'] - 1) * 7 + $d['day_of_week'];
                $date   = $start->modify("+$offset days")->format('Y-m-d');
                $pdIns->execute([$planId,$d['id'],$d['week_number'],$d['day_of_week'],
                                 $d['workout_type_id'],$d['is_rest'],$date,$date]);
            }
            return $this->findById($planId);
        });
    }
}
