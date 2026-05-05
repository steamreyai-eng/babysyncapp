CREATE TABLE IF NOT EXISTS sleep_predictions_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    baby_id UUID REFERENCES baby_profiles(id) ON DELETE CASCADE,
    predicted_next_sleep_time_ms BIGINT NOT NULL,
    predicted_duration_seconds INT NOT NULL,
    confidence_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE sleep_predictions_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their baby's predictions audit"
    ON sleep_predictions_audit FOR SELECT
    USING (baby_id IN (
        SELECT baby_id FROM baby_family_members WHERE user_id = auth.uid()
    ) OR baby_id IN (
        SELECT id FROM baby_profiles WHERE primary_parent_id = auth.uid()
    ));

CREATE POLICY "Users can insert their baby's predictions audit"
    ON sleep_predictions_audit FOR INSERT
    WITH CHECK (baby_id IN (
        SELECT baby_id FROM baby_family_members WHERE user_id = auth.uid()
    ) OR baby_id IN (
        SELECT id FROM baby_profiles WHERE primary_parent_id = auth.uid()
    ));
