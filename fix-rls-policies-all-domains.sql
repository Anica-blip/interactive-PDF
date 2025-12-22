-- ============================================
-- FIX RLS POLICIES FOR ALL DOMAINS
-- ============================================
-- This SQL script adds proper access for all three applications:
-- 1. builder.3c-public-library.org (Interactive PDF Builder)
-- 2. public-library.org/admin (3C Admin Panel)
-- 3. public-library.org/library.html (3C Public Library)
--
-- Run this in Supabase Dashboard → SQL Editor

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Allow all operations from builder domain" ON pdf_projects;
DROP POLICY IF EXISTS "Allow public read access" ON pdf_projects;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON pdf_projects;

-- ============================================
-- POLICY 1: Allow all operations from all authorized domains
-- ============================================
CREATE POLICY "Allow all operations from authorized domains"
ON pdf_projects
FOR ALL
USING (
    -- Allow from builder.3c-public-library.org
    current_setting('request.headers', true)::json->>'origin' LIKE '%builder.3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%builder.3c-public-library.org%'
    OR
    -- Allow from public-library.org (admin and library)
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    -- Allow from 3c-public-library.org (any subdomain)
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    -- Allow if using service role key (for Edge Functions and backend operations)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
)
WITH CHECK (
    -- Same conditions for INSERT/UPDATE operations
    current_setting('request.headers', true)::json->>'origin' LIKE '%builder.3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%builder.3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'origin' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.headers', true)::json->>'referer' LIKE '%3c-public-library.org%'
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
);

-- ============================================
-- POLICY 2: Allow authenticated users full access (backup)
-- ============================================
CREATE POLICY "Allow authenticated users full access"
ON pdf_projects
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- POLICY 3: Allow public read access to published projects
-- ============================================
CREATE POLICY "Allow public read access"
ON pdf_projects
FOR SELECT
USING (status = 'published');

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that policies were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'pdf_projects'
ORDER BY policyname;

-- Expected output: 3 policies
-- 1. Allow all operations from authorized domains (FOR ALL)
-- 2. Allow authenticated users full access (FOR ALL)
-- 3. Allow public read access (FOR SELECT)

-- ============================================
-- TEST THE POLICIES
-- ============================================
-- Test 1: Check if you can read from the table
SELECT COUNT(*) as total_projects FROM pdf_projects;

-- Test 2: Try to insert a test record (will work if policies are correct)
-- Uncomment to test:
-- INSERT INTO pdf_projects (project_json, status) 
-- VALUES ('{"test": true}'::jsonb, 'draft')
-- RETURNING id, status, created_at;

-- Test 3: Clean up test record (if you created one)
-- DELETE FROM pdf_projects WHERE project_json->>'test' = 'true';

-- ============================================
-- NOTES
-- ============================================
-- These policies ensure:
-- 1. ✅ builder.3c-public-library.org has full CRUD access
-- 2. ✅ public-library.org/admin has full CRUD access
-- 3. ✅ public-library.org/library.html has full CRUD access
-- 4. ✅ Edge Functions bypass RLS with service role key
-- 5. ✅ Authenticated users have full access (for team members)
-- 6. ✅ Public can read published projects only
--
-- The policies use LIKE '%domain%' to match:
-- - http://domain
-- - https://domain
-- - http://www.domain
-- - https://www.domain
-- - Any subdomain of domain
