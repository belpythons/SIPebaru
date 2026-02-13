CREATE OR REPLACE FUNCTION public.setup_first_admin(_user_id uuid, _username text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_count integer;
  user_email text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('setup_first_admin'));
  
  SELECT COUNT(*) INTO admin_count FROM public.user_roles WHERE role IN ('admin', 'admin_utama');
  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists. Use login instead.';
  END IF;

  -- Get email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;

  INSERT INTO public.profiles (user_id, username, email)
  VALUES (_user_id, _username, user_email)
  ON CONFLICT (user_id) DO UPDATE
    SET username = EXCLUDED.username,
        email = EXCLUDED.email,
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin_utama')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$function$;