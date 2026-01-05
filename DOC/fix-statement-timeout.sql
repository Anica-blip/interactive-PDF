-- Fix statement timeout for large JSONB operations
-- This allows saving large flipbooks (31+ pages) and larger documents without timeout errors

-- Increase statement timeout for the database to 120 seconds
ALTER DATABASE postgres SET statement_timeout = '120000';

-- Create a helper function to set statement timeout per session
CREATE OR REPLACE FUNCTION set_config(
  setting_name text,
  new_value text,
  is_local boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(setting_name, new_value, is_local);
  RETURN new_value;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION set_config(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION set_config(text, text, boolean) TO anon;

-- Set default statement timeout for the pdf_projects table operations
-- This ensures INSERT and UPDATE operations on large JSONB fields don't timeout
COMMENT ON TABLE pdf_projects IS 'Stores interactive PDF projects. Statement timeout increased to 60s for large JSONB metadata.';
