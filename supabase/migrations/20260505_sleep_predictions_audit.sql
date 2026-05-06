CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sleep_predictions_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baby_id UUID NOT NULL,
    request_time_ms BIGINT,
    predicted_next_sleep_time_ms BIGINT NOT NULL,
    predicted_duration_seconds INT NOT NULL,
    confidence_score FLOAT NOT NULL,
    source TEXT NOT NULL DEFAULT 'unknown',
    model_version TEXT,
    actual_sleep_id UUID,
    actual_next_sleep_time_ms BIGINT,
    actual_duration_seconds INT,
    time_error_minutes FLOAT,
    duration_error_seconds INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ
);

ALTER TABLE sleep_predictions_audit
    ADD COLUMN IF NOT EXISTS request_time_ms BIGINT,
    ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS model_version TEXT,
    ADD COLUMN IF NOT EXISTS actual_sleep_id UUID,
    ADD COLUMN IF NOT EXISTS actual_next_sleep_time_ms BIGINT,
    ADD COLUMN IF NOT EXISTS actual_duration_seconds INT,
    ADD COLUMN IF NOT EXISTS time_error_minutes FLOAT,
    ADD COLUMN IF NOT EXISTS duration_error_seconds INT,
    ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ;

DO $$
DECLARE
    fk RECORD;
BEGIN
    FOR fk IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'sleep_predictions_audit'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE sleep_predictions_audit DROP CONSTRAINT IF EXISTS %I', fk.conname);
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_sleep_predictions_audit_baby_created
    ON sleep_predictions_audit (baby_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sleep_predictions_audit_pending
    ON sleep_predictions_audit (baby_id, created_at)
    WHERE evaluated_at IS NULL;

ALTER TABLE sleep_predictions_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their baby's predictions audit"
    ON sleep_predictions_audit;
DROP POLICY IF EXISTS "Users can insert their baby's predictions audit"
    ON sleep_predictions_audit;
DROP POLICY IF EXISTS "Users can view sleep prediction audits for their baby"
    ON sleep_predictions_audit;
DROP POLICY IF EXISTS "Users can insert sleep prediction audits for their baby"
    ON sleep_predictions_audit;

CREATE POLICY "Users can view sleep prediction audits for their baby"
    ON sleep_predictions_audit FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM baby_profile bp
            WHERE bp.user_id = auth.uid()
              AND (bp.baby_id = sleep_predictions_audit.baby_id OR bp.id = sleep_predictions_audit.baby_id)
        )
    );

CREATE POLICY "Users can insert sleep prediction audits for their baby"
    ON sleep_predictions_audit FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM baby_profile bp
            WHERE bp.user_id = auth.uid()
              AND (bp.baby_id = sleep_predictions_audit.baby_id OR bp.id = sleep_predictions_audit.baby_id)
        )
    );
