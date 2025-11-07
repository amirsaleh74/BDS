-- LOGIXX Scraper Database Schema
-- Run this in Supabase SQL Editor

-- Create scraped_leads table
CREATE TABLE IF NOT EXISTS scraped_leads (
  id BIGSERIAL PRIMARY KEY,
  app_id TEXT NOT NULL,
  app_date TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on app_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_scraped_leads_app_id ON scraped_leads(app_id);

-- Create index on scraped_at for sorting
CREATE INDEX IF NOT EXISTS idx_scraped_leads_scraped_at ON scraped_leads(scraped_at DESC);

-- Optional: Prevent duplicate app_ids (uncomment if you want this)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_scraped_leads_unique_app_id ON scraped_leads(app_id);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE scraped_leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations" ON scraped_leads
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- View to get latest leads
CREATE OR REPLACE VIEW latest_leads AS
SELECT 
  id,
  app_id,
  app_date,
  first_name,
  last_name,
  phone,
  scraped_at,
  created_at
FROM scraped_leads
ORDER BY scraped_at DESC
LIMIT 1000;

-- Function to get lead count
CREATE OR REPLACE FUNCTION get_lead_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM scraped_leads);
END;
$$ LANGUAGE plpgsql;

-- Function to get leads by date range
CREATE OR REPLACE FUNCTION get_leads_by_date_range(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  id BIGINT,
  app_id TEXT,
  app_date TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  scraped_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.id,
    sl.app_id,
    sl.app_date,
    sl.first_name,
    sl.last_name,
    sl.phone,
    sl.scraped_at
  FROM scraped_leads sl
  WHERE sl.scraped_at BETWEEN start_date AND end_date
  ORDER BY sl.scraped_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE scraped_leads IS 'Stores all leads scraped from Logixx CRM';
COMMENT ON COLUMN scraped_leads.app_id IS 'Application ID from Logixx';
COMMENT ON COLUMN scraped_leads.app_date IS 'Application date from Logixx';
COMMENT ON COLUMN scraped_leads.scraped_at IS 'When this lead was scraped';
COMMENT ON COLUMN scraped_leads.created_at IS 'When this record was created';
