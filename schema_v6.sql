-- =============================================================
--  schema_v6.sql — Profiles: privacy settings & coach relationships
--  Apply after schema_v5.sql
-- =============================================================
USE `training_plan`;

-- Add 'coach' to the role enum
ALTER TABLE `users`
    MODIFY COLUMN `role` ENUM('admin','user','athlete','coach') NOT NULL DEFAULT 'user';

-- ── user_privacy_settings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_privacy_settings` (
    `user_id`             INT          NOT NULL PRIMARY KEY,
    `share_journeys`      TINYINT(1)   NOT NULL DEFAULT 0,
    `share_exercise_logs` TINYINT(1)   NOT NULL DEFAULT 0,
    `share_status`        TINYINT(1)   NOT NULL DEFAULT 0,
    `updated_at`          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ups_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── user_coaches ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `user_coaches` (
    `id`          INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `athlete_id`  INT          NOT NULL,
    `coach_id`    INT          NOT NULL,
    `status`      ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
    `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_athlete_coach` (`athlete_id`, `coach_id`),
    CONSTRAINT `fk_uc_athlete` FOREIGN KEY (`athlete_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_uc_coach`   FOREIGN KEY (`coach_id`)   REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
