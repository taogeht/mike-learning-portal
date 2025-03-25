-- Create leaderboard_history table
CREATE TABLE IF NOT EXISTS leaderboard_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  leaderboard_data JSONB NOT NULL,
  total_students INTEGER NOT NULL,
  total_activities INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_class_id ON leaderboard_history(class_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_history_reset_date ON leaderboard_history(reset_date);

-- Add RLS policies
ALTER TABLE leaderboard_history ENABLE ROW LEVEL SECURITY;

-- Policy for teachers to view leaderboard history for their classes
CREATE POLICY teacher_select_leaderboard_history ON leaderboard_history
  FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- Policy for teachers to insert leaderboard history for their classes
CREATE POLICY teacher_insert_leaderboard_history ON leaderboard_history
  FOR INSERT
  WITH CHECK (
    class_id IN (
      SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT, INSERT ON leaderboard_history TO authenticated; 