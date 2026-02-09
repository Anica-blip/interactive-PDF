-- Supabase Schema for Interactive PDF Builder
-- This creates tables to store interactive PDF projects and their configurations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: pdf_projects
-- Stores information about interactive PDF projects
CREATE TABLE IF NOT EXISTS pdf_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    page_size VARCHAR(20) DEFAULT 'A4', -- A4, A3, Letter, etc.
    orientation VARCHAR(20) DEFAULT 'portrait', -- portrait, landscape
    total_pages INTEGER DEFAULT 1,
    thumbnail_url TEXT,
    pdf_url TEXT, -- URL to the generated PDF in R2
    visibility VARCHAR(20) DEFAULT 'private', -- private, public
    user_id UUID, -- For future user authentication
    metadata JSONB DEFAULT '{}'::jsonb -- Store additional metadata
);

-- Table: pdf_pages
-- Stores individual pages within a PDF project
CREATE TABLE IF NOT EXISTS pdf_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES pdf_projects(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    background_url TEXT, -- URL to background image in R2
    background_type VARCHAR(50), -- image, color, gradient
    background_value TEXT, -- Color hex or gradient definition
    width NUMERIC(10,2) DEFAULT 595.28, -- A4 width in points
    height NUMERIC(10,2) DEFAULT 841.89, -- A4 height in points
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, page_number)
);

-- Table: pdf_elements
-- Stores interactive elements (buttons, hotspots, links, etc.)
CREATE TABLE IF NOT EXISTS pdf_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_id UUID NOT NULL REFERENCES pdf_pages(id) ON DELETE CASCADE,
    element_type VARCHAR(50) NOT NULL, -- button, hotspot, link, text, image, video, audio
    label VARCHAR(255),
    position_x NUMERIC(10,2) NOT NULL,
    position_y NUMERIC(10,2) NOT NULL,
    width NUMERIC(10,2) NOT NULL,
    height NUMERIC(10,2) NOT NULL,
    action_type VARCHAR(50), -- url, goto_page, javascript, play_media
    action_value TEXT, -- URL, page number, JS code, media URL
    style JSONB DEFAULT '{}'::jsonb, -- Colors, fonts, borders, etc.
    media_url TEXT, -- For video/audio/image elements
    media_type VARCHAR(50), -- video/mp4, audio/mp3, image/png, etc.
    z_index INTEGER DEFAULT 0, -- Layer order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: pdf_templates
-- Store reusable templates for quick PDF creation
CREATE TABLE IF NOT EXISTS pdf_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- educational, business, marketing, etc.
    thumbnail_url TEXT,
    template_data JSONB NOT NULL, -- Complete template configuration
    is_public BOOLEAN DEFAULT false,
    created_by UUID, -- User who created the template
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0
);

-- Table: pdf_assets
-- Track uploaded assets (images, videos, audio files)
CREATE TABLE IF NOT EXISTS pdf_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES pdf_projects(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL, -- image, video, audio, pdf
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT, -- Size in bytes
    mime_type VARCHAR(100),
    r2_url TEXT NOT NULL, -- URL in Cloudflare R2
    r2_key TEXT NOT NULL, -- R2 object key
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    duration NUMERIC(10,2), -- For videos/audio (in seconds)
    thumbnail_url TEXT, -- For videos
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pdf_projects_status ON pdf_projects(status);
CREATE INDEX IF NOT EXISTS idx_pdf_projects_visibility ON pdf_projects(visibility);
CREATE INDEX IF NOT EXISTS idx_pdf_projects_created_at ON pdf_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_project_id ON pdf_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_pdf_pages_page_number ON pdf_pages(project_id, page_number);
CREATE INDEX IF NOT EXISTS idx_pdf_elements_page_id ON pdf_elements(page_id);
CREATE INDEX IF NOT EXISTS idx_pdf_elements_type ON pdf_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_category ON pdf_templates(category);
CREATE INDEX IF NOT EXISTS idx_pdf_templates_public ON pdf_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_pdf_assets_project_id ON pdf_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_pdf_assets_type ON pdf_assets(asset_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_pdf_projects_updated_at BEFORE UPDATE ON pdf_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_pages_updated_at BEFORE UPDATE ON pdf_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_elements_updated_at BEFORE UPDATE ON pdf_elements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_templates_updated_at BEFORE UPDATE ON pdf_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE pdf_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_assets ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can modify these based on your needs)

-- Public can view published projects
CREATE POLICY "Public can view published projects" ON pdf_projects
    FOR SELECT USING (visibility = 'public' AND status = 'published');

-- Public can view pages of published projects
CREATE POLICY "Public can view published pages" ON pdf_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_projects 
            WHERE pdf_projects.id = pdf_pages.project_id 
            AND pdf_projects.visibility = 'public' 
            AND pdf_projects.status = 'published'
        )
    );

-- Public can view elements of published projects
CREATE POLICY "Public can view published elements" ON pdf_elements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_pages 
            JOIN pdf_projects ON pdf_projects.id = pdf_pages.project_id
            WHERE pdf_pages.id = pdf_elements.page_id 
            AND pdf_projects.visibility = 'public' 
            AND pdf_projects.status = 'published'
        )
    );

-- Public can view public templates
CREATE POLICY "Public can view public templates" ON pdf_templates
    FOR SELECT USING (is_public = true);

-- Public can view assets of published projects
CREATE POLICY "Public can view published assets" ON pdf_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_projects 
            WHERE pdf_projects.id = pdf_assets.project_id 
            AND pdf_projects.visibility = 'public' 
            AND pdf_projects.status = 'published'
        )
    );

-- For authenticated users (add these when you implement authentication)
-- CREATE POLICY "Users can manage their own projects" ON pdf_projects
--     FOR ALL USING (auth.uid() = user_id);

-- Insert some example data (optional - remove if not needed)
-- INSERT INTO pdf_projects (title, description, author, status, visibility) VALUES
-- ('Sample Interactive PDF', 'A sample project to demonstrate the system', 'Admin', 'published', 'public');

-- Comments for documentation
COMMENT ON TABLE pdf_projects IS 'Stores interactive PDF projects';
COMMENT ON TABLE pdf_pages IS 'Stores individual pages within PDF projects';
COMMENT ON TABLE pdf_elements IS 'Stores interactive elements like buttons, hotspots, and links';
COMMENT ON TABLE pdf_templates IS 'Stores reusable PDF templates';
COMMENT ON TABLE pdf_assets IS 'Tracks uploaded media assets stored in R2';

-- Grant permissions (adjust based on your Supabase setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
