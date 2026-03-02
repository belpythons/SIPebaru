-- =============================================================================
-- SIPebaru: Master Schema (Consolidated)
-- Sistem Pengaduan Barang Rusak
-- =============================================================================
-- File ini adalah satu-satunya migrasi. Jalankan pada database Supabase kosong.
-- =============================================================================

-- =============================================
-- 1. ENUM TYPES
-- =============================================
CREATE TYPE public.complaint_status AS ENUM ('pending', 'processing', 'completed');
CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin', 'viewer');

-- =============================================
-- 2. TABEL: complaints
-- =============================================
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  complaint_code text NOT NULL UNIQUE,
  npk text,
  reporter_name text NOT NULL,
  department text NOT NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  description text,
  kompartemen text,
  status complaint_status NOT NULL DEFAULT 'pending',
  admin_note text,
  photo_url text,
  completion_photo_url text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

-- =============================================
-- 3. TABEL: profiles
-- =============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  npk text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

-- =============================================
-- 4. TABEL: user_roles
-- =============================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- =============================================
-- 5. TABEL: departments
-- =============================================
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

-- =============================================
-- 6. TABEL: members_batch
-- =============================================
CREATE TABLE public.members_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_induk text NOT NULL UNIQUE,
  nama text,
  unit_kerja text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

-- =============================================
-- 7. TABEL: complaint_history
-- =============================================
CREATE TABLE public.complaint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  old_status public.complaint_status,
  new_status public.complaint_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 8. TABEL: activity_logs
-- =============================================
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 9. TABEL: kop_surat_sequence
-- =============================================
CREATE TABLE public.kop_surat_sequence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  last_sequence integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kop_surat_sequence ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. INDEKS
-- =============================================
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_department ON public.complaints(department);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX idx_complaints_deleted_at ON public.complaints(deleted_at);
CREATE INDEX idx_complaints_reported_at ON public.complaints(reported_at);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_complaint_history_complaint_id ON public.complaint_history(complaint_id);
CREATE INDEX idx_members_batch_nomor_induk ON public.members_batch(nomor_induk);
CREATE INDEX idx_members_batch_deleted_at ON public.members_batch(deleted_at);
CREATE INDEX idx_departments_deleted_at ON public.departments(deleted_at);
CREATE INDEX idx_profiles_deleted_at ON public.profiles(deleted_at);

-- =============================================
-- 12. FUNGSI UTILITAS
-- =============================================

-- Trigger helper: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Cek role tunggal
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Cek multi-role (digunakan RLS)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- =============================================
-- 13. FUNGSI BISNIS
-- =============================================

