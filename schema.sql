-- ============================================================
--  schema.sql  —  Normalized Training Plan Tracker v2
--  Run once:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `training_plan`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `training_plan`;

-- ── Atomic exercise catalog ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `exercises` (
  `id`        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug`      VARCHAR(80)  NOT NULL UNIQUE,
  `name`      VARCHAR(200) NOT NULL,
  `category`  ENUM('strength','run','mobility') NOT NULL DEFAULT 'strength',
  `unit_type` ENUM('reps','seconds','distance','duration') NOT NULL DEFAULT 'reps',
  `notes`     TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Workout type definitions ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `workout_types` (
  `id`        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug`      VARCHAR(80)  NOT NULL UNIQUE,
  `name`      VARCHAR(150) NOT NULL,
  `type_code` VARCHAR(50)  NOT NULL,
  `color`     CHAR(7)      NOT NULL DEFAULT '#38bdf8',
  `phase`     TINYINT UNSIGNED NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Items belonging to a workout type ────────────────────────
CREATE TABLE IF NOT EXISTS `workout_items` (
  `id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workout_type_id`      INT UNSIGNED NOT NULL,
  `exercise_id`          INT UNSIGNED NULL,
  `item_role`            ENUM('main','warmup','cooldown','instruction') NOT NULL DEFAULT 'main',
  `planned_sets`         TINYINT UNSIGNED NULL,
  `planned_reps`         SMALLINT UNSIGNED NULL,
  `planned_weight_kg`    DECIMAL(6,2) NULL,
  `planned_distance_km`  DECIMAL(5,2) NULL,
  `planned_duration_min` DECIMAL(5,1) NULL,
  `item_note`            VARCHAR(500) NULL,
  `sort_order`           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (`workout_type_id`) REFERENCES `workout_types`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`exercise_id`)     REFERENCES `exercises`(`id`),
  KEY `idx_wt` (`workout_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Plan templates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plan_templates` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`        VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `total_weeks` TINYINT UNSIGNED NOT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Day slots in a template ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `plan_template_days` (
  `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `plan_template_id`      INT UNSIGNED NOT NULL,
  `week_number`           TINYINT UNSIGNED NOT NULL,
  `day_of_week`           TINYINT UNSIGNED NOT NULL,
  `workout_type_id`       INT UNSIGNED NULL,
  `is_rest`               TINYINT(1) NOT NULL DEFAULT 0,
  `override_sets`         TINYINT UNSIGNED NULL,
  `override_distance_km`  DECIMAL(5,2) NULL,
  `override_duration_min` DECIMAL(5,1) NULL,
  `override_notes`        VARCHAR(500) NULL,
  FOREIGN KEY (`plan_template_id`) REFERENCES `plan_templates`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`workout_type_id`)  REFERENCES `workout_types`(`id`),
  UNIQUE KEY `uk_ptd` (`plan_template_id`,`week_number`,`day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Training plan instances ───────────────────────────────────
CREATE TABLE IF NOT EXISTS `training_plans` (
  `id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `plan_template_id` INT UNSIGNED NOT NULL,
  `name`             VARCHAR(200) NOT NULL,
  `start_date`       DATE NOT NULL,
  `athlete_name`     VARCHAR(100) NULL,
  `notes`            TEXT NULL,
  `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`plan_template_id`) REFERENCES `plan_templates`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Scheduled days (generated on plan creation) ───────────────
CREATE TABLE IF NOT EXISTS `plan_days` (
  `id`                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `training_plan_id`     INT UNSIGNED NOT NULL,
  `plan_template_day_id` INT UNSIGNED NOT NULL,
  `week_number`          TINYINT UNSIGNED NOT NULL,
  `day_of_week`          TINYINT UNSIGNED NOT NULL,
  `workout_type_id`      INT UNSIGNED NULL,
  `is_rest`              TINYINT(1) NOT NULL DEFAULT 0,
  `original_date`        DATE NOT NULL,
  `scheduled_date`       DATE NOT NULL,
  `completed`            TINYINT(1) NOT NULL DEFAULT 0,
  `skipped`              TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at`         DATETIME NULL,
  `day_notes`            TEXT NULL,
  FOREIGN KEY (`training_plan_id`)     REFERENCES `training_plans`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`plan_template_day_id`) REFERENCES `plan_template_days`(`id`),
  FOREIGN KEY (`workout_type_id`)      REFERENCES `workout_types`(`id`),
  INDEX `idx_plan_sched` (`training_plan_id`,`scheduled_date`),
  INDEX `idx_plan_week`  (`training_plan_id`,`week_number`,`day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Exercise performance logs ─────────────────────────────────
CREATE TABLE IF NOT EXISTS `exercise_logs` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `plan_day_id`     INT UNSIGNED NOT NULL,
  `workout_item_id` INT UNSIGNED NOT NULL,
  `exercise_id`     INT UNSIGNED NOT NULL,
  `sets_done`       TINYINT UNSIGNED NULL,
  `reps_done`       SMALLINT UNSIGNED NULL,
  `weight_kg`       DECIMAL(6,2) NULL,
  `distance_km`     DECIMAL(5,2) NULL,
  `duration_min`    DECIMAL(5,1) NULL,
  `pace_per_km`     DECIMAL(5,2) NULL,
  `heart_rate_avg`  SMALLINT UNSIGNED NULL,
  `notes`           VARCHAR(500) NULL,
  `logged_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`plan_day_id`)     REFERENCES `plan_days`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`workout_item_id`) REFERENCES `workout_items`(`id`),
  FOREIGN KEY (`exercise_id`)     REFERENCES `exercises`(`id`),
  UNIQUE KEY `uk_log`       (`plan_day_id`,`workout_item_id`),
  KEY `idx_exercise_hist`   (`exercise_id`,`plan_day_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Progression view ──────────────────────────────────────────
CREATE OR REPLACE VIEW `v_exercise_progress` AS
SELECT
  el.exercise_id,  e.name AS exercise_name, e.slug AS exercise_slug,
  tp.id AS plan_id, tp.name AS plan_name,
  pd.week_number, pd.scheduled_date, pd.day_of_week,
  COALESCE(ptd.override_sets,         wi.planned_sets)         AS eff_sets,
  COALESCE(ptd.override_distance_km,  wi.planned_distance_km)  AS eff_distance_km,
  COALESCE(ptd.override_duration_min, wi.planned_duration_min) AS eff_duration_min,
  wi.planned_reps, wi.planned_weight_kg,
  el.sets_done, el.reps_done, el.weight_kg,
  el.distance_km, el.duration_min, el.pace_per_km, el.heart_rate_avg,
  el.notes AS log_notes
FROM exercise_logs el
JOIN plan_days          pd  ON el.plan_day_id          = pd.id
JOIN training_plans     tp  ON pd.training_plan_id     = tp.id
JOIN exercises          e   ON el.exercise_id          = e.id
JOIN workout_items      wi  ON el.workout_item_id      = wi.id
JOIN plan_template_days ptd ON pd.plan_template_day_id = ptd.id
ORDER BY tp.id, pd.scheduled_date;
