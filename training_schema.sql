-- Employee Training Portal Database Schema
-- Run this in your Supabase SQL Editor

-- Create training_courses table
CREATE TABLE IF NOT EXISTS training_courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('PDF', 'Video', 'Quiz')),
  required BOOLEAN DEFAULT FALSE,
  content_url TEXT,
  video_url TEXT,
  estimated_duration_minutes INTEGER DEFAULT 5,
  minimum_time_seconds INTEGER DEFAULT 180,
  quiz_required BOOLEAN DEFAULT FALSE,
  quiz_questions JSONB,
  passing_score INTEGER DEFAULT 80,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update vista_training table with verification fields
ALTER TABLE vista_training 
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scroll_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_watch_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_score INTEGER,
ADD COLUMN IF NOT EXISTS quiz_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_checkpoints JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS completion_verified BOOLEAN DEFAULT FALSE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_employee ON vista_training(employee_email);
CREATE INDEX IF NOT EXISTS idx_training_status ON vista_training(status);
CREATE INDEX IF NOT EXISTS idx_training_course ON vista_training(course_name);
CREATE INDEX IF NOT EXISTS idx_courses_type ON training_courses(type);
CREATE INDEX IF NOT EXISTS idx_courses_required ON training_courses(required);

-- Insert sample courses (optional - for testing)
INSERT INTO training_courses (id, name, description, type, required, content_url, estimated_duration_minutes, minimum_time_seconds)
VALUES 
  ('sample-1', 'General Onboarding', 'Required reading for all new Vista employees.', 'PDF', true, '', 10, 300),
  ('sample-2', 'Wholesale Logic', 'Advanced scanning & quality control workflows.', 'Video', true, '', 15, 600),
  ('sample-3', 'Forklift Safety', 'Safety certification for forklift operators.', 'Video', false, '', 20, 900),
  ('sample-4', 'Customer Service Excellence', 'Best practices for customer interactions.', 'PDF', false, '', 8, 240)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions (if needed)
-- ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vista_training ENABLE ROW LEVEL SECURITY;
