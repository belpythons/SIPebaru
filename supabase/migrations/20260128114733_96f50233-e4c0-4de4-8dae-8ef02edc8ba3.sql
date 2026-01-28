-- Create a security definer function to handle first admin setup
CREATE OR REPLACE FUNCTION public.setup_first_admin(
  _user_id uuid,
  _username text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Check if any admin already exists
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  
  -- Only allow if no admins exist
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Use login instead.';
  END IF;
  
  -- Insert profile
  INSERT INTO public.profiles (user_id, username)
  VALUES (_user_id, _username)
  ON CONFLICT (user_id) DO UPDATE SET username = _username;
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;