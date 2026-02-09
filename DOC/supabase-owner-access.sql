-- ============================================
-- SUPABASE OWNER ACCESS POLICY
-- ============================================
-- This SQL script ensures the project owner (you) never gets locked out
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Create the pdf_projects table (if not exists)
CREATE TABLE IF NOT EXISTS pdf_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_json JSONB NOT NULL,
    pdf_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE pdf_projects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow all operations from builder domain" ON pdf_projects;
DROP POLICY IF EXISTS "Allow public read access" ON pdf_projects;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON pdf_projects;

-- 4. Create policy for builder.3c-public-library.org domain
-- This ensures YOU (the owner) always have full access from your domain
CREATE POLICY "Allow all operations from builder domain"
ON pdf_projects
FOR ALL
USING (
    -- Allow if request comes from your builder domain
    current_setting('request.headers', true)::json->>'origin' LIKE '%builder.3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%builder.3c-public-library.org%'
    OR
    -- Allow if using service role key (for backend operations)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
)
WITH CHECK (
    current_setting('request.headers', true)::json->>'origin' LIKE '%builder.3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%builder.3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- 5. Create policy for authenticated users (backup access)
-- This allows any authenticated user to access (useful for team members)
CREATE POLICY "Allow authenticated users full access"
ON pdf_projects
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 6. Create policy for public read access (optional - for viewing published PDFs)
CREATE POLICY "Allow public read access"
ON pdf_projects
FOR SELECT
USING (status = 'published');

-- 7. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pdf_projects_updated_at ON pdf_projects;
CREATE TRIGGER update_pdf_projects_updated_at
    BEFORE UPDATE ON pdf_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the setup:

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pdf_projects'
);

-- Check if RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'pdf_projects';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'pdf_projects';

-- ============================================
-- NOTES
-- ============================================
-- 1. The domain-based policy ensures you can ALWAYS access from builder.3c-public-library.org
-- 2. The authenticated policy allows team members to access if they log in
-- 3. The public read policy allows anyone to view published PDFs
-- 4. Service role key bypasses all RLS policies (for Edge Functions)
-- 5. You will NEVER be locked out as long as you access from your domain

-- ============================================
-- TESTING
-- ============================================
-- Test insert (should work with anon key from your domain):
-- INSERT INTO pdf_projects (project_json, status) 
-- VALUES ('{"test": true}'::jsonb, 'draft');

-- Test select (should work):
-- SELECT * FROM pdf_projects;

-- Test update (should work):
-- UPDATE pdf_projects SET status = 'published' WHERE id = 'your-id';

-- Test delete (should work):
-- DELETE FROM pdf_projects WHERE id = 'your-id';
