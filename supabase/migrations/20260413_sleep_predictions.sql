-- Migration: Create sleep_predictions table for ML feedback loop
-- This stores each prediction and (later) the actual sleep time,
-- allowing the model to track accuracy and improve over time.

CREATE TABLE IF NOT EXISTS sleep_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  predicted_at TIMESTAMPTZ,             -- when we predicted the baby will sleep
  actual_sleep_at TIMESTAMPTZ,          -- filled in when the baby actually sleeps
  level TEXT NOT NULL DEFAULT 'L0',      -- 'L0', 'L1', 'L2'
  confidence FLOAT,                      -- 0.0–1.0
  error_minutes FLOAT,                   -- abs(predicted - actual), computed on update
  features JSONB,                        -- snapshot of features used for this prediction
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see their own predictions
ALTER TABLE sleep_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own predictions"
  ON sleep_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own predictions"
  ON sleep_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
  ON sleep_predictions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role (Edge Function) can also insert
CREATE POLICY "Service role full access"
  ON sleep_predictions FOR ALL
  USING (auth.role() = 'service_role');

-- Index for quick lookups
CREATE INDEX idx_sleep_predictions_user_created
  ON sleep_predictions (user_id, created_at DESC);

-- Auto-compute error_minutes when actual_sleep_at is set
CREATE OR REPLACE FUNCTION compute_prediction_error()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_sleep_at IS NOT NULL AND NEW.predicted_at IS NOT NULL THEN
    NEW.error_minutes := ABS(EXTRACT(EPOCH FROM (NEW.actual_sleep_at - NEW.predicted_at)) / 60);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_prediction_error
  BEFORE UPDATE ON sleep_predictions
  FOR EACH ROW
  WHEN (NEW.actual_sleep_at IS DISTINCT FROM OLD.actual_sleep_at)
  EXECUTE FUNCTION compute_prediction_error();
