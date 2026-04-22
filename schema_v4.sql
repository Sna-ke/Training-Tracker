-- ============================================================
--  schema_v4.sql  —  User authentication and ownership
--
--  Run on a FRESH database (after schema.sql + schema_media.sql
--  + schema_builder.sql + schema_v3.sql):
--
--    mysql -u root -p training_plan < schema_v4.sql
--
--  Then run seed_admin.php to create the first admin account
--  and re-import sub20_5k.json via plans.php.
-- ============================================================
USE `training_plan`;

-- ── Users ─────────────────────────────────────────────────────

CREATE TABLE `users` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(200) NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255)          DEFAULT NULL,
  `apple_sub`     VARCHAR(255)          DEFAULT NULL COMMENT 'Sign in with Apple subject — stub for future use',
  `role`          ENUM('admin','user')  NOT NULL DEFAULT 'user',
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email`     (`email`),
  UNIQUE KEY `uq_apple_sub` (`apple_sub`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Sessions (DB-stored, scales horizontally) ─────────────────

CREATE TABLE `user_sessions` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `user_id`    INT          NOT NULL,
  `token`      VARCHAR(64)  NOT NULL,
  `expires_at` TIMESTAMP    NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_token` (`token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Add ownership columns to existing tables ──────────────────

-- Exercises: NULL created_by = global (admin-managed, visible to all)
ALTER TABLE `exercises`
  ADD COLUMN `created_by` INT NULL DEFAULT NULL
    COMMENT 'NULL = global admin exercise visible to all'
    AFTER `unit_type`,
  ADD COLUMN `is_public` TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '1 = visible to all users; 0 = private to creator'
    AFTER `created_by`,
  ADD CONSTRAINT `fk_exercises_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD KEY `idx_exercises_created_by` (`created_by`);

-- Plan templates: NULL created_by = default/global plan
ALTER TABLE `plan_templates`
  ADD COLUMN `created_by`   INT          NULL DEFAULT NULL
    COMMENT 'NULL = global default plan'
    AFTER `total_weeks`,
  ADD COLUMN `is_published` TINYINT(1)   NOT NULL DEFAULT 0
    COMMENT '1 = visible to all users as a start-from option'
    AFTER `created_by`,
  ADD CONSTRAINT `fk_templates_user`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD KEY `idx_templates_created_by` (`created_by`);

-- Mark all global templates (created_by IS NULL) as published so they're visible to users.
-- Re-run this any time after importing a new global plan to ensure it's visible.
UPDATE `plan_templates` SET `is_published` = 1 WHERE `created_by` IS NULL;

-- Journeys always belong to a user
ALTER TABLE `training_plans`
  ADD COLUMN `user_id` INT NOT NULL
    COMMENT 'Owner of this journey'
    AFTER `id`,
  ADD CONSTRAINT `fk_plans_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD KEY `idx_plans_user_id` (`user_id`);

-- ── Session cleanup event (optional, requires EVENT privilege) ─
-- CREATE EVENT IF NOT EXISTS `purge_old_sessions`
--   ON SCHEDULE EVERY 1 HOUR
--   DO DELETE FROM `user_sessions` WHERE `expires_at` < NOW();

-- ── Fix for existing installs that imported plans before this schema ─────────
-- If you imported sub20_5k.json before running schema_v4.sql, run this:
-- UPDATE `plan_templates` SET `is_published` = 1 WHERE `created_by` IS NULL;
