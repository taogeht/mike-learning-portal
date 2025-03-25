-- Drop leaderboard_history table and related objects
DROP POLICY IF EXISTS teacher_select_leaderboard_history ON leaderboard_history;
DROP POLICY IF EXISTS teacher_insert_leaderboard_history ON leaderboard_history;
DROP TABLE IF EXISTS leaderboard_history; 