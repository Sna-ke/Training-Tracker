<?php
namespace App\Repositories;

use App\Models\Exercise;

// ============================================================
//  ExerciseRepository
//  All SQL touching the `exercises` and `exercise_media` tables
//  lives here. Services and controllers call these methods;
//  they never write their own SQL.
// ============================================================
final class ExerciseRepository extends BaseRepository
{
    // ── Queries ────────────────────────────────────────────────

    /**
     * Exercises visible to the given user:
     *   - Global exercises (created_by IS NULL)
     *   - The user's own private exercises (created_by = $userId)
     * Optionally filtered by category and/or search.
     */
    public function findAll(
        ?string $category = null,
        ?string $search   = null,
        ?int    $userId   = null,
    ): array {
        if ($userId !== null) {
            $sql    = 'SELECT id,slug,name,description,category,unit_type,created_by,is_public
                       FROM exercises
                       WHERE (created_by IS NULL OR created_by = ?)';
            $params = [$userId];
        } else {
            // No user context → only global exercises (used during import)
            $sql    = 'SELECT id,slug,name,description,category,unit_type,created_by,is_public
                       FROM exercises
                       WHERE created_by IS NULL';
            $params = [];
        }

        if ($category && $category !== 'all') {
            $sql    .= ' AND category = ?';
            $params[] = $category;
        }
        if ($search) {
            $sql    .= ' AND name LIKE ?';
            $params[] = '%' . $search . '%';
        }

        $sql .= ' ORDER BY category, name';
        return array_map(
            Exercise::fromRow(...),
            $this->db->fetchAll($sql, $params)
        );
    }

    /** Single exercise by ID, or null. */
    public function findById(int $id): ?Exercise
    {
        $row = $this->db->fetchOne(
            'SELECT id,slug,name,description,category,unit_type,created_by,is_public FROM exercises WHERE id = ?',
            [$id]
        );
        return $row ? Exercise::fromRow($row) : null;
    }

    /** Single exercise by slug, or null. */
    public function findBySlug(string $slug): ?Exercise
    {
        $row = $this->db->fetchOne(
            'SELECT id,slug,name,description,category,unit_type,created_by,is_public FROM exercises WHERE slug = ?',
            [$slug]
        );
        return $row ? Exercise::fromRow($row) : null;
    }

    // ── Mutations ──────────────────────────────────────────────

    /**
     * Insert a new exercise. Handles slug uniqueness automatically.
     * Returns the created Exercise.
     */
    /** Create an exercise. Pass $userId=null for a global (admin) exercise. */
    public function create(string $name, string $category, string $unitType, ?int $userId = null): Exercise
    {
        $slug = Exercise::slugify($name);

        // Ensure slug uniqueness
        if ($this->findBySlug($slug)) {
            $slug .= '_' . substr(md5($name . microtime()), 0, 4);
        }

        $id = $this->db->insert(
            'INSERT INTO exercises (slug, name, description, category, unit_type, created_by, is_public)
             VALUES (?, ?, NULL, ?, ?, ?, ?)',
            [$slug, $name, $category, $unitType, $userId, $userId === null ? 1 : 0]
        );

        return $this->findById($id);
    }

    /** Upsert by slug (used during JSON template import). */
    public function upsert(string $slug, string $name, string $category, string $unitType): int
    {
        $this->db->execute(
            'INSERT INTO exercises (slug, name, category, unit_type)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name=VALUES(name), category=VALUES(category), unit_type=VALUES(unit_type)',
            [$slug, $name, $category, $unitType]
        );
        return (int)$this->db->fetchScalar('SELECT id FROM exercises WHERE slug = ?', [$slug]);
    }

    // ── Media ──────────────────────────────────────────────────

    /** All media links for one exercise, ordered by sort_order. */
    public function findMedia(int $exerciseId): array
    {
        return $this->db->fetchAll(
            'SELECT id, media_type, source, url, label, sort_order
             FROM exercise_media WHERE exercise_id = ? ORDER BY sort_order',
            [$exerciseId]
        );
    }

    /** Replace all media for an exercise (used during import). */
    public function replaceMedia(int $exerciseId, array $mediaItems): void
    {
        $this->db->execute('DELETE FROM exercise_media WHERE exercise_id = ?', [$exerciseId]);

        if (empty($mediaItems)) return;

        $stmt = $this->db->pdo()->prepare(
            'INSERT INTO exercise_media (exercise_id, media_type, source, url, label, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        foreach ($mediaItems as $ord => $m) {
            $url = trim($m['url'] ?? '');
            if (!$url) continue;
            $stmt->execute([
                $exerciseId,
                $m['type']   ?? 'video',
                $m['source'] ?? 'web',
                $url,
                trim($m['label'] ?? 'Resource'),
                (int)$ord,
            ]);
        }
    }

    // ── Helpers ────────────────────────────────────────────────

    /** Build a slug→id map for a list of slugs (used by importers). */
    public function slugToIdMap(): array
    {
        $rows = $this->db->fetchAll('SELECT id, slug FROM exercises');
        return array_column($rows, 'id', 'slug');
    }
}
