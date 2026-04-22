-- ============================================================
--  schema_media.sql  —  Migration: add exercise_media table
--  Run ONCE on existing installs:
--    mysql -u root -p training_plan < schema_media.sql
--
--  Already included in a fresh schema.sql run — skip if new install.
-- ============================================================

USE `training_plan`;

CREATE TABLE IF NOT EXISTS `exercise_media` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `exercise_id`  INT UNSIGNED NOT NULL,
  `media_type`   ENUM('video','image','audio_link','app_link') NOT NULL DEFAULT 'video',
  `source`       VARCHAR(50)   NOT NULL DEFAULT 'youtube'
                   COMMENT 'youtube | vimeo | nike_nrc | web | image_url',
  `url`          VARCHAR(1000) NOT NULL,
  `label`        VARCHAR(200)  NOT NULL,
  `sort_order`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE CASCADE,
  KEY `idx_ex_media` (`exercise_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Also add to schema.sql fresh installs ────────────────────
-- (already added in the updated schema.sql below; this file is
--  only for upgrading an existing database)
