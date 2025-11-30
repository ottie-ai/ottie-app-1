-- RLS Policy: Allow users to accept their own invitations
-- This policy allows a user to update invitation status to 'accepted'
-- if their email matches the invitation email and status is 'pending'

CREATE POLICY "Users can accept own invitation" ON invitations
  FOR UPDATE
  USING (
    -- User's email must match invitation email
    auth.jwt() ->> 'email' = email
    AND status = 'pending'  -- Can only accept pending invitations
    AND expires_at > now()  -- Invitation must not be expired
  )
  WITH CHECK (
    -- Can only set status to 'accepted'
    status = 'accepted'
    AND auth.jwt() ->> 'email' = email
  );

