-- Grant read access to flipbook domain
-- This allows builder.3c-library.org/flipbook to read from pdf_projects table

-- Create policy for flipbook read access (if using RLS)
DROP POLICY IF EXISTS "Flipbook read access" ON pdf_projects;

CREATE POLICY "Flipbook read access" ON pdf_projects
    FOR SELECT
    USING (
        -- Allow reads from the flipbook subdomain
        current_setting('request.headers', true)::json->>'origin' = 'https://builder.3c-library.org'
        OR
        -- Allow reads from any flipbook page
        current_setting('request.headers', true)::json->>'referer' LIKE '%/flipbook%'
        OR
        -- Or allow all reads if RLS is disabled
        true
    );

-- Also grant public read access if RLS is disabled
ALTER TABLE pdf_projects ENABLE ROW LEVEL SECURITY;

-- Grant usage on schema to public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on table to public
GRANT SELECT ON pdf_projects TO anon, authenticated;

-- Test the policy
SELECT * FROM pg_policies 
WHERE tablename = 'pdf_projects' 
AND policyname = 'Flipbook read access';
