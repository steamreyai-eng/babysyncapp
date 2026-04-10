-- ============================================================
-- BabySync: ФИНАЛЬНЫЙ FIX — точечные исправления
-- Запустить в Supabase Dashboard → SQL Editor
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 1. vaccinations — добавить user_id (ОТСУТСТВУЕТ!)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- Заполнить из baby_profile (для существующих записей)
UPDATE vaccinations SET user_id = (SELECT user_id FROM baby_profile LIMIT 1) WHERE user_id IS NULL;

-- Создать индекс
CREATE INDEX IF NOT EXISTS idx_vaccinations_user_id ON vaccinations (user_id);

-- ═══════════════════════════════════════════════════════════
-- 2. chat_history — добавить user_id (ОТСУТСТВУЕТ!)
-- ═══════════════════════════════════════════════════════════

ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

UPDATE chat_history SET user_id = (SELECT user_id FROM baby_profile LIMIT 1) WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history (user_id);

-- ═══════════════════════════════════════════════════════════
-- 3. tasks — сделать user_id NOT NULL (сейчас nullable)
-- ═══════════════════════════════════════════════════════════

-- Сначала заполнить NULL-записи
UPDATE tasks SET user_id = (SELECT user_id FROM baby_profile LIMIT 1) WHERE user_id IS NULL;

-- Теперь делаем NOT NULL (если есть записи с NULL — они уже заполнены выше)
-- ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL;
-- ^ раскомментировать после проверки что нет NULL записей

-- ═══════════════════════════════════════════════════════════
-- 4. RLS политики — обновить ВСЕ таблицы BabySync
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'feedings', 'sleeps', 'diapers', 'walks', 'tasks',
        'growth_records', 'medications', 'vaccinations',
        'doctor_visits', 'shifts', 'chat_history'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Включить RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

        -- Удалить старые политики (USING(true))
        EXECUTE format('DROP POLICY IF EXISTS "Users can read own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can insert own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can update own data" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Users can delete own data" ON %I', tbl);
        -- Удалить и другие возможные старые политики
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated read" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated insert" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated update" ON %I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated delete" ON %I', tbl);

        -- SELECT: только свои
        EXECUTE format(
            'CREATE POLICY "Users can read own data" ON %I FOR SELECT TO authenticated USING (user_id = auth.uid())',
            tbl
        );

        -- INSERT: user_id = auth.uid()
        EXECUTE format(
            'CREATE POLICY "Users can insert own data" ON %I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())',
            tbl
        );

        -- UPDATE: только свои
        EXECUTE format(
            'CREATE POLICY "Users can update own data" ON %I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
            tbl
        );

        -- DELETE: только свои
        EXECUTE format(
            'CREATE POLICY "Users can delete own data" ON %I FOR DELETE TO authenticated USING (user_id = auth.uid())',
            tbl
        );

        RAISE NOTICE 'RLS обновлён для: %', tbl;
    END LOOP;
END $$;

-- baby_profile отдельно
ALTER TABLE baby_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON baby_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON baby_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON baby_profile;
DROP POLICY IF EXISTS "Users can read own data" ON baby_profile;
DROP POLICY IF EXISTS "Users can insert own data" ON baby_profile;
DROP POLICY IF EXISTS "Users can update own data" ON baby_profile;
DROP POLICY IF EXISTS "Allow authenticated read" ON baby_profile;
DROP POLICY IF EXISTS "Allow authenticated insert" ON baby_profile;
DROP POLICY IF EXISTS "Allow authenticated update" ON baby_profile;

CREATE POLICY "Users can read own profile" ON baby_profile
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON baby_profile
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON baby_profile
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 5. Верификация
-- ═══════════════════════════════════════════════════════════

-- Проверить что user_id есть во всех таблицах BabySync
SELECT table_name, column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
  AND table_name IN ('feedings','sleeps','diapers','walks','tasks',
    'growth_records','medications','vaccinations','doctor_visits',
    'shifts','baby_profile','chat_history')
ORDER BY table_name;

-- Проверить RLS политики
SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('feedings','sleeps','diapers','walks','tasks',
    'growth_records','medications','vaccinations','doctor_visits',
    'shifts','baby_profile','chat_history')
ORDER BY tablename, cmd;