-- Generate nomor tiket: 0001/JOR-ADKOR/FEB/2026
CREATE OR REPLACE FUNCTION public.generate_ticket_number(_report_date date DEFAULT CURRENT_DATE)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
  month_names TEXT[] := ARRAY['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  report_month TEXT;
  report_year TEXT;
  report_year_int INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(1234567890);

  report_month := month_names[EXTRACT(MONTH FROM _report_date)::INTEGER];
  report_year := EXTRACT(YEAR FROM _report_date)::TEXT;
  report_year_int := EXTRACT(YEAR FROM _report_date)::INTEGER;

  SELECT COUNT(*) + 1 INTO counter
  FROM public.complaints
  WHERE EXTRACT(YEAR FROM reported_at) = report_year_int;

  new_number := LPAD(counter::TEXT, 4, '0') || '/JOR-ADKOR/' || report_month || '/' || report_year;

  WHILE EXISTS (SELECT 1 FROM public.complaints WHERE ticket_number = new_number) LOOP
    counter := counter + 1;
    new_number := LPAD(counter::TEXT, 4, '0') || '/JOR-ADKOR/' || report_month || '/' || report_year;
  END LOOP;

  RETURN new_number;
END;
$$;

-- Generate kode pengaduan 5-digit unik
CREATE OR REPLACE FUNCTION public.generate_complaint_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := '0123456789';
  result TEXT := '';
  i INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    IF NOT EXISTS (SELECT 1 FROM public.complaints WHERE complaint_code = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Tidak dapat membuat kode pengaduan unik setelah % percobaan', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Generate nomor Kop Surat
CREATE OR REPLACE FUNCTION public.generate_kop_surat_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year integer;
  current_month integer;
  next_seq integer;
  month_abbr text;
  month_names text[] := ARRAY['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGS','SEP','OKT','NOV','DES'];
BEGIN
  current_year := EXTRACT(YEAR FROM now())::integer;
  current_month := EXTRACT(MONTH FROM now())::integer;
  month_abbr := month_names[current_month];

  INSERT INTO public.kop_surat_sequence (year, last_sequence)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  UPDATE public.kop_surat_sequence
  SET last_sequence = last_sequence + 1, updated_at = now()
  WHERE year = current_year
  RETURNING last_sequence INTO next_seq;

  RETURN LPAD(next_seq::text, 4, '0') || '/JOR-ADKOR/' || month_abbr || '/' || current_year::text;
END;
$$;

-- Cek status pengaduan via kode (publik)
CREATE OR REPLACE FUNCTION public.get_complaint_status(ticket_num text)
RETURNS TABLE(
  ticket_number text,
  complaint_code text,
  item_name text,
  department text,
  kompartemen text,
  status text,
  reported_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz,
  description text,
  completion_photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_term text;
BEGIN
  search_term := UPPER(TRIM(ticket_num));

  IF LENGTH(search_term) < 3 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.ticket_number,
    c.complaint_code,
    c.item_name,
    c.department,
    c.kompartemen,
    c.status::text,
    c.reported_at,
    c.processed_at,
    c.completed_at,
    c.description,
    c.completion_photo_url
  FROM complaints c
  WHERE UPPER(c.complaint_code) = search_term
  LIMIT 1;
END;
$$;

-- Setup admin pertama (first-time setup)
CREATE OR REPLACE FUNCTION public.setup_first_admin(_user_id uuid, _username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_count integer;
  user_email text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('setup_first_admin'));

  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles WHERE role IN ('admin', 'super_admin');

  IF admin_count > 0 THEN
    RAISE EXCEPTION 'Admin sudah ada. Gunakan halaman login.';
  END IF;

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
  VALUES (_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

-- =============================================
-- 14. TRIGGER: Log perubahan status pengaduan
-- =============================================
CREATE OR REPLACE FUNCTION public.log_complaint_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_name text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT username INTO admin_name
    FROM public.profiles
    WHERE user_id = auth.uid();

    INSERT INTO public.complaint_history (
      complaint_id, old_status, new_status,
      changed_by, changed_by_name, note
    ) VALUES (
      NEW.id, OLD.status, NEW.status,
      auth.uid(), COALESCE(admin_name, 'Sistem'),
      CASE
        WHEN NEW.status = 'processing' THEN 'Pengaduan mulai diproses'
        WHEN NEW.status = 'completed' THEN 'Pengaduan selesai diproses'
        ELSE 'Status diperbarui'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- 15. TRIGGERS
-- =============================================
CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_batch_updated_at
  BEFORE UPDATE ON public.members_batch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_log_complaint_status_change
  AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_status_change();

-- =============================================================================
-- 16. RLS POLICIES (Simplified)
-- =============================================================================
-- Prinsip:
--   - Admin & Super Admin digabung jadi satu policy menggunakan has_any_role()
--   - Viewer hanya bisa SELECT
--   - Publik (anon) hanya bisa INSERT pengaduan & SELECT untuk cek status
-- =============================================================================

-- ---- complaints ----

CREATE POLICY "Publik bisa submit pengaduan"
  ON public.complaints FOR INSERT
  WITH CHECK (
    ticket_number IS NOT NULL AND length(ticket_number) BETWEEN 1 AND 50
    AND reporter_name IS NOT NULL AND length(trim(reporter_name)) BETWEEN 1 AND 120
    AND department IS NOT NULL AND length(trim(department)) BETWEEN 1 AND 120
    AND item_name IS NOT NULL AND length(trim(item_name)) BETWEEN 1 AND 200
    AND quantity IS NOT NULL AND quantity > 0 AND quantity <= 100000
    AND (description IS NULL OR length(description) <= 2000)
    AND (kompartemen IS NULL OR length(kompartemen) <= 120)
    AND (npk IS NULL OR (length(trim(npk)) >= 1 AND length(trim(npk)) <= 50))
  );

CREATE POLICY "Publik bisa lihat pengaduan"
  ON public.complaints FOR SELECT
  USING (true);

CREATE POLICY "Admin/SA bisa update pengaduan"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Admin/SA bisa hapus pengaduan"
  ON public.complaints FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- ---- profiles ----

CREATE POLICY "Authenticated bisa lihat profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','viewer']::app_role[]));

CREATE POLICY "Admin/SA bisa insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Admin/SA bisa update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Admin/SA bisa delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- ---- user_roles ----

CREATE POLICY "Authenticated bisa lihat roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','viewer']::app_role[]));

CREATE POLICY "Admin/SA bisa insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Admin/SA bisa delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- ---- departments ----

CREATE POLICY "Publik bisa lihat unit kerja"
  ON public.departments FOR SELECT
  USING (true);

CREATE POLICY "Admin/SA bisa insert unit kerja"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Admin/SA bisa update unit kerja"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Admin/SA bisa delete unit kerja"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- ---- members_batch ----

CREATE POLICY "Publik bisa validasi nomor induk"
  ON public.members_batch FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "SA bisa kelola members batch"
  ON public.members_batch FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- ---- complaint_history ----

CREATE POLICY "Authenticated bisa lihat riwayat"
  ON public.complaint_history FOR SELECT
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin','viewer']::app_role[]));

CREATE POLICY "Admin/SA bisa insert riwayat"
  ON public.complaint_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- ---- activity_logs ----

CREATE POLICY "SA bisa lihat log aktivitas"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin/SA bisa insert log"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

CREATE POLICY "Anon bisa insert log badge"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- ---- kop_surat_sequence ----

CREATE POLICY "Admin/SA bisa akses kop surat"
  ON public.kop_surat_sequence FOR ALL
  TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','super_admin']::app_role[]));

-- =============================================================================
-- SELESAI - Master Schema SIPebaru
-- =============================================================================
