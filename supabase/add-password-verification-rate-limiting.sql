-- Add rate limiting for password verification attempts
-- Prevents brute-force attacks on site passwords
-- Author: Security Audit 2025-12-09

-- Create table for password verification attempts
CREATE TABLE IF NOT EXISTS password_verification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_attempts_site_ip_time 
  ON password_verification_attempts(site_id, ip_address, created_at DESC);

-- Enable RLS
ALTER TABLE password_verification_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies (only server can write, no one can read)
CREATE POLICY "Only server can log attempts"
  ON password_verification_attempts
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false); -- No direct inserts from client

-- Function to check password verification rate limit
-- Returns true if request is allowed, false if rate limit exceeded
-- Limits: 5 failed attempts per site per IP per 15 minutes
CREATE OR REPLACE FUNCTION check_password_verification_rate_limit(
  p_site_id UUID,
  p_ip_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_count INT;
  v_limit INT := 5;
  v_window_minutes INT := 15;
  v_oldest_attempt TIMESTAMP WITH TIME ZONE;
  v_time_since_oldest INTERVAL;
  v_wait_minutes INT;
BEGIN
  -- Count failed attempts in the last 15 minutes
  SELECT COUNT(*)
  INTO v_failed_count
  FROM password_verification_attempts
  WHERE site_id = p_site_id
    AND ip_address = p_ip_address
    AND success = false
    AND created_at > now() - (v_window_minutes || ' minutes')::INTERVAL;
  
  -- If limit exceeded, return error with retry info
  IF v_failed_count >= v_limit THEN
    -- Get oldest failed attempt to calculate wait time
    SELECT created_at
    INTO v_oldest_attempt
    FROM password_verification_attempts
    WHERE site_id = p_site_id
      AND ip_address = p_ip_address
      AND success = false
      AND created_at > now() - (v_window_minutes || ' minutes')::INTERVAL
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Calculate wait time
    v_time_since_oldest := now() - v_oldest_attempt;
    v_wait_minutes := v_window_minutes - EXTRACT(EPOCH FROM v_time_since_oldest)::INT / 60;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Too many failed attempts. Please try again later.',
      'retry_after_minutes', GREATEST(v_wait_minutes, 1),
      'failed_count', v_failed_count,
      'limit', v_limit
    );
  END IF;
  
  -- Rate limit OK
  RETURN jsonb_build_object(
    'allowed', true,
    'failed_count', v_failed_count,
    'limit', v_limit
  );
END;
$$;

-- Function to log password verification attempt
CREATE OR REPLACE FUNCTION log_password_verification_attempt(
  p_site_id UUID,
  p_ip_address TEXT,
  p_success BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO password_verification_attempts (site_id, ip_address, success)
  VALUES (p_site_id, p_ip_address, p_success);
END;
$$;

-- Function to cleanup old password verification attempts (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_password_attempts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM password_verification_attempts
  WHERE created_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_password_verification_rate_limit(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_password_verification_attempt(UUID, TEXT, BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_password_attempts() TO authenticated;

-- Comment
COMMENT ON TABLE password_verification_attempts IS 'Rate limiting for site password verification - prevents brute-force attacks';
COMMENT ON FUNCTION check_password_verification_rate_limit(UUID, TEXT) IS 'Check if password verification is allowed (5 failed attempts per 15 minutes)';
COMMENT ON FUNCTION log_password_verification_attempt(UUID, TEXT, BOOLEAN) IS 'Log a password verification attempt';
COMMENT ON FUNCTION cleanup_old_password_attempts() IS 'Cleanup password verification attempts older than 7 days';
