-- FINAL TIMEOUT FIX FOR pdf_projects TABLE
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor → New Query
-- This will fix the 57014 timeout error when saving 31+ page documents

-- Set timeout for ALL roles that access the database
ALTER ROLE postgres SET statement_timeout = '120000';
ALTER ROLE authenticator SET statement_timeout = '120000';
ALTER ROLE anon SET statement_timeout = '120000';
ALTER ROLE authenticated SET statement_timeout = '120000';

-- Set timeout at database level
ALTER DATABASE postgres SET statement_timeout = '120000';

-- Apply to current session immediately
SET statement_timeout = '120000';

-- Verify it worked (should show 120s or 2min)
SHOW statement_timeout;

-- You should see output: statement_timeout = 120s
-- If you see this, the fix is applied and will work for all future connections
