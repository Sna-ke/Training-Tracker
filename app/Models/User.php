<?php
namespace App\Models;

// ============================================================
//  User — immutable value object representing an authenticated user
// ============================================================
final class User
{
    public function __construct(
        public readonly int     $id,
        public readonly string  $name,
        public readonly string  $email,
        public readonly string  $role,       // 'admin' | 'user'
        public readonly bool    $isActive,
        public readonly string  $createdAt,
        public readonly ?string $avatar  = null,
        public readonly ?string $bio     = null,
    ) {}

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * Returns the avatar string if set, otherwise falls back to the
     * first initial of the user's name (uppercased).
     */
    public function displayAvatar(): string
    {
        return $this->avatar ?: strtoupper(substr($this->name, 0, 1));
    }

    /**
     * True when the avatar is a single emoji/character rather than initials.
     */
    public function hasCustomAvatar(): bool
    {
        return $this->avatar !== null && $this->avatar !== '';
    }

    public function toArray(): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'email'      => $this->email,
            'role'       => $this->role,
            'is_active'  => $this->isActive,
            'created_at' => $this->createdAt,
            'avatar'     => $this->avatar,
            'bio'        => $this->bio,
        ];
    }

    public static function fromRow(array $row): self
    {
        return new self(
            id:        (int)$row['id'],
            name:      $row['name'],
            email:     $row['email'],
            role:      $row['role'],
            isActive:  (bool)$row['is_active'],
            createdAt: $row['created_at'],
            avatar:    $row['avatar']   ?? null,
            bio:       $row['bio']      ?? null,
        );
    }
}
