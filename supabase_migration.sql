-- ============================================================
-- BabySync: Full Supabase Schema Audit + Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════
-- STEP 1: Create missing tables
-- ═══════════════════════════════════════════════════════

-- vaccinations — used by web + mobile but missing in Supabase
CREATE TABLE IF NOT EXISTS vaccinations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vaccine_name text NOT NULL,
    date_given text,
    recorded_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz DEFAULT NULL
);

-- ═══════════════════════════════════════════════════════
-- STEP 2: Add missing columns to existing tables
-- ═══════════════════════════════════════════════════════

-- shifts: missing created_at
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ═══════════════════════════════════════════════════════
-- STEP 3: Auto-update trigger function
-- ═══════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ═══════════════════════════════════════════════════════
-- STEP 4: Add updated_at + deleted_at + triggers
-- ═══════════════════════════════════════════════════════

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts'
    ];
    table_exists BOOLEAN;
    has_created_at BOOLEAN;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) INTO table_exists;

        IF NOT table_exists THEN
            RAISE NOTICE 'SKIP: % (not found)', tbl;
            CONTINUE;
        END IF;

        -- Add sync columns
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL', tbl);

        -- Backfill updated_at from created_at (if exists)
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'created_at'
        ) INTO has_created_at;

        IF has_created_at THEN
            EXECUTE format('UPDATE %I SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL', tbl);
        ELSE
            EXECUTE format('UPDATE %I SET updated_at = now() WHERE updated_at IS NULL', tbl);
        END IF;

        -- Auto-update trigger
        EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', tbl);
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl
        );

        RAISE NOTICE 'OK: %', tbl;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════
-- STEP 5: Verify — show what was added
-- ═══════════════════════════════════════════════════════

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
    'growth_records', 'medications', 'vaccinations',
    'doctor_visits', 'shifts'
  )
  AND column_name IN ('updated_at', 'deleted_at', 'created_at')
ORDER BY table_name, column_name;
