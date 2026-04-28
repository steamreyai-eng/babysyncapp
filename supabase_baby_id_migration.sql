-- ============================================================
-- BabySync: Add baby_id for multi-parent data sharing
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- STEP 1: Add baby_id column to baby_profile (shared identifier)
-- ═══════════════════════════════════════════════════════════

-- baby_id is a UUID that links two parents to the same baby.
-- When a second parent is invited, they get the same baby_id.
ALTER TABLE baby_profile ADD COLUMN IF NOT EXISTS baby_id uuid DEFAULT gen_random_uuid();

-- Backfill: existing profiles get their own baby_id
UPDATE baby_profile SET baby_id = gen_random_uuid() WHERE baby_id IS NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_baby_profile_baby_id ON baby_profile (baby_id);

-- ═══════════════════════════════════════════════════════════
-- STEP 2: Add baby_id to ALL data tables
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts', 'insight_cards'
    ];
    table_exists BOOLEAN;
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

        -- Add baby_id column
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS baby_id uuid', tbl);

        -- Create index
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_baby_id ON %I (baby_id)', tbl, tbl);

        RAISE NOTICE 'baby_id added to: %', tbl;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 3: Backfill baby_id from user's baby_profile
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts', 'insight_cards'
    ];
    table_exists BOOLEAN;
    has_user_id BOOLEAN;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) INTO table_exists;

        IF NOT table_exists THEN CONTINUE; END IF;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'user_id'
        ) INTO has_user_id;

        IF has_user_id THEN
            -- Backfill baby_id from the user's baby_profile
            EXECUTE format(
                'UPDATE %I SET baby_id = bp.baby_id FROM baby_profile bp WHERE %I.user_id = bp.user_id AND %I.baby_id IS NULL',
                tbl, tbl, tbl
            );
        ELSE
            -- No user_id column — set a default baby_id from first profile
            EXECUTE format(
                'UPDATE %I SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL',
                tbl
            );
        END IF;

        RAISE NOTICE 'baby_id backfilled for: %', tbl;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 4: Update RLS policies to use baby_id
-- Both parents linked to the same baby can see all data
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts', 'insight_cards'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

        -- Drop all old policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can read own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family read" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family insert" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family update" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family delete" ON %I', tbl);

        -- SELECT: user can read all rows with matching baby_id
        EXECUTE format(
            'CREATE POLICY "Baby family read" ON %I FOR SELECT TO authenticated USING (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );

        -- INSERT: user can insert rows with their baby_id
        EXECUTE format(
            'CREATE POLICY "Baby family insert" ON %I FOR INSERT TO authenticated WITH CHECK (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );

        -- UPDATE: user can update rows with matching baby_id
        EXECUTE format(
            'CREATE POLICY "Baby family update" ON %I FOR UPDATE TO authenticated USING (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid())) WITH CHECK (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );

        -- DELETE: user can delete rows with matching baby_id
        EXECUTE format(
            'CREATE POLICY "Baby family delete" ON %I FOR DELETE TO authenticated USING (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );

        RAISE NOTICE 'RLS updated for: %', tbl;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 5: Verify
-- ═══════════════════════════════════════════════════════════

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'baby_id'
  AND table_name IN (
    'baby_profile', 'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
    'growth_records', 'medications', 'vaccinations',
    'doctor_visits', 'shifts', 'insight_cards'
  )
ORDER BY table_name;

SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND policyname LIKE 'Baby family%'
ORDER BY tablename, cmd;
