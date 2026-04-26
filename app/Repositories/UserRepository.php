<?php
namespace App\Repositories;

use App\Models\User;

// ============================================================
//  UserRepository — all SQL for users, user_sessions,
//                   user_privacy_settings, user_coaches
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

    /** All active users with the 'coach' role — for the coach-invite picker. */
    public function findCoaches(): array
    {
        $rows = $this->db->fetchAll(
            "SELECT id,name,email,avatar,bio,role,is_active,created_at
             FROM users WHERE role='coach' AND is_active=1 ORDER BY name"
        );
        return array_map(User::fromRow(...), $rows);
    }

    // ── Mutations ──────────────────────────────────────────────

    public function create(
        string $name,
        string $email,
        string $passwordHash,
        string $role = 'user',
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

    // ── Privacy settings ───────────────────────────────────────

    /** Get sharing preferences for a user (returns defaults if not set). */
    public function getPrivacySettings(int $userId): array
    {
        $row = $this->db->fetchOne(
            'SELECT share_journeys, share_exercise_logs, share_status
             FROM user_privacy_settings WHERE user_id = ?',
            [$userId]
        );
        return $row ?? [
            'share_journeys'      => 0,
            'share_exercise_logs' => 0,
            'share_status'        => 0,
        ];
    }

    /** Upsert sharing preferences for a user. */
    public function savePrivacySettings(
        int  $userId,
        bool $shareJourneys,
        bool $shareExerciseLogs,
        bool $shareStatus,
    ): void {
        $this->db->execute('
            INSERT INTO user_privacy_settings
                (user_id, share_journeys, share_exercise_logs, share_status)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                share_journeys=VALUES(share_journeys),
                share_exercise_logs=VALUES(share_exercise_logs),
                share_status=VALUES(share_status)
        ', [$userId, (int)$shareJourneys, (int)$shareExerciseLogs, (int)$shareStatus]);
    }

    // ── Coach relationships ────────────────────────────────────

    /** Get all coach relationships for an athlete (with coach user details). */
    public function getCoachesForAthlete(int $athleteId): array
    {
        return $this->db->fetchAll('
            SELECT uc.id, uc.coach_id, uc.status, uc.created_at,
                   u.name AS coach_name, u.avatar AS coach_avatar, u.email AS coach_email
            FROM user_coaches uc
            JOIN users u ON u.id = uc.coach_id
            WHERE uc.athlete_id = ?
            ORDER BY uc.created_at DESC
        ', [$athleteId]);
    }

    /** Invite a coach (creates a pending relationship; ignores duplicates). */
    public function inviteCoach(int $athleteId, int $coachId): void
    {
        $this->db->execute(
            "INSERT IGNORE INTO user_coaches (athlete_id, coach_id, status) VALUES (?, ?, 'pending')",
            [$athleteId, $coachId]
        );
    }

    /** Remove a coach relationship entirely. */
    public function removeCoach(int $athleteId, int $coachId): void
    {
        $this->db->execute(
            'DELETE FROM user_coaches WHERE athlete_id=? AND coach_id=?',
            [$athleteId, $coachId]
        );
    }

    // ── Recent activity (for public profile) ──────────────────

    /**
     * Fetch recent journeys and exercise logs for a user.
     * Privacy gating is handled by the caller (view_profile.php).
     */
    public function getRecentActivity(int $userId, int $limit = 10): array
    {
        $journeys = $this->db->fetchAll('
            SELECT tp.id, tp.name AS plan_name,
                   pt.name AS template_name, pt.total_weeks,
                   COALESCE(SUM(pd.completed),0) AS days_done,
                   COUNT(CASE WHEN pd.is_rest=0 THEN 1 END) AS days_total
            FROM training_plans tp
            JOIN plan_templates pt ON tp.plan_template_id = pt.id
            LEFT JOIN plan_days pd ON pd.training_plan_id = tp.id
            WHERE tp.user_id = ?
            GROUP BY tp.id
            ORDER BY tp.created_at DESC
            LIMIT 5
        ', [$userId]);

        $logs = $this->db->fetchAll('
            SELECT el.exercise_id, e.name AS exercise_name,
                   el.sets_done, el.reps_done, el.weight_kg,
                   el.distance_km, el.duration_min, el.pace_per_km,
                   pd.scheduled_date
            FROM exercise_logs el
            JOIN plan_days pd ON pd.id = el.plan_day_id
            JOIN training_plans tp ON tp.id = pd.training_plan_id
            JOIN exercises e ON e.id = el.exercise_id
            WHERE tp.user_id = ?
            ORDER BY pd.scheduled_date DESC
            LIMIT ?
        ', [$userId, $limit]);

        return [
            'journeys'      => $journeys,
            'exercise_logs' => $logs,
        ];
    }

    /**
     * Compute consecutive active training days up to today.
     */
    public function getConsecutiveDays(int $userId): int
    {
        $rows = $this->db->fetchAll('
            SELECT DISTINCT DATE(completed_at) AS day
            FROM plan_days
            WHERE training_plan_id IN (
                SELECT id FROM training_plans WHERE user_id = ?
            )
            AND completed = 1 AND completed_at IS NOT NULL
            ORDER BY day DESC
        ', [$userId]);

        if (!$rows) return 0;

        $streak  = 0;
        $current = new \DateTime('today');

        foreach ($rows as $r) {
            $day  = new \DateTime($r['day']);
            $diff = (int)$current->diff($day)->days;
            if ($diff > 1) break;
            $streak++;
            $current = $day;
        }

        return $streak;
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
        $this->db->execute('DELETE FROM user_sessions WHERE token = ?', [$token]);
    }

    public function deleteAllSessions(int $userId): void
    {
        $this->db->execute('DELETE FROM user_sessions WHERE user_id = ?', [$userId]);
    }

    public function deleteExpiredSessions(): int
    {
        return $this->db->execute('DELETE FROM user_sessions WHERE expires_at < NOW()');
    }

    public function validateSession(string $token): ?User
    {
        return $this->findUserByToken($token);
    }

    public function countAdmins(): int
    {
        return (int)$this->db->fetchScalar(
            "SELECT COUNT(*) FROM users WHERE role='admin' AND is_active=1"
        );
    }
}
