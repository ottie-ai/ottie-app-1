-- ==========================================
-- RENAME feature_custom_domain TO feature_custom_brand_domain
-- AND ADD feature_custom_property_domain
-- ==========================================
-- This migration:
-- 1. Renames feature_custom_domain to feature_custom_brand_domain
-- 2. Adds feature_custom_property_domain as a new boolean column
-- ==========================================

-- Rename the existing column
ALTER TABLE plans 
RENAME COLUMN feature_custom_domain TO feature_custom_brand_domain;

-- Add the new column for property domain feature
ALTER TABLE plans 
ADD COLUMN feature_custom_property_domain BOOLEAN DEFAULT FALSE;

-- Update existing data: preserve existing values for brand domain
-- (The rename already preserves the data, so we just need to set defaults for property domain)
-- All existing rows will have feature_custom_property_domain = false by default
-- You can update specific plans if needed:
-- UPDATE plans SET feature_custom_property_domain = true WHERE name IN ('growth', 'agency', 'enterprise');

