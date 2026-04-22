<?php
namespace App\Repositories;

use App\Database;

// ============================================================
//  BaseRepository — every repository extends this.
//  Holds the shared $db instance and input-sanitising helpers.
//  No public methods here — only protected utilities.
// ============================================================
abstract class BaseRepository
{
    protected Database $db;

    public function __construct(?Database $db = null)
    {
        $this->db = $db ?? Database::getInstance();
    }

    // ── Input helpers (mirrors the old procedural save.php) ────

    protected function posInt(mixed $v): ?int
    {
        $n = filter_var($v, FILTER_VALIDATE_INT);
        return ($n !== false && $n >= 0) ? (int)$n : null;
    }

    protected function posFloat(mixed $v): ?float
    {
        $f = filter_var($v, FILTER_VALIDATE_FLOAT);
        return ($f !== false && $f >= 0) ? (float)$f : null;
    }

    protected function safeStr(mixed $v, int $max = 500): ?string
    {
        return ($v !== null && $v !== '')
            ? mb_substr(trim((string)$v), 0, $max)
            : null;
    }

    protected function validDate(string $d): bool
    {
        return (bool)preg_match('/^\d{4}-\d{2}-\d{2}$/', $d);
    }

    // ── Pagination helper ──────────────────────────────────────

    protected function paginate(string $sql, array $params, int $page, int $perPage): array
    {
        $offset     = ($page - 1) * $perPage;
        $totalCount = (int)$this->db->fetchScalar(
            "SELECT COUNT(*) FROM ($sql) AS _sub", $params
        );
        $rows = $this->db->fetchAll("$sql LIMIT $perPage OFFSET $offset", $params);
        return [
            'items'       => $rows,
            'total'       => $totalCount,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => (int)ceil($totalCount / $perPage),
        ];
    }
}
