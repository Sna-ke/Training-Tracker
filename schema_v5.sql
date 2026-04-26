-- ============================================================
--  schema_v5.sql  —  User profile fields (avatar, bio)
--
--  Run after schema_v4.sql:
--    mysql -u root -p training_plan < schema_v5.sql
-- ============================================================
USE `training_plan`;

ALTER TABLE `users`
  ADD COLUMN `avatar`  VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'Emoji character or initials-based avatar identifier'
    AFTER `email`,
  ADD COLUMN `bio`     TEXT         NULL DEFAULT NULL
    COMMENT 'Short user bio / description'
    AFTER `avatar`;
