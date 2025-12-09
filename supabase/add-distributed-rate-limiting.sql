-- Add distributed rate limiting using Supabase
-- Replaces in-memory rate limiting in middleware with database-backed solution
-- Author: Security Audit 2025-12-09

-- Create table for rate limiting records
CREATE TABLE IF NOT EXISTS rate_limit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Composite unique constraint for IP + endpoint + window
  UNIQUE (ip_address, endpoint, window_start)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint_window 
  ON rate_limit_records(ip_address, endpoint, window_start DESC);

-- Enable RLS
ALTER TABLE rate_limit_records ENABLE ROW LEVEL SECURITY;

-- RLS policies (server-only access)
CREATE POLICY "Server can manage rate limits"
  ON rate_limit_records
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- Function to check and update rate limit
-- Returns JSONB with: { allowed: boolean, current_count: int, limit: int, reset_time: timestamp }
CREATE OR REPLACE FUNCTION check_and_update_rate_limit(
  p_ip_address TEXT,
  p_endpoint TEXT,
  p_limit INT,
  p_window_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_window_end TIMESTAMP WITH TIME ZONE;
  v_current_count INT;
BEGIN
  -- Calculate current window boundaries
  v_window_start := date_trunc('second', v_now - (EXTRACT(EPOCH FROM v_now)::INT % p_window_seconds) * INTERVAL '1 second');
  v_window_end := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;
  
  -- Try to get existing record for this window
  SELECT * INTO v_record
  FROM rate_limit_records
  WHERE ip_address = p_ip_address
    AND endpoint = p_endpoint
    AND window_start = v_window_start
  FOR UPDATE;
  
  IF FOUND THEN
    -- Record exists - check if limit exceeded
    IF v_record.request_count >= p_limit THEN
      -- Rate limit exceeded
      RETURN jsonb_build_object(
        'allowed', false,
        'current_count', v_record.request_count,
        'limit', p_limit,
        'reset_time', v_window_end,
        'retry_after_seconds', EXTRACT(EPOCH FROM (v_window_end - v_now))::INT
      );
    ELSE
      -- Increment count
      UPDATE rate_limit_records
      SET request_count = request_count + 1,
          updated_at = v_now
      WHERE id = v_record.id;
      
      RETURN jsonb_build_object(
        'allowed', true,
        'current_count', v_record.request_count + 1,
        'limit', p_limit,
        'reset_time', v_window_end
      );
    END IF;
  ELSE
    -- No record exists - create new one
    INSERT INTO rate_limit_records (
      ip_address,
      endpoint,
      request_count,
      window_start,
      window_end
    ) VALUES (
      p_ip_address,
      p_endpoint,
      1,
      v_window_start,
      v_window_end
    );
    
    RETURN jsonb_build_object(
      'allowed', true,
      'current_count', 1,
      'limit', p_limit,
      'reset_time', v_window_end
    );
  END IF;
END;
$$;

-- Function to cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM rate_limit_records
  WHERE window_end < now() - INTERVAL '1 hour';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_update_rate_limit(TEXT, TEXT, INT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO authenticated;

-- Comments
COMMENT ON TABLE rate_limit_records IS 'Distributed rate limiting records - replaces in-memory Map in middleware';
COMMENT ON FUNCTION check_and_update_rate_limit(TEXT, TEXT, INT, INT) IS 'Check and update rate limit for IP/endpoint combination';
COMMENT ON FUNCTION cleanup_old_rate_limits() IS 'Cleanup rate limit records older than 1 hour';

-- Example usage:
-- SELECT check_and_update_rate_limit('1.2.3.4', '/login', 15, 900); -- 15 requests per 15 minutes
