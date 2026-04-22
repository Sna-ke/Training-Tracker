-- ============================================================
--  schema_v3.sql  —  Migration: add description to exercises
--  Run ONCE on existing installs:
--    mysql -u root -p training_plan < schema_v3.sql
-- ============================================================
USE `training_plan`;

ALTER TABLE `exercises`
  ADD COLUMN `description` TEXT NULL
  AFTER `name`;
