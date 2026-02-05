-- Create a secure view for sipebaru_users that excludes password_hash
-- This ensures admins can manage users without seeing their password hashes
CREATE OR REPLACE VIEW public.sipebaru_users_safe
WITH (security_invoker = on) AS
SELECT 
  fid,
  nama,
  npk,
  unit_kerja,
  rfid,
  email,
  status,
  created_at,
  updated_at
FROM public.sipebaru_users;

-- Add comment explaining the view's purpose
COMMENT ON VIEW public.sipebaru_users_safe IS 'Secure view of sipebaru_users that excludes password_hash. Use this view for all admin queries.';