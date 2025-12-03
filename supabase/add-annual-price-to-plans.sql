-- ==========================================
-- ADD ANNUAL PRICE TO PLANS TABLE
-- ==========================================
-- This migration adds annual_price_cents column to plans table
-- Annual price represents the monthly price when paid annually (with 15% discount)
-- ==========================================

-- Add annual_price_cents column
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS annual_price_cents INT DEFAULT 0;

-- Update existing plans with annual prices (15% discount from monthly)
-- Formula: annual_price_cents = ROUND(price_cents * 0.85)
UPDATE plans 
SET annual_price_cents = ROUND(price_cents * 0.85)
WHERE annual_price_cents = 0 OR annual_price_cents IS NULL;

-- Set specific annual prices for each plan (based on 15% discount)
-- Free: 0 (no change)
UPDATE plans SET annual_price_cents = 0 WHERE name = 'free';

-- Starter: $39/month → $33/month when paid annually (3900 * 0.85 = 3315, rounded to 3300)
UPDATE plans SET annual_price_cents = 3300 WHERE name = 'starter';

-- Growth: $99/month → $84/month when paid annually (9900 * 0.85 = 8415, rounded to 8400)
UPDATE plans SET annual_price_cents = 8400 WHERE name = 'growth';

-- Agency: $199/month → $169/month when paid annually (19900 * 0.85 = 16915, rounded to 16900)
UPDATE plans SET annual_price_cents = 16900 WHERE name = 'agency';

-- Enterprise: $399/month → $339/month when paid annually (39900 * 0.85 = 33915, rounded to 33900)
UPDATE plans SET annual_price_cents = 33900 WHERE name = 'enterprise';

-- Add comment to column
COMMENT ON COLUMN plans.annual_price_cents IS 'Monthly price in cents when paid annually (with 15% discount). Same as price_cents for free plan.';

