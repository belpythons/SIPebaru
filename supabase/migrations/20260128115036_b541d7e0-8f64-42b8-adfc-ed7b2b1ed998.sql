-- 1) Ensure profiles.user_id is unique so upserts/ON CONFLICT work reliably
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- 2) Recreate setup function to reliably upsert profile + assign admin role
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
$$;

-- 3) Tighten the public INSERT policy for complaints (still public, but not "WITH CHECK (true)")
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.complaints;
CREATE POLICY "Anyone can submit complaints"
ON public.complaints
FOR INSERT
WITH CHECK (
  ticket_number IS NOT NULL AND length(ticket_number) BETWEEN 1 AND 50
  AND reporter_name IS NOT NULL AND length(trim(reporter_name)) BETWEEN 1 AND 120
  AND department IS NOT NULL AND length(trim(department)) BETWEEN 1 AND 120
  AND item_name IS NOT NULL AND length(trim(item_name)) BETWEEN 1 AND 200
  AND quantity IS NOT NULL AND quantity > 0 AND quantity <= 100000
  AND (description IS NULL OR length(description) <= 2000)
);