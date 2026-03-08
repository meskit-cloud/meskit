-- Migration: M4 — Replace 3-state machine_status enum with 7-state PackML subset (ISA-88 aligned)
--
-- Old values: idle | running | down
-- New values: STOPPED | IDLE | EXECUTE | HELD | SUSPENDED | COMPLETE | ABORTED
--
-- Data migration mapping:
--   idle    → IDLE      (machine is powered and waiting for work)
--   running → EXECUTE   (machine is actively processing)
--   down    → ABORTED   (machine stopped due to fault)
--
-- Strategy:
--   1. Create new enum type (machine_status_new)
--   2. Drop column default (references old type)
--   3. Migrate data + change column type
--   4. Drop old enum type
--   5. Rename new enum to original name (machine_status)
--   6. Restore column default

-- Step 1: Create the new 7-state PackML enum
CREATE TYPE machine_status_new AS ENUM (
  'STOPPED',
  'IDLE',
  'EXECUTE',
  'HELD',
  'SUSPENDED',
  'COMPLETE',
  'ABORTED'
);

-- Step 2: Drop the column default (it references the old type and must be removed first)
ALTER TABLE machines ALTER COLUMN status DROP DEFAULT;

-- Step 3: Migrate existing data and change column type
ALTER TABLE machines
  ALTER COLUMN status TYPE machine_status_new
  USING (
    CASE status::text
      WHEN 'idle'    THEN 'IDLE'::machine_status_new
      WHEN 'running' THEN 'EXECUTE'::machine_status_new
      WHEN 'down'    THEN 'ABORTED'::machine_status_new
      ELSE 'IDLE'::machine_status_new
    END
  );

-- Step 4: Drop the old 3-state enum
DROP TYPE machine_status;

-- Step 5: Rename new enum back to the canonical name
ALTER TYPE machine_status_new RENAME TO machine_status;

-- Step 6: Restore default — new machines start in IDLE
ALTER TABLE machines ALTER COLUMN status SET DEFAULT 'IDLE';
