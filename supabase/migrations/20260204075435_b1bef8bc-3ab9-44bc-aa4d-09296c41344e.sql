-- Update setup_first_admin to also add admin_utama role
CREATE OR REPLACE FUNCTION public.setup_first_admin(_user_id uuid, _username text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_count integer;
BEGIN
  -- Acquire exclusive advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('setup_first_admin'));
  
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role IN ('admin', 'admin_utama');
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Use login instead.';
  END IF;

  INSERT INTO public.profiles (user_id, username)
  VALUES (_user_id, _username)
  ON CONFLICT (user_id) DO UPDATE
    SET username = EXCLUDED.username,
        updated_at = now();

  -- Insert both admin and admin_utama roles for the first admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin_utama')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$function$;

-- Update RLS policy to allow admin (not just admin_utama) to view sipebaru_users
DROP POLICY IF EXISTS "Admins can view all sipebaru users" ON public.sipebaru_users;
CREATE POLICY "Admins can view all sipebaru users"
ON public.sipebaru_users
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_utama'));

-- Update RLS policy to allow admin_utama to update sipebaru_users
DROP POLICY IF EXISTS "Admin utama can update sipebaru users" ON public.sipebaru_users;
CREATE POLICY "Admin utama can update sipebaru users"
ON public.sipebaru_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin_utama'));