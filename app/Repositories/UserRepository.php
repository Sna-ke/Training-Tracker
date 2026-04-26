<?php
namespace App\Repositories;

use App\Models\User;

// ============================================================
//  UserRepository — all SQL for users and user_sessions
// ============================================================
final class UserRepository extends BaseRepository
{
    // ── Lookups ────────────────────────────────────────────────

    public function findById(int $id): ?User
    {
        $row = $this->db->fetchOne(
            'SELECT id,name,email,avatar,bio,role,is_active,created_at
             FROM users WHERE id = ?',
            [$id]
        );
        return $row ? User::fromRow($row) : null;
    }

    public function findByEmail(string $email): ?array
    {
        // Returns raw array so Auth can verify password_hash without exposing it on the model
        return $this->db->fetchOne(
            'SELECT id,name,email,password_hash,role,is_active
             FROM users WHERE email = ?',
            [mb_strtolower(trim($email))]
        );
    }

    public function findAll(): array
    {
        $rows = $this->db->fetchAll(
            'SELECT id,name,email,avatar,bio,role,is_active,created_at
             FROM users ORDER BY created_at DESC'
        );
        return array_map(User::fromRow(...), $rows);
    }

    // ── Mutations ──────────────────────────────────────────────

    public function create(
        string  $name,
        string  $email,
        string  $passwordHash,
        string  $role = 'user',
    ): User {
        $id = $this->db->insert(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [trim($name), mb_strtolower(trim($email)), $passwordHash, $role]
        );
        return $this->findById($id);
    }

    public function updateProfile(int $id, string $name, string $email): void
    {
        $this->db->execute(
            'UPDATE users SET name=?, email=? WHERE id=?',
            [trim($name), mb_strtolower(trim($email)), $id]
        );
    }

    public function updateFullProfile(
        int     $id,
        string  $name,
        string  $email,
        ?string $avatar,
        ?string $bio,
    ): void {
        $this->db->execute(
            'UPDATE users SET name=?, email=?, avatar=?, bio=? WHERE id=?',
            [trim($name), mb_strtolower(trim($email)), $avatar ?: null, $bio ?: null, $id]
        );
    }

    public function updatePassword(int $id, string $passwordHash): void
    {
        $this->db->execute(
            'UPDATE users SET password_hash=? WHERE id=?',
            [$passwordHash, $id]
        );
    }

    public function setActive(int $id, bool $active): void
    {
        $this->db->execute(
            'UPDATE users SET is_active=? WHERE id=?',
            [(int)$active, $id]
        );
    }

    public function setRole(int $id, string $role): void
    {
        $this->db->execute(
            'UPDATE users SET role=? WHERE id=?',
            [$role, $id]
        );
    }

    public function emailExists(string $email, ?int $excludeId = null): bool
    {
        $sql    = 'SELECT COUNT(*) FROM users WHERE email = ?';
        $params = [mb_strtolower(trim($email))];
        if ($excludeId !== null) {
            $sql    .= ' AND id != ?';
            $params[] = $excludeId;
        }
        return (int)$this->db->fetchScalar($sql, $params) > 0;
    }

    // ── Sessions ───────────────────────────────────────────────

    public function createSession(int $userId, int $days = 30): string
    {
        $token     = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime("+{$days} days"));

        $this->db->insert(
            'INSERT INTO user_sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
            [$userId, $token, $expiresAt]
        );
        return $token;
    }

    public function findUserByToken(string $token): ?User
    {
        $row = $this->db->fetchOne(
            'SELECT u.id,u.name,u.email,u.avatar,u.bio,u.role,u.is_active,u.created_at
             FROM user_sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.token = ? AND s.expires_at > NOW() AND u.is_active = 1',
            [$token]
        );
        return $row ? User::fromRow($row) : null;
    }

    public function deleteSession(string $token): void
    {
        $this->db->execute(
            'DELETE FROM user_sessions WHERE token = ?',
            [$token]
        );
    }

    /** Destroy all sessions for a user (force logout everywhere). */
    public function deleteAllSessions(int $userId): void
    {
        $this->db->execute('DELETE FROM user_sessions WHERE user_id = ?', [$userId]);
    }

    public function deleteExpiredSessions(): int
    {
        return $this->db->execute('DELETE FROM user_sessions WHERE expires_at < NOW()');
    }

    /** Alias kept for backwards compatibility with Auth.php pre-v5. */
    public function validateSession(string $token): ?User
    {
        return $this->findUserByToken($token);
    }

    /** Count active admin accounts (used to prevent de-admining the last admin). */
    public function countAdmins(): int
    {
        return (int)$this->db->fetchScalar(
            "SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1"
        );
    }
}
