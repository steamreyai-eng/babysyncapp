CREATE TABLE baby_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baby_id UUID NOT NULL REFERENCES baby_profile(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    predicted_sleeps JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE baby_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage schedules for their babies"
ON baby_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM baby_profile bp
        WHERE bp.id = baby_schedules.baby_id
        AND (bp.parent1_id = auth.uid() OR bp.parent2_id = auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM baby_profile bp
        WHERE bp.id = baby_schedules.baby_id
        AND (bp.parent1_id = auth.uid() OR bp.parent2_id = auth.uid())
    )
);

CREATE INDEX idx_baby_schedules_baby_date ON baby_schedules(baby_id, schedule_date);
