-- Update statement timeout to 120 seconds for all roles
ALTER ROLE postgres SET statement_timeout = '120s';
ALTER ROLE authenticated SET statement_timeout = '120s';
ALTER ROLE anon SET statement_timeout = '120s';
ALTER ROLE service_role SET statement_timeout = '120s';

-- Set database-level timeout
ALTER DATABASE postgres SET statement_timeout = '120s';
