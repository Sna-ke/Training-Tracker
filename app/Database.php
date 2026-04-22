<?php
namespace App;

use PDO;
use PDOStatement;
use RuntimeException;

// ============================================================
//  Database — lightweight PDO wrapper with typed helpers.
//
//  Provides a single connection per request and convenience
//  methods used by every Repository. Not an ORM — stays thin.
// ============================================================
final class Database
{
    private static ?self $instance = null;
    private PDO $pdo;

    private function __construct(
        string $host,
        string $port,
        string $name,
        string $user,
        string $pass,
        string $charset = 'utf8mb4',
    ) {
        $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=$charset";
        $this->pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    // ── Singleton ──────────────────────────────────────────────
    public static function getInstance(): self
    {
        if (self::$instance === null) {
            $cfg = require __DIR__ . '/../config.php';
            self::$instance = new self(
                $cfg['db_host'],
                $cfg['db_port'],
                $cfg['db_name'],
                $cfg['db_user'],
                $cfg['db_pass'],
            );
        }
        return self::$instance;
    }

    // ── Raw PDO access (used by repositories only) ─────────────
    public function pdo(): PDO { return $this->pdo; }

    // ── Convenience helpers ────────────────────────────────────

    /** Run a SELECT and return all rows. */
    public function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->run($sql, $params);
        return $stmt->fetchAll();
    }

    /** Run a SELECT and return one row or null. */
    public function fetchOne(string $sql, array $params = []): ?array
    {
        $row = $this->run($sql, $params)->fetch();
        return $row !== false ? $row : null;
    }

    /** Run a SELECT and return a single scalar value or null. */
    public function fetchScalar(string $sql, array $params = []): mixed
    {
        $val = $this->run($sql, $params)->fetchColumn();
        return $val !== false ? $val : null;
    }

    /** Run an INSERT/UPDATE/DELETE. Returns affected row count. */
    public function execute(string $sql, array $params = []): int
    {
        return $this->run($sql, $params)->rowCount();
    }

    /** Run any statement and return the last insert ID. */
    public function insert(string $sql, array $params = []): int
    {
        $this->run($sql, $params);
        return (int) $this->pdo->lastInsertId();
    }

    // ── Transaction helpers ────────────────────────────────────

    public function transaction(callable $callback): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $callback($this);
            $this->pdo->commit();
            return $result;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // ── Internal ───────────────────────────────────────────────

    private function run(string $sql, array $params): PDOStatement
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
}
