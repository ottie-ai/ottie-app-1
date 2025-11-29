-- ==========================================
-- MIGRATION: ADD SOFT DELETE SUPPORT
-- ==========================================
-- Run this in Supabase SQL Editor to add soft delete functionality
-- ==========================================

-- 1. Add deleted_at column to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN deleted_at timestamp with time zone;
  END IF;
END $$;

-- 2. Update RLS policies to filter deleted users
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

-- 3. Add policy for soft delete (update to anonymize)
DROP POLICY IF EXISTS "Users can soft delete own profile" ON profiles;
CREATE POLICY "Users can soft delete own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- 4. Create function to anonymize auth.users email (allows re-registration)
-- This function allows anonymization of email in auth.users from server actions
-- Required so users can re-register with the same email after account deletion
-- Profile remains anonymized (soft delete) for compliance/analytics
CREATE OR REPLACE FUNCTION public.anonymize_auth_user(user_uuid uuid, anonymized_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Anonymize email in auth.users so user can re-register with original email
  -- Profile remains anonymized (soft delete) for compliance/analytics
  UPDATE auth.users 
  SET email = anonymized_email,
      raw_user_meta_data = jsonb_build_object('deleted', true),
      updated_at = now()
  WHERE id = user_uuid;
END;
$$;

