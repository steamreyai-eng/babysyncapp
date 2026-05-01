-- ============================================================
-- BabySync: Форсировать полный re-sync
-- Обновляет updated_at на ВСЕХ записях, чтобы sync подтянул их
-- ============================================================

UPDATE feedings       SET updated_at = now();
UPDATE sleeps         SET updated_at = now();
UPDATE diapers        SET updated_at = now();
UPDATE walks          SET updated_at = now();
UPDATE tasks          SET updated_at = now();
UPDATE growth_records SET updated_at = now();
UPDATE medications    SET updated_at = now();
UPDATE vaccinations   SET updated_at = now();
UPDATE doctor_visits  SET updated_at = now();
UPDATE shifts         SET updated_at = now();

-- Проверка
SELECT 'feedings' as tbl, count(*) as updated FROM feedings
UNION ALL SELECT 'sleeps', count(*) FROM sleeps
UNION ALL SELECT 'diapers', count(*) FROM diapers
UNION ALL SELECT 'walks', count(*) FROM walks
UNION ALL SELECT 'tasks', count(*) FROM tasks
UNION ALL SELECT 'shifts', count(*) FROM shifts;
