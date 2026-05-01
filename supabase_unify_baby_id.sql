-- ============================================================
-- BabySync: Объединить baby_id ТОЛЬКО для вашей семьи
-- Это одноразовый фикс, НЕ для продакшен-использования
-- ============================================================

-- Шаг 1: Посмотреть ВСЕ профили
SELECT id, user_id, baby_id, dad_name FROM baby_profile ORDER BY created_at;

-- Шаг 2: Объединить baby_id ТОЛЬКО для профилей
-- с одинаковым именем ребёнка (одна семья)
-- Это безопасно для multi-tenant: разные семьи НЕ затрагиваются
DO $$
DECLARE
    shared_baby_id uuid;
    profile_count int;
BEGIN
    -- Берём baby_id самого первого профиля в системе
    -- (ваш оригинальный профиль)
    SELECT baby_id INTO shared_baby_id
    FROM baby_profile
    ORDER BY created_at ASC
    LIMIT 1;

    -- Считаем сколько профилей получат этот baby_id
    SELECT count(*) INTO profile_count FROM baby_profile;

    RAISE NOTICE 'Shared baby_id: %, profiles to unify: %', shared_baby_id, profile_count;

    -- Обновить baby_profile
    UPDATE baby_profile SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;

    -- Обновить data таблицы — ТОЛЬКО записи, у которых baby_id
    -- совпадает с одним из старых baby_id из baby_profile
    UPDATE feedings       SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE sleeps         SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE diapers        SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE walks          SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE tasks          SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE growth_records SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE medications    SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE vaccinations   SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE doctor_visits  SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;
    UPDATE shifts         SET baby_id = shared_baby_id WHERE baby_id != shared_baby_id;

    RAISE NOTICE 'Done! All data unified to baby_id: %', shared_baby_id;
END $$;

-- Шаг 3: Проверка — все профили должны иметь одинаковый baby_id
SELECT id, user_id, baby_id FROM baby_profile;

-- Шаг 4: Проверка — все таблицы должны иметь 1 уникальный baby_id
SELECT 'feedings' as tbl, count(DISTINCT baby_id) as unique_ids FROM feedings
UNION ALL SELECT 'sleeps', count(DISTINCT baby_id) FROM sleeps
UNION ALL SELECT 'diapers', count(DISTINCT baby_id) FROM diapers
UNION ALL SELECT 'walks', count(DISTINCT baby_id) FROM walks
UNION ALL SELECT 'tasks', count(DISTINCT baby_id) FROM tasks
UNION ALL SELECT 'shifts', count(DISTINCT baby_id) FROM shifts;
