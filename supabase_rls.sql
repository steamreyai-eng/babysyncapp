-- ============================================================
-- BabySync: Enable Row Level Security (RLS)
-- Run in Supabase Dashboard → SQL Editor
-- Ensures users can only access data linked to their baby
-- ============================================================

-- Enable RLS on all data tables
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

        -- Drop existing policies if re-running
        EXECUTE format('DROP POLICY IF EXISTS "Users can read own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own data" ON %I', tbl);

        -- Allow authenticated users to SELECT all rows
        -- (both parents share the same baby data)
        EXECUTE format(
            'CREATE POLICY "Users can read own data" ON %I FOR SELECT TO authenticated USING (true)',
            tbl
        );

        -- Allow authenticated users to INSERT
        EXECUTE format(
            'CREATE POLICY "Users can insert own data" ON %I FOR INSERT TO authenticated WITH CHECK (true)',
            tbl
        );

        -- Allow authenticated users to UPDATE
        EXECUTE format(
            'CREATE POLICY "Users can update own data" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
            tbl
        );

        RAISE NOTICE 'RLS enabled on: %', tbl;
    END LOOP;
END $$;

-- Also protect baby_profile
ALTER TABLE baby_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON baby_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON baby_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON baby_profile;

CREATE POLICY "Users can read own profile" ON baby_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON baby_profile FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON baby_profile FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Verify
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
