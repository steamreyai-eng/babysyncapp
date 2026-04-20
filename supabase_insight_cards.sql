-- ============================================================
-- SQL Migration: Insight Cards
-- Run this script in the Supabase Dashboard SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS insight_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    insight_title text NOT NULL,
    short_text text NOT NULL,
    type text NOT NULL, -- 'success', 'warning', 'info'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz DEFAULT NULL
);

-- Enable RLS
ALTER TABLE insight_cards ENABLE ROW LEVEL SECURITY;

-- Allow users to manage only their own insight cards
CREATE POLICY "Users can manage their own insight cards"
ON insight_cards FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create auto-update trigger for updated_at column
-- Note: Assuming `update_updated_at_column()` exists from previous migrations.
DROP TRIGGER IF EXISTS set_updated_at ON insight_cards;
CREATE TRIGGER set_updated_at 
BEFORE UPDATE ON insight_cards 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
