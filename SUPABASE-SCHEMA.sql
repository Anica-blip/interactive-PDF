-- ============================================================================
-- WORKING SUPABASE SCHEMA - Copy & Paste This Entire File
-- ============================================================================

-- Table 1: Static PDFs (Normal interactive PDFs)
CREATE TABLE pdf_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  page_count INTEGER NOT NULL DEFAULT 1,
  pdf_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER,
  embedded_mode BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  pages_data JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  folder_path TEXT
);

-- Table 2: Flipbook PDFs (Magazine-style with page turning)
CREATE TABLE flipbook_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  page_count INTEGER NOT NULL DEFAULT 1,
  pdf_url TEXT NOT NULL,
  thumbnail_url TEXT,
  manifest_url TEXT,
  file_size INTEGER,
  flipbook_config JSONB DEFAULT '{}',
  embedded_mode BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  pages_data JSONB DEFAULT '[]',
  media_assets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID,
  is_public BOOLEAN DEFAULT true,
  tags TEXT[],
  folder_path TEXT,
  category TEXT,
  version_number TEXT
);

-- Indexes for fast queries
CREATE INDEX idx_pdf_created ON pdf_projects(created_at DESC);
CREATE INDEX idx_pdf_title ON pdf_projects(title);
CREATE INDEX idx_flipbook_created ON flipbook_projects(created_at DESC);
CREATE INDEX idx_flipbook_title ON flipbook_projects(title);
CREATE INDEX idx_flipbook_category ON flipbook_projects(category);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_pdf_timestamp
    BEFORE UPDATE ON pdf_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_flipbook_timestamp
    BEFORE UPDATE ON flipbook_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
