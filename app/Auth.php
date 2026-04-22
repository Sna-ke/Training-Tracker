<?php
namespace App;

use App\Models\User;
use App\Repositories\UserRepository;

// ============================================================
//  Auth — authentication helpers
//
//  All page controllers call one of:
//    Auth::require()       — must be logged in (any role)
//    Auth::requireAdmin()  — must be logged in AND admin
//
//  Neither uses PHP sessions; the token travels in a cookie
//  and is validated against user_sessions in the DB.
// ============================================================
final class Auth
{
    private const COOKIE_NAME = 'tt_sess';
    private const COOKIE_DAYS = 30;

    private static ?User $cache = null;

    // ── Public API ─────────────────────────────────────────────

    /**
     * Return the current User, or null if not authenticated.
     * Result is cached for the lifetime of the request.
     */
    public static function user(): ?User
    {
        if (self::$cache !== null) return self::$cache;

        $token = $_COOKIE[self::COOKIE_NAME] ?? null;
        if (!$token) return null;

        $db      = Database::getInstance();
        $userRepo = new UserRepository($db);
        self::$cache = $userRepo->validateSession($token);
        return self::$cache;
    }

    /**
     * Require authentication — redirects to login.php if not logged in.
     * Returns the current User on success.
     */
    public static function require(): User
    {
        $user = self::user();
        if (!$user) {
            $dest = urlencode($_SERVER['REQUEST_URI'] ?? '');
            // Compute basePath from script location
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/\\');
        $appBase   = ($scriptDir === '' || $scriptDir === '.') ? '/' : $scriptDir . '/';
        // If in admin/ subdirectory, go up one level
        if (str_ends_with(rtrim($appBase, '/'), '/admin')) {
            $appBase = dirname(rtrim($appBase, '/')) . '/';
        }
        header("Location: {$appBase}login.php?next={$dest}");
            exit;
        }
        return $user;
    }

    /**
     * Require admin role — redirects to login.php or 403 if insufficient.
     */
    public static function requireAdmin(): User
    {
        $user = self::require();
        if (!$user->isAdmin()) {
            http_response_code(403);
            require __DIR__ . '/../layout/header.php';
            echo '<div class="wrap" style="padding:2rem;text-align:center;color:var(--t3)">Access denied.</div>';
            require __DIR__ . '/../layout/footer.php';
            exit;
        }
        return $user;
    }

    /**
     * Create a session for the given user, set the cookie.
     */
    public static function login(int $userId): void
    {
        $db      = Database::getInstance();
        $userRepo = new UserRepository($db);
        $token   = $userRepo->createSession($userId, self::COOKIE_DAYS);

        setcookie(
            self::COOKIE_NAME,
            $token,
            [
                'expires'  => time() + self::COOKIE_DAYS * 86400,
                'path'     => '/',
                'httponly' => true,
                'samesite' => 'Lax',
                'secure'   => isset($_SERVER['HTTPS']),
            ]
        );

        self::$cache = null; // bust cache
    }

    /**
     * Destroy the current session and clear the cookie.
     */
    public static function logout(): void
    {
        $token = $_COOKIE[self::COOKIE_NAME] ?? null;
        if ($token) {
            $db      = Database::getInstance();
            $userRepo = new UserRepository($db);
            $userRepo->deleteSession($token);
        }

        setcookie(self::COOKIE_NAME, '', [
            'expires'  => time() - 3600,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => isset($_SERVER['HTTPS']),
        ]);

        self::$cache = null;
    }

    /** Is the current request from an admin? */
    public static function isAdmin(): bool
    {
        return self::user()?->isAdmin() ?? false;
    }
}
