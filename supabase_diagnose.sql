-- ============================================================
-- Диагностика: последние записи в каждой таблице
-- ============================================================

-- Последние 5 записей сна
SELECT id, user_id, baby_id, start_time, end_time, created_at, updated_at, deleted_at
FROM sleeps
ORDER BY created_at DESC
LIMIT 5;

-- Последние 5 подгузников
SELECT id, user_id, baby_id, type, created_at, updated_at, deleted_at
FROM diapers
ORDER BY created_at DESC
LIMIT 5;

-- Последние 5 прогулок
SELECT id, user_id, baby_id, created_at, updated_at, deleted_at
FROM walks
ORDER BY created_at DESC
LIMIT 5;

-- Последние 5 кормлений
SELECT id, user_id, baby_id, type, created_at, updated_at, deleted_at
FROM feedings
ORDER BY created_at DESC
LIMIT 5;

-- Общая статистика: сколько записей с каким baby_id
SELECT 'sleeps' as tbl, baby_id, count(*) as cnt, max(created_at) as last_record
FROM sleeps GROUP BY baby_id
UNION ALL
SELECT 'diapers', baby_id, count(*), max(created_at) FROM diapers GROUP BY baby_id
UNION ALL
SELECT 'walks', baby_id, count(*), max(created_at) FROM walks GROUP BY baby_id
UNION ALL
SELECT 'feedings', baby_id, count(*), max(created_at) FROM feedings GROUP BY baby_id
ORDER BY tbl, last_record DESC;

-- Проверка: есть ли записи с NULL baby_id (не мигрировались)
SELECT 'sleeps' as tbl, count(*) as null_baby_id FROM sleeps WHERE baby_id IS NULL
UNION ALL SELECT 'diapers', count(*) FROM diapers WHERE baby_id IS NULL
UNION ALL SELECT 'walks', count(*) FROM walks WHERE baby_id IS NULL
UNION ALL SELECT 'feedings', count(*) FROM feedings WHERE baby_id IS NULL;

-- Проверка: все baby_profile
SELECT id, user_id, baby_id FROM baby_profile;
