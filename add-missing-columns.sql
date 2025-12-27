-- Add missing columns that the app is trying to save
ALTER TABLE pdf_projects 
ADD COLUMN IF NOT EXISTS embedded_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS flipbook_mode BOOLEAN DEFAULT FALSE;

-- Refresh schema cache
NOTIFY pgrst;

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'pdf_projects' 
AND column_name IN ('embedded_mode', 'flipbook_mode');
