-- Fix race condition in setup_first_admin by adding advisory lock
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
  -- This ensures only one transaction can execute the admin check at a time
  PERFORM pg_advisory_xact_lock(hashtext('setup_first_admin'));
  
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Use login instead.';
  END IF;

  INSERT INTO public.profiles (user_id, username)
  VALUES (_user_id, _username)
  ON CONFLICT (user_id) DO UPDATE
    SET username = EXCLUDED.username,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$function$;