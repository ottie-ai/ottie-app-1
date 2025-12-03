-- ==========================================
-- CREATE PLANS TABLE
-- ==========================================
-- This migration creates the plans table for subscription plans
-- Run this after schema.sql if plans table doesn't exist yet
-- ==========================================

-- Create plans table

CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    max_users INT DEFAULT 1,
    max_sites INT DEFAULT 1,
    feature_lead_generation BOOLEAN DEFAULT FALSE,
    feature_custom_domain BOOLEAN DEFAULT FALSE,
    feature_analytics BOOLEAN DEFAULT FALSE,
    feature_api_access BOOLEAN DEFAULT FALSE,
    feature_priority_support BOOLEAN DEFAULT FALSE,
    feature_3d_tours BOOLEAN DEFAULT FALSE,
    feature_pdf_flyers BOOLEAN DEFAULT FALSE,
    feature_crm_sync BOOLEAN DEFAULT FALSE,
    price_cents INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plan_updated_at BEFORE UPDATE ON plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS FIRST
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read
CREATE POLICY "Public read plans" ON plans
FOR SELECT USING (true);

-- RLS: Deny INSERT to everyone (WITH CHECK required)
CREATE POLICY "No user insert" ON plans
FOR INSERT WITH CHECK (false);

-- RLS: Deny UPDATE to everyone
CREATE POLICY "No user update" ON plans
FOR UPDATE USING (false);

-- RLS: Deny DELETE to everyone
CREATE POLICY "No user delete" ON plans
FOR DELETE USING (false);

-- Insert predefined plans (run once) - Service Role bypasses RLS
-- Using ON CONFLICT to make it idempotent (safe to run multiple times)
INSERT INTO plans (name, description, max_users, max_sites, feature_lead_generation, feature_custom_domain, feature_analytics, feature_api_access, feature_priority_support, feature_3d_tours, feature_pdf_flyers, feature_crm_sync, price_cents) 
VALUES 
('free', 'Free to try', 1, 3, false, false, false, false, false, false, false, false, 0),
('starter', 'Basic plan for individuals', 2, 10, true, false, true, false, false, false, false, false, 3900),
('growth', 'For small agencies', 5, 50, true, true, true, false, true, true, true, true, 9900),
('agency', 'For real estate companies', 20, 200, true, true, true, true, true, true, true, true, 19900),
('enterprise', 'For large networks (contact us)', 999, 9999, true, true, true, true, true, true, true, true, 39900)
ON CONFLICT (name) DO NOTHING;

