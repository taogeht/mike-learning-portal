-- Create tables for the student learning portal

-- Table for teachers
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for students in classes
CREATE TABLE class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- Table for vocabulary lists
CREATE TABLE vocabulary_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for vocabulary words
CREATE TABLE vocabulary_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word VARCHAR(255) NOT NULL,
  definition TEXT,
  image_url TEXT,
  chinese_translation TEXT,
  list_id UUID REFERENCES vocabulary_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
-- Note: You'll need to customize these based on your authentication setup

-- Enable Row Level Security
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;

-- Create policies (example for teachers)
CREATE POLICY "Teachers can view their own data" ON teachers
  FOR SELECT USING (auth.uid() = id);

-- Create policies for classes
CREATE POLICY "Teachers can view their classes" ON classes
  FOR SELECT USING (teacher_id = auth.uid());
  
CREATE POLICY "Teachers can insert their classes" ON classes
  FOR INSERT WITH CHECK (teacher_id = auth.uid());
  
CREATE POLICY "Teachers can update their classes" ON classes
  FOR UPDATE USING (teacher_id = auth.uid());
  
CREATE POLICY "Teachers can delete their classes" ON classes
  FOR DELETE USING (teacher_id = auth.uid());

-- Similar policies would be needed for other tables
-- These are just examples and should be adjusted based on your specific requirements 