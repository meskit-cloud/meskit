-- Migration 010: Scope units.serial_number uniqueness per user
-- The global UNIQUE constraint on serial_number causes collisions when multiple
-- users happen to use the same serial prefix (e.g. both configure prefix "SN").
-- Replace it with a composite (user_id, serial_number) unique constraint.

ALTER TABLE units
  DROP CONSTRAINT units_serial_number_key;

ALTER TABLE units
  ADD CONSTRAINT units_user_id_serial_number_key UNIQUE (user_id, serial_number);
