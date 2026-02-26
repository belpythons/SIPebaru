-- =============================================================================
-- Migrasi SIPebaru: Refaktor Lengkap Database
-- Deskripsi: Menambahkan tabel baru, soft delete, RBAC 4-tier, indeks,
--            Kop Surat generator, riwayat pengaduan, dan log aktivitas.
-- =============================================================================

-- =============================================
-- 1. PERLUASAN ENUM app_role
-- Menambahkan role 'super_admin' (ganti admin_utama) dan 'viewer'
-- =============================================
ALTER TYPE public.app_role RENAME VALUE 'admin_utama' TO 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'viewer';

-- =============================================
-- 2. KOLOM SOFT DELETE
-- Menambahkan kolom deleted_at pada tabel utama
-- =============================================
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- =============================================
-- 3. TABEL BARU: members_batch
-- Menyimpan daftar Nomor Induk untuk validasi Portal Badge
-- =============================================
CREATE TABLE IF NOT EXISTS public.members_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_induk text NOT NULL UNIQUE,
  nama text,
  unit_kerja text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);

ALTER TABLE public.members_batch ENABLE ROW LEVEL SECURITY;

-- Anon bisa select untuk validasi Portal Badge
CREATE POLICY "Siapa saja bisa validasi nomor induk"
  ON public.members_batch FOR SELECT
  USING (deleted_at IS NULL);

-- Super Admin bisa kelola semua data batch
CREATE POLICY "Super Admin kelola members batch"
  ON public.members_batch FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Trigger updated_at
CREATE TRIGGER update_members_batch_updated_at
  BEFORE UPDATE ON public.members_batch
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. TABEL BARU: complaint_history
-- Mencatat setiap perubahan status pengaduan
-- =============================================
CREATE TABLE IF NOT EXISTS public.complaint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  old_status public.complaint_status,
  new_status public.complaint_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;

-- Admin dan Super Admin bisa melihat riwayat
CREATE POLICY "Admin bisa lihat riwayat pengaduan"
  ON public.complaint_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'viewer')
    )
  );

-- Sistem memasukkan riwayat via trigger (service role)
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
-- 5. TABEL BARU: activity_logs
-- Mencatat semua aksi penting admin
-- =============================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Hanya Super Admin bisa melihat log aktivitas
CREATE POLICY "Super Admin bisa lihat log aktivitas"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Admin dan Super Admin bisa insert log aktivitas
CREATE POLICY "Admin bisa insert log aktivitas"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Anon bisa insert log (untuk Portal Badge)
CREATE POLICY "Anon bisa insert log badge"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- =============================================
-- 6. TABEL BARU: kop_surat_sequence
-- Nomor urut Kop Surat per tahun, auto-reset
-- =============================================
CREATE TABLE IF NOT EXISTS public.kop_surat_sequence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  last_sequence integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kop_surat_sequence ENABLE ROW LEVEL SECURITY;

-- Admin dan Super Admin bisa akses sequence
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
-- 7. INDEKS B-TREE
-- Optimasi kueri pada kolom yang sering difilter
-- =============================================
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON public.complaints(department);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_deleted_at ON public.complaints(deleted_at);
CREATE INDEX IF NOT EXISTS idx_complaints_reported_at ON public.complaints(reported_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_id ON public.complaint_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_members_batch_nomor_induk ON public.members_batch(nomor_induk);
CREATE INDEX IF NOT EXISTS idx_members_batch_deleted_at ON public.members_batch(deleted_at);
CREATE INDEX IF NOT EXISTS idx_departments_deleted_at ON public.departments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);

-- =============================================
-- 8. FUNGSI: has_role (diperbarui)
-- Mendukung pengecekan multi-role termasuk super_admin dan viewer
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fungsi tambahan: cek apakah user punya salah satu dari beberapa role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- =============================================
-- 9. PERBARUI KEBIJAKAN RLS
-- Menambahkan akses super_admin dan viewer ke tabel yang ada
-- =============================================

-- Complaints: Super Admin dan Viewer juga bisa melihat
CREATE POLICY "Super Admin dan Viewer bisa lihat pengaduan"
  ON public.complaints FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
    AND deleted_at IS NULL
  );

-- Complaints: Super Admin bisa update
CREATE POLICY "Super Admin bisa update pengaduan"
  ON public.complaints FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Complaints: Super Admin bisa delete (soft delete)
CREATE POLICY "Super Admin bisa hapus pengaduan"
  ON public.complaints FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Profiles: Super Admin dan Viewer bisa lihat
CREATE POLICY "Super Admin dan Viewer bisa lihat profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
  );

-- Profiles: Super Admin bisa kelola
CREATE POLICY "Super Admin bisa insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super Admin bisa update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super Admin bisa delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- User roles: Super Admin dan Viewer bisa lihat
CREATE POLICY "Super Admin dan Viewer bisa lihat roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
  );

-- User roles: Super Admin bisa kelola
CREATE POLICY "Super Admin bisa insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super Admin bisa delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Departments: Super Admin dan Viewer bisa lihat
CREATE POLICY "Super Admin dan Viewer bisa lihat unit kerja"
  ON public.departments FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['super_admin', 'viewer']::app_role[])
    AND deleted_at IS NULL
  );

-- Departments: Super Admin bisa kelola
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
-- 10. FUNGSI: generate_kop_surat_number
-- Format: XXXX/JOR-ADKOR/MMM/YYYY
-- Menggunakan row-level locking untuk menghindari race condition
-- =============================================
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
  -- Daftar singkatan bulan Indonesia 3 huruf
  month_names text[] := ARRAY['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGS','SEP','OKT','NOV','DES'];
BEGIN
  current_year := EXTRACT(YEAR FROM now())::integer;
  current_month := EXTRACT(MONTH FROM now())::integer;
  month_abbr := month_names[current_month];

  -- Insert baris tahun baru jika belum ada
  INSERT INTO public.kop_surat_sequence (year, last_sequence)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;

  -- Lock baris untuk tahun ini dan increment secara atomik
  UPDATE public.kop_surat_sequence
  SET last_sequence = last_sequence + 1, updated_at = now()
  WHERE year = current_year
  RETURNING last_sequence INTO next_seq;

  -- Format: 0001/JOR-ADKOR/JAN/2025
  RETURN LPAD(next_seq::text, 4, '0') || '/JOR-ADKOR/' || month_abbr || '/' || current_year::text;
END;
$$;

-- =============================================
-- 11. TRIGGER: Log perubahan status pengaduan
-- Otomatis mencatat ke complaint_history saat status berubah
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
  -- Hanya catat jika status berubah
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Coba ambil nama admin yang melakukan perubahan
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

CREATE TRIGGER trigger_log_complaint_status_change
  AFTER UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.log_complaint_status_change();

-- =============================================
-- 12. PERBARUI FUNGSI setup_first_admin
-- Menggunakan role 'super_admin' bukan 'admin_utama'
-- =============================================
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

  -- Ambil email dari auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;

  INSERT INTO public.profiles (user_id, username, email)
  VALUES (_user_id, _username, user_email)
  ON CONFLICT (user_id) DO UPDATE
    SET username = EXCLUDED.username,
        email = EXCLUDED.email,
        updated_at = now();

  -- Berikan role admin dan super_admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;
