-- Add passcode field to students table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'passcode'
    ) THEN
        ALTER TABLE students ADD COLUMN passcode VARCHAR(1);
    END IF;
END $$;

-- Add sample_sentence field to vocabulary_words table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vocabulary_words' AND column_name = 'sample_sentence'
    ) THEN
        ALTER TABLE vocabulary_words ADD COLUMN sample_sentence TEXT;
    END IF;
END $$;

-- Drop and recreate activity_results table
DROP TABLE IF EXISTS activity_results CASCADE;

CREATE TABLE activity_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    vocabulary_word_id UUID REFERENCES vocabulary_words(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions for basic operations
GRANT SELECT, INSERT ON activity_results TO authenticated;
GRANT SELECT, INSERT ON activity_results TO anon; 