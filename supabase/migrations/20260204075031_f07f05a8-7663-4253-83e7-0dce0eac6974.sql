-- Create users table for SIPEBARU
CREATE TABLE public.sipebaru_users (
  fid SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  npk TEXT UNIQUE NOT NULL,
  unit_kerja TEXT NOT NULL,
  rfid TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  status user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Constraint: at least one of RFID or Email must be provided
  CONSTRAINT rfid_or_email_required CHECK (rfid IS NOT NULL OR email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.sipebaru_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all users
CREATE POLICY "Admins can view all sipebaru users"
ON public.sipebaru_users
FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'admin_utama'));

-- Admin utama can update users (for approval/rejection)
CREATE POLICY "Admin utama can update sipebaru users"
ON public.sipebaru_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin_utama'));

-- Function to hash password
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Function to verify password
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN password_hash = crypt(password, password_hash);
END;
$$;

-- Function for SIPEBARU user authentication
CREATE OR REPLACE FUNCTION public.authenticate_sipebaru_user(
  login_identifier TEXT,
  login_password TEXT
)
RETURNS TABLE (
  fid INTEGER,
  nama TEXT,
  npk TEXT,
  unit_kerja TEXT,
  rfid TEXT,
  email TEXT,
  status user_status,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user RECORD;
BEGIN
  -- Find user by RFID or Email
  SELECT * INTO found_user
  FROM public.sipebaru_users u
  WHERE u.rfid = login_identifier OR u.email = login_identifier
  LIMIT 1;

  IF found_user IS NULL THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::user_status, 'Akun tidak ditemukan.'::TEXT;
    RETURN;
  END IF;

  -- Verify password
  IF NOT verify_password(login_password, found_user.password_hash) THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::user_status, 'Password salah.'::TEXT;
    RETURN;
  END IF;

  -- Check status
  IF found_user.status = 'pending' THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, found_user.status, 'Akun Anda belum diaktivasi oleh admin.'::TEXT;
    RETURN;
  END IF;

  IF found_user.status = 'rejected' THEN
    RETURN QUERY SELECT NULL::INTEGER, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, found_user.status, 'Akun Anda ditolak oleh admin.'::TEXT;
    RETURN;
  END IF;

  -- Success
  RETURN QUERY SELECT found_user.fid, found_user.nama, found_user.npk, found_user.unit_kerja, found_user.rfid, found_user.email, found_user.status, NULL::TEXT;
END;
$$;

-- Function to register new SIPEBARU user
CREATE OR REPLACE FUNCTION public.register_sipebaru_user(
  _nama TEXT,
  _npk TEXT,
  _unit_kerja TEXT,
  _rfid TEXT,
  _email TEXT,
  _password TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate at least RFID or Email is provided
  IF (_rfid IS NULL OR trim(_rfid) = '') AND (_email IS NULL OR trim(_email) = '') THEN
    RETURN QUERY SELECT false, 'RFID atau Email wajib diisi.'::TEXT;
    RETURN;
  END IF;

  -- Check NPK uniqueness
  IF EXISTS (SELECT 1 FROM public.sipebaru_users WHERE npk = _npk) THEN
    RETURN QUERY SELECT false, 'NPK sudah terdaftar.'::TEXT;
    RETURN;
  END IF;

  -- Check RFID uniqueness if provided
  IF _rfid IS NOT NULL AND trim(_rfid) != '' AND EXISTS (SELECT 1 FROM public.sipebaru_users WHERE rfid = _rfid) THEN
    RETURN QUERY SELECT false, 'RFID sudah terdaftar.'::TEXT;
    RETURN;
  END IF;

  -- Check Email uniqueness if provided
  IF _email IS NOT NULL AND trim(_email) != '' AND EXISTS (SELECT 1 FROM public.sipebaru_users WHERE email = _email) THEN
    RETURN QUERY SELECT false, 'Email sudah terdaftar.'::TEXT;
    RETURN;
  END IF;

  -- Insert new user
  INSERT INTO public.sipebaru_users (nama, npk, unit_kerja, rfid, email, password_hash)
  VALUES (
    _nama,
    _npk,
    _unit_kerja,
    NULLIF(trim(_rfid), ''),
    NULLIF(trim(_email), ''),
    hash_password(_password)
  );

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_sipebaru_users_updated_at
BEFORE UPDATE ON public.sipebaru_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();