-- ============================================================
-- BabySync: ПОЛНАЯ миграция baby_id (единый скрипт)
-- Заменяет supabase_baby_id_migration.sql и _fix.sql
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- STEP 0: Удалить ВСЕ auto-created FK constraints на baby_id
-- (могли остаться от предыдущей попытки)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.constraint_name LIKE '%baby_id%'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped FK: %.%', r.table_name, r.constraint_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 1: Добавить baby_id в baby_profile
-- ═══════════════════════════════════════════════════════════

ALTER TABLE baby_profile ADD COLUMN IF NOT EXISTS baby_id uuid DEFAULT gen_random_uuid();
UPDATE baby_profile SET baby_id = gen_random_uuid() WHERE baby_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_baby_profile_baby_id ON baby_profile (baby_id);

-- ═══════════════════════════════════════════════════════════
-- STEP 2: Добавить baby_id во ВСЕ data-таблицы
-- Используем простой ALTER без FK constraint!
-- ═══════════════════════════════════════════════════════════

ALTER TABLE feedings       ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE sleeps         ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE diapers        ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE walks          ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE tasks          ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE growth_records ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE medications    ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE vaccinations   ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE doctor_visits  ADD COLUMN IF NOT EXISTS baby_id uuid;
ALTER TABLE shifts         ADD COLUMN IF NOT EXISTS baby_id uuid;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_feedings_baby_id       ON feedings (baby_id);
CREATE INDEX IF NOT EXISTS idx_sleeps_baby_id         ON sleeps (baby_id);
CREATE INDEX IF NOT EXISTS idx_diapers_baby_id        ON diapers (baby_id);
CREATE INDEX IF NOT EXISTS idx_walks_baby_id          ON walks (baby_id);
CREATE INDEX IF NOT EXISTS idx_tasks_baby_id          ON tasks (baby_id);
CREATE INDEX IF NOT EXISTS idx_growth_records_baby_id ON growth_records (baby_id);
CREATE INDEX IF NOT EXISTS idx_medications_baby_id    ON medications (baby_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_baby_id   ON vaccinations (baby_id);
CREATE INDEX IF NOT EXISTS idx_doctor_visits_baby_id  ON doctor_visits (baby_id);
CREATE INDEX IF NOT EXISTS idx_shifts_baby_id         ON shifts (baby_id);

-- ═══════════════════════════════════════════════════════════
-- STEP 3: Снова удалить auto-FK (ALTER ADD COLUMN может
-- создать FK если Supabase обнаружит matching имя)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.constraint_name LIKE '%baby_id%'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped auto-FK: %.%', r.table_name, r.constraint_name;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 4: Backfill baby_id из baby_profile
-- ═══════════════════════════════════════════════════════════

UPDATE feedings       SET baby_id = bp.baby_id FROM baby_profile bp WHERE feedings.user_id       = bp.user_id AND feedings.baby_id IS NULL;
UPDATE sleeps         SET baby_id = bp.baby_id FROM baby_profile bp WHERE sleeps.user_id         = bp.user_id AND sleeps.baby_id IS NULL;
UPDATE diapers        SET baby_id = bp.baby_id FROM baby_profile bp WHERE diapers.user_id        = bp.user_id AND diapers.baby_id IS NULL;
UPDATE walks          SET baby_id = bp.baby_id FROM baby_profile bp WHERE walks.user_id          = bp.user_id AND walks.baby_id IS NULL;
UPDATE tasks          SET baby_id = bp.baby_id FROM baby_profile bp WHERE tasks.user_id          = bp.user_id AND tasks.baby_id IS NULL;
UPDATE growth_records SET baby_id = bp.baby_id FROM baby_profile bp WHERE growth_records.user_id = bp.user_id AND growth_records.baby_id IS NULL;
UPDATE medications    SET baby_id = bp.baby_id FROM baby_profile bp WHERE medications.user_id    = bp.user_id AND medications.baby_id IS NULL;
UPDATE vaccinations   SET baby_id = bp.baby_id FROM baby_profile bp WHERE vaccinations.user_id   = bp.user_id AND vaccinations.baby_id IS NULL;
UPDATE doctor_visits  SET baby_id = bp.baby_id FROM baby_profile bp WHERE doctor_visits.user_id  = bp.user_id AND doctor_visits.baby_id IS NULL;
UPDATE shifts         SET baby_id = bp.baby_id FROM baby_profile bp WHERE shifts.user_id         = bp.user_id AND shifts.baby_id IS NULL;

-- Для записей без user_id — fallback
UPDATE feedings       SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE sleeps         SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE diapers        SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE walks          SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE tasks          SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE growth_records SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE medications    SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE vaccinations   SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE doctor_visits  SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;
UPDATE shifts         SET baby_id = (SELECT baby_id FROM baby_profile LIMIT 1) WHERE baby_id IS NULL;

-- ═══════════════════════════════════════════════════════════
-- STEP 5: Обновить RLS политики → baby_id-based
-- ═══════════════════════════════════════════════════════════

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

        -- Drop old policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can read own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family read" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family insert" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family update" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Baby family delete" ON %I', tbl);

        EXECUTE format(
            'CREATE POLICY "Baby family read" ON %I FOR SELECT TO authenticated USING (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );
        EXECUTE format(
            'CREATE POLICY "Baby family insert" ON %I FOR INSERT TO authenticated WITH CHECK (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );
        EXECUTE format(
            'CREATE POLICY "Baby family update" ON %I FOR UPDATE TO authenticated USING (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid())) WITH CHECK (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );
        EXECUTE format(
            'CREATE POLICY "Baby family delete" ON %I FOR DELETE TO authenticated USING (baby_id IN (SELECT baby_id FROM baby_profile WHERE user_id = auth.uid()))',
            tbl
        );

        RAISE NOTICE 'RLS updated for: %', tbl;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════
-- STEP 6: Проверка
-- ═══════════════════════════════════════════════════════════

-- Столбцы baby_id
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'baby_id'
ORDER BY table_name;

-- FK constraints (должен быть пустой!)
SELECT tc.table_name, tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.constraint_name LIKE '%baby_id%';

-- RLS
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND policyname LIKE 'Baby family%'
ORDER BY tablename, cmd;

-- Backfill check
SELECT 'feedings' as tbl, count(*) as total, count(baby_id) as with_baby_id FROM feedings
UNION ALL SELECT 'sleeps', count(*), count(baby_id) FROM sleeps
UNION ALL SELECT 'diapers', count(*), count(baby_id) FROM diapers
UNION ALL SELECT 'walks', count(*), count(baby_id) FROM walks
UNION ALL SELECT 'tasks', count(*), count(baby_id) FROM tasks
UNION ALL SELECT 'shifts', count(*), count(baby_id) FROM shifts;
