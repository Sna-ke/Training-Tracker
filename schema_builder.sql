-- ============================================================
--  schema_builder.sql  —  Migration: expand exercise categories
--  Run ONCE on existing installs:
--    mysql -u root -p training_plan < schema_builder.sql
--  (Skip if doing a fresh install — schema.sql already includes this)
-- ============================================================
USE `training_plan`;

ALTER TABLE `exercises`
  MODIFY `category` ENUM('strength','run','mobility','cardio','stretching','yoga')
  NOT NULL DEFAULT 'strength';
