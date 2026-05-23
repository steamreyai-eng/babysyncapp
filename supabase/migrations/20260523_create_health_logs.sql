-- ============================================================
-- BabySync Migration: Create health_logs table & configure RLS
-- ============================================================

-- 1. Create health_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    baby_id UUID,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    temperature FLOAT,
    symptoms TEXT,
    notes TEXT,
    is_sick BOOLEAN DEFAULT false,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 2. Create indexes for performance and scoping
CREATE INDEX IF NOT EXISTS idx_health_logs_baby_id ON health_logs (baby_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON health_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_created_at ON health_logs (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;

-- 4. Recreate security policies to allow shared access between parents of the same baby
DROP POLICY IF EXISTS "Users can read own data" ON health_logs;
DROP POLICY IF EXISTS "Users can insert own data" ON health_logs;
DROP POLICY IF EXISTS "Users can update own data" ON health_logs;
DROP POLICY IF EXISTS "Users can delete own data" ON health_logs;

-- SELECT policy: Allows reading health logs if the user is the creator OR shares access to the baby_id via baby_profile
CREATE POLICY "Users can read own data" ON health_logs
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1
            FROM baby_profile bp
            WHERE bp.user_id = auth.uid()
              AND (bp.baby_id = health_logs.baby_id OR bp.id = health_logs.baby_id)
        )
    );

-- INSERT policy: Must be authenticated and insert as themselves
CREATE POLICY "Users can insert own data" ON health_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Only the creator of the log can update it
CREATE POLICY "Users can update own data" ON health_logs
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE policy: Only the creator of the log can delete it
CREATE POLICY "Users can delete own data" ON health_logs
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- 5. Trigger for updated_at tracking (utilizing existing project function)
DROP TRIGGER IF EXISTS set_updated_at ON health_logs;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON health_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
