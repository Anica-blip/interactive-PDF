-- ============================================
-- FIX TITLE COLUMN: Remove NOT NULL constraint
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor

-- Option 1: Make title column nullable (RECOMMENDED)
-- This allows the column to exist but not be required
ALTER TABLE pdf_projects 
ALTER COLUMN title DROP NOT NULL;

-- Option 2: If you want to remove the title column entirely
-- (since all data is stored in project_json JSONB)
-- Uncomment the line below if you prefer this approach:
-- ALTER TABLE pdf_projects DROP COLUMN IF EXISTS title;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pdf_projects'
ORDER BY ordinal_position;
