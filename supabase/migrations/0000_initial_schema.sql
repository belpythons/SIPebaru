-- =============================================================================
-- SIPebaru: Skema Database Lengkap (Squashed)
-- Sistem Pengaduan Barang Rusak
-- =============================================================================
-- File ini adalah konsolidasi dari seluruh migrasi pengembangan.
-- Jalankan file ini SATU KALI pada database Supabase yang masih kosong.
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
-- Daftar Nomor Induk untuk validasi Portal Badge
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
-- Riwayat perubahan status pengaduan
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
-- Log semua aksi penting di sistem
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
-- Nomor urut Kop Surat per tahun, auto-reset
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
-- 11. INDEKS B-TREE
-- Optimasi kueri pada kolom yang sering difilter
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

-- Fungsi update_updated_at (trigger helper)
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

-- Fungsi pengecekan role tunggal
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

-- Fungsi pengecekan multi-role
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

  -- Hitung jumlah pengaduan di tahun yang sama + 1
  SELECT COUNT(*) + 1 INTO counter
  FROM public.complaints
  WHERE EXTRACT(YEAR FROM reported_at) = report_year_int;

  new_number := LPAD(counter::TEXT, 4, '0') || '/JOR-ADKOR/' || report_month || '/' || report_year;

  -- Cek tabrakan dan increment jika perlu
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

-- Generate nomor Kop Surat: 0001/JOR-ADKOR/JAN/2026
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

  -- Insert baris tahun baru jika belum ada
  INSERT INTO public.kop_surat_sequence (year, last_sequence)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  -- Lock baris dan increment secara atomik
  UPDATE public.kop_surat_sequence
  SET last_sequence = last_sequence + 1, updated_at = now()
  WHERE year = current_year
  RETURNING last_sequence INTO next_seq;

  RETURN LPAD(next_seq::text, 4, '0') || '/JOR-ADKOR/' || month_abbr || '/' || current_year::text;
END;
$$;

-- Cek status pengaduan via kode (untuk publik)
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

-- =============================================
-- 16. RLS POLICIES: complaints
-- =============================================

-- Publik bisa submit pengaduan (dengan validasi input)
CREATE POLICY "Siapa saja bisa submit pengaduan"
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

-- Publik bisa melihat pengaduan (untuk cek status)
CREATE POLICY "Siapa saja bisa lihat pengaduan"
  ON public.complaints FOR SELECT
  USING (true);

-- Admin bisa lihat semua pengaduan
CREATE POLICY "Admin bisa lihat semua pengaduan"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin dan Viewer bisa lihat pengaduan (non-deleted)
CREATE POLICY "Super Admin dan Viewer bisa lihat pengaduan"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
    AND deleted_at IS NULL
  );

-- Admin bisa update pengaduan
CREATE POLICY "Admin bisa update pengaduan"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa update pengaduan
CREATE POLICY "Super Admin bisa update pengaduan"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admin bisa hapus pengaduan
CREATE POLICY "Admin bisa hapus pengaduan"
  ON public.complaints FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa hapus pengaduan
CREATE POLICY "Super Admin bisa hapus pengaduan"
  ON public.complaints FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 17. RLS POLICIES: profiles
-- =============================================

-- Admin bisa lihat semua profiles
CREATE POLICY "Admin bisa lihat profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin dan Viewer bisa lihat profiles
CREATE POLICY "Super Admin dan Viewer bisa lihat profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
  );

-- Admin bisa insert profiles
CREATE POLICY "Admin bisa insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa insert profiles
CREATE POLICY "Super Admin bisa insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admin bisa update profiles
CREATE POLICY "Admin bisa update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa update profiles
CREATE POLICY "Super Admin bisa update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Admin bisa delete profiles
CREATE POLICY "Admin bisa delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa delete profiles
CREATE POLICY "Super Admin bisa delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 18. RLS POLICIES: user_roles
-- =============================================

-- Admin bisa lihat user roles
CREATE POLICY "Admin bisa lihat user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin dan Viewer bisa lihat user roles
CREATE POLICY "Super Admin dan Viewer bisa lihat roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
  );

-- Admin bisa insert user roles
CREATE POLICY "Admin bisa insert user roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa insert roles
CREATE POLICY "Super Admin bisa insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Admin bisa delete user roles
CREATE POLICY "Admin bisa delete user roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Super Admin bisa delete roles
CREATE POLICY "Super Admin bisa delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 19. RLS POLICIES: departments
-- =============================================

-- Siapa saja bisa lihat unit kerja (publik)
CREATE POLICY "Siapa saja bisa lihat unit kerja"
  ON public.departments FOR SELECT
  USING (true);

-- Super Admin dan Viewer bisa lihat unit kerja (non-deleted)
CREATE POLICY "Super Admin dan Viewer bisa lihat unit kerja"
  ON public.departments FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
    AND deleted_at IS NULL
  );

-- Admin bisa kelola unit kerja
CREATE POLICY "Admin bisa insert unit kerja"
  ON public.departments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin bisa update unit kerja"
  ON public.departments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin bisa delete unit kerja"
  ON public.departments FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Super Admin bisa kelola unit kerja
CREATE POLICY "Super Admin bisa insert unit kerja"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super Admin bisa update unit kerja"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super Admin bisa delete unit kerja"
  ON public.departments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 20. RLS POLICIES: members_batch
-- =============================================

CREATE POLICY "Siapa saja bisa validasi nomor induk"
  ON public.members_batch FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Super Admin kelola members batch"
  ON public.members_batch FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- =============================================
-- 21. RLS POLICIES: complaint_history
-- =============================================

CREATE POLICY "Admin bisa lihat riwayat pengaduan"
  ON public.complaint_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'viewer')
    )
  );

CREATE POLICY "Sistem bisa insert riwayat"
  ON public.complaint_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 22. RLS POLICIES: activity_logs
-- =============================================

CREATE POLICY "Super Admin bisa lihat log aktivitas"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Admin bisa insert log aktivitas"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Anon bisa insert log badge"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 23. RLS POLICIES: kop_surat_sequence
-- =============================================

CREATE POLICY "Admin bisa akses sequence kop surat"
  ON public.kop_surat_sequence FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- =============================================
-- 24. STORAGE BUCKET: complaint-photos
-- =============================================
-- CATATAN: Bucket storage harus dibuat melalui Supabase Dashboard
-- atau menggunakan Supabase CLI. Buat bucket bernama 'complaint-photos'
-- dengan pengaturan publik (public bucket).
-- =============================================================================
-- SELESAI - Skema database SIPebaru siap digunakan
-- =============================================================================
