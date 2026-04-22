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
    ) {}

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
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
        );
    }
}
