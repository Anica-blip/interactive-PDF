-- ============================================================================
-- SUPABASE DATABASE SCHEMA FOR INTERACTIVE PDF CREATOR
-- ============================================================================
-- Purpose: Separate tables for Static PDFs and Flipbooks for better organization
-- Uses existing 3c-library-files R2 bucket for all file storage
-- ============================================================================

-- ============================================================================
-- TABLE 1: Static PDF Projects (Normal PDFs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pdf_projects (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  
  -- PDF Details
  page_count INTEGER NOT NULL DEFAULT 1,
  pdf_url TEXT NOT NULL, -- URL to generated PDF in R2 (files.3c-public-library.org/...)
  thumbnail_url TEXT, -- URL to thumbnail in R2
  file_size INTEGER, -- Size in bytes
  
  -- Mode Flags
  embedded_mode BOOLEAN DEFAULT false, -- Whether media is embedded or linked
  
  -- Content Data (JSONB for flexibility)
  settings JSONB DEFAULT '{}', -- PDF settings (orientation, size, author, etc.)
  pages_data JSONB DEFAULT '[]', -- Array of page data with elements
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional: User/owner tracking (for future multi-user support)
  owner_id UUID, -- Future: link to auth.users
  is_public BOOLEAN DEFAULT false,
  
  -- Metadata
  tags TEXT[], -- Array of tags for categorization
  folder_path TEXT -- Optional: organize in folders
);

-- ============================================================================
-- TABLE 2: Flipbook Projects (Magazine-Style Interactive PDFs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flipbook_projects (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  
  -- Flipbook Details
  page_count INTEGER NOT NULL DEFAULT 1,
  pdf_url TEXT NOT NULL, -- URL to generated flipbook PDF in R2
  thumbnail_url TEXT, -- Cover thumbnail
  manifest_url TEXT, -- URL to flipbook manifest JSON in R2
  file_size INTEGER,
  
  -- Flipbook-Specific Settings
  flipbook_config JSONB DEFAULT '{}', -- Turn speed, sound effects, etc.
  embedded_mode BOOLEAN DEFAULT false,
  
  -- Content Data (JSONB for flexibility)
  settings JSONB DEFAULT '{}',
  pages_data JSONB DEFAULT '[]', -- Array of page data
  
  -- Media Assets (separate from pages for flipbooks)
  media_assets JSONB DEFAULT '[]', -- Array of all media used (videos, audio, images)
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Optional: User/owner tracking
  owner_id UUID,
  is_public BOOLEAN DEFAULT true, -- Flipbooks usually public
  
  -- Metadata
  tags TEXT[],
  folder_path TEXT,
  category TEXT -- e.g., 'magazine', 'catalog', 'portfolio'
);

-- ============================================================================
-- INDEXES for Fast Queries
-- ============================================================================

-- PDF Projects Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_projects_created ON pdf_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_projects_title ON pdf_projects(title);
CREATE INDEX IF NOT EXISTS idx_pdf_projects_owner ON pdf_projects(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdf_projects_public ON pdf_projects(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_pdf_projects_tags ON pdf_projects USING GIN(tags);

-- Flipbook Projects Indexes
CREATE INDEX IF NOT EXISTS idx_flipbook_projects_created ON flipbook_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flipbook_projects_title ON flipbook_projects(title);
CREATE INDEX IF NOT EXISTS idx_flipbook_projects_owner ON flipbook_projects(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flipbook_projects_public ON flipbook_projects(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_flipbook_projects_category ON flipbook_projects(category);
CREATE INDEX IF NOT EXISTS idx_flipbook_projects_tags ON flipbook_projects USING GIN(tags);

-- ============================================================================
-- TRIGGERS for Auto-Update Timestamps
-- ============================================================================

-- Create update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to pdf_projects
DROP TRIGGER IF EXISTS update_pdf_projects_updated_at ON pdf_projects;
CREATE TRIGGER update_pdf_projects_updated_at
    BEFORE UPDATE ON pdf_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to flipbook_projects
DROP TRIGGER IF EXISTS update_flipbook_projects_updated_at ON flipbook_projects;
CREATE TRIGGER update_flipbook_projects_updated_at
    BEFORE UPDATE ON flipbook_projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional for Future
-- ============================================================================
-- Uncomment when you add authentication

-- Enable RLS
-- ALTER TABLE pdf_projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE flipbook_projects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view public PDFs
-- CREATE POLICY "Public PDFs are viewable by everyone"
--   ON pdf_projects FOR SELECT
--   USING (is_public = true);

-- Policy: Users can view their own PDFs
-- CREATE POLICY "Users can view own PDFs"
--   ON pdf_projects FOR SELECT
--   USING (auth.uid() = owner_id);

-- Policy: Users can create their own PDFs
-- CREATE POLICY "Users can create PDFs"
--   ON pdf_projects FOR INSERT
--   WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own PDFs
-- CREATE POLICY "Users can update own PDFs"
--   ON pdf_projects FOR UPDATE
--   USING (auth.uid() = owner_id);

-- Same for flipbooks...

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- List all static PDFs (most recent first)
-- SELECT id, title, author, page_count, pdf_url, created_at
-- FROM pdf_projects
-- ORDER BY created_at DESC
-- LIMIT 20;

-- List all flipbooks by category
-- SELECT id, title, author, category, page_count, pdf_url, created_at
-- FROM flipbook_projects
-- WHERE category = 'magazine'
-- ORDER BY created_at DESC;

-- Search PDFs by title
-- SELECT id, title, author, pdf_url
-- FROM pdf_projects
-- WHERE title ILIKE '%annual report%'
-- ORDER BY created_at DESC;

-- Get all public flipbooks with specific tag
-- SELECT id, title, tags, pdf_url
-- FROM flipbook_projects
-- WHERE 'fashion' = ANY(tags) AND is_public = true
-- ORDER BY created_at DESC;

-- ============================================================================
-- FILE STORAGE STRUCTURE IN R2 BUCKET (3c-library-files)
-- ============================================================================
-- 
-- /interactive-pdfs/static/{uuid}.pdf        -- Static PDF files
-- /interactive-pdfs/static/thumbnails/{uuid}.jpg
-- 
-- /interactive-pdfs/flipbooks/{uuid}.pdf     -- Flipbook PDF files
-- /interactive-pdfs/flipbooks/{uuid}.json    -- Flipbook manifest
-- /interactive-pdfs/flipbooks/thumbnails/{uuid}.jpg
-- 
-- /interactive-pdfs/media/images/{timestamp}-{random}.{ext}
-- /interactive-pdfs/media/videos/{timestamp}-{random}.{ext}
-- /interactive-pdfs/media/audio/{timestamp}-{random}.{ext}
-- 
-- All accessible via: https://files.3c-public-library.org/{path}
-- ============================================================================

-- ============================================================================
-- JSONB SCHEMA EXAMPLES
-- ============================================================================

-- Example settings JSONB:
-- {
--   "title": "Annual Report 2024",
--   "author": "3C Thread to Success",
--   "pageSize": "A4",
--   "orientation": "portrait"
-- }

-- Example pages_data JSONB:
-- [
--   {
--     "id": 1,
--     "backgroundData": "data:image/png;base64,...",
--     "elements": [
--       {
--         "type": "3c-button",
--         "x": 100,
--         "y": 200,
--         "width": 120,
--         "height": 40,
--         "url": "https://example.com",
--         "imagePath": "/3C Buttons/Generic/3C Button - Generic.png"
--       },
--       {
--         "type": "video",
--         "x": 50,
--         "y": 100,
--         "width": 400,
--         "height": 300,
--         "url": "https://files.3c-public-library.org/videos/promo.mp4"
--       }
--     ]
--   }
-- ]

-- Example media_assets JSONB (for flipbooks):
-- [
--   {
--     "type": "video",
--     "url": "https://files.3c-public-library.org/interactive-pdfs/media/videos/1234-abc.mp4",
--     "size": 2048000,
--     "usedOnPages": [1, 3, 5]
--   },
--   {
--     "type": "image",
--     "url": "https://files.3c-public-library.org/interactive-pdfs/media/images/5678-def.jpg",
--     "size": 512000,
--     "usedOnPages": [2, 4]
--   }
-- ]

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
