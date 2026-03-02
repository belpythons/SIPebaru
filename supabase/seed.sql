-- =============================================================================
-- Seed Data SIPebaru
-- Data dummy untuk testing, demo, dan chart visualization
-- =============================================================================

-- =============================================
-- 0. AKUN DUMMY (auth.users + profiles + user_roles)
--    Password semua akun: password123 (di-hash via pgcrypto)
-- =============================================
DO $$
DECLARE
  uid_superadmin uuid := gen_random_uuid();
  uid_admin      uuid := gen_random_uuid();
  uid_viewer     uuid := gen_random_uuid();
  -- Pre-computed bcrypt hash for 'password123'
  hashed_pw      text := '$2a$10$TheGjW.8zNWG8P/uiZsuouJ.w1c6u8pfH50CCHAbAnupwSIYYIkNa';
BEGIN
  -- ---- Insert auth.users ----
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, role, aud,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change_confirm_status,
    is_sso_user, is_anonymous
  ) VALUES
    (
      uid_superadmin, '00000000-0000-0000-0000-000000000000',
      'superadmin@sipebaru.com', hashed_pw,
      now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Budi IT"}'::jsonb,
      now(), now(),
      '', '',
      '', 0,
      false, false
    ),
    (
      uid_admin, '00000000-0000-0000-0000-000000000000',
      'admin.umum@sipebaru.com', hashed_pw,
      now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Siti Logistik"}'::jsonb,
      now(), now(),
      '', '',
      '', 0,
      false, false
    ),
    (
      uid_viewer, '00000000-0000-0000-0000-000000000000',
      'pimpinan@sipebaru.com', hashed_pw,
      now(), 'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"Bapak Direktur"}'::jsonb,
      now(), now(),
      '', '',
      '', 0,
      false, false
    )
  ON CONFLICT (id) DO NOTHING;

  -- ---- Insert auth.identities (Supabase Auth v2) ----
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES
    (
      gen_random_uuid(), uid_superadmin, uid_superadmin::text, 'email',
      jsonb_build_object('sub', uid_superadmin::text, 'email', 'superadmin@sipebaru.com'),
      now(), now(), now()
    ),
    (
      gen_random_uuid(), uid_admin, uid_admin::text, 'email',
      jsonb_build_object('sub', uid_admin::text, 'email', 'admin.umum@sipebaru.com'),
      now(), now(), now()
    ),
    (
      gen_random_uuid(), uid_viewer, uid_viewer::text, 'email',
      jsonb_build_object('sub', uid_viewer::text, 'email', 'pimpinan@sipebaru.com'),
      now(), now(), now()
    )
  ON CONFLICT DO NOTHING;

  -- ---- Insert public.profiles ----
  INSERT INTO public.profiles (user_id, username, email) VALUES
    (uid_superadmin, 'Budi IT',         'superadmin@sipebaru.com'),
    (uid_admin,      'Siti Logistik',   'admin.umum@sipebaru.com'),
    (uid_viewer,     'Bapak Direktur',  'pimpinan@sipebaru.com')
  ON CONFLICT (user_id) DO NOTHING;

  -- ---- Insert public.user_roles ----
  INSERT INTO public.user_roles (user_id, role) VALUES
    (uid_superadmin, 'super_admin'),
    (uid_superadmin, 'admin'),
    (uid_admin,      'admin'),
    (uid_viewer,     'viewer')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;


-- =============================================
-- 1. UNIT KERJA (Departments)
-- =============================================
INSERT INTO public.departments (name) VALUES
  ('Bagian Umum'),
  ('Bagian Keuangan'),
  ('Bagian Kepegawaian'),
  ('Bagian Perencanaan'),
  ('Bagian Hukum'),
  ('Bagian IT'),
  ('Bagian Logistik')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 2. MEMBERS BATCH (Nomor Induk untuk Portal Badge)
-- =============================================
INSERT INTO public.members_batch (nomor_induk, nama, unit_kerja) VALUES
  ('NIP001', 'Ahmad Fauzi', 'Bagian Umum'),
  ('NIP002', 'Siti Rahayu', 'Bagian Keuangan'),
  ('NIP003', 'Budi Santoso', 'Bagian Kepegawaian'),
  ('NIP004', 'Dewi Lestari', 'Bagian Perencanaan'),
  ('NIP005', 'Eko Prasetyo', 'Bagian Hukum'),
  ('NIP006', 'Fitri Handayani', 'Bagian IT'),
  ('NIP007', 'Gunawan Wibowo', 'Bagian Logistik'),
  ('NIP008', 'Hesti Purnama', 'Bagian Umum'),
  ('NIP009', 'Irfan Maulana', 'Bagian Keuangan'),
  ('NIP010', 'Joko Widodo', 'Bagian Kepegawaian'),
  ('NIP011', 'Kartini Sari', 'Bagian Perencanaan'),
  ('NIP012', 'Lukman Hakim', 'Bagian Hukum'),
  ('NIP013', 'Maya Putri', 'Bagian IT'),
  ('NIP014', 'Naufal Rahman', 'Bagian Logistik'),
  ('NIP015', 'Oktavia Dewi', 'Bagian Umum'),
  ('NIP016', 'Putri Amelia', 'Bagian Keuangan'),
  ('NIP017', 'Qodir Abidin', 'Bagian Kepegawaian'),
  ('NIP018', 'Rina Susanti', 'Bagian Perencanaan'),
  ('NIP019', 'Surya Adi', 'Bagian Hukum'),
  ('NIP020', 'Tina Marlina', 'Bagian IT'),
  ('NIP021', 'Umar Syaifudin', 'Bagian Logistik'),
  ('NIP022', 'Vina Anggraeni', 'Bagian Umum'),
  ('NIP023', 'Wahyu Nugroho', 'Bagian Keuangan'),
  ('NIP024', 'Xena Paramita', 'Bagian Kepegawaian'),
  ('NIP025', 'Yusuf Ibrahim', 'Bagian Perencanaan')
ON CONFLICT (nomor_induk) DO NOTHING;

-- =============================================
-- 3. PENGADUAN DUMMY (200+ records via generate_series)
--    Tersebar di 12 bulan terakhir, status & departemen acak
-- =============================================
INSERT INTO public.complaints (
  id,
  ticket_number,
  complaint_code,
  npk,
  reporter_name,
  department,
  item_name,
  quantity,
  description,
  status,
  admin_note,
  reported_at,
  processed_at,
  completed_at,
  created_at
)
SELECT
  gen_random_uuid(),

  -- Ticket number: SEED-YYYY-NNNN
  'SEED-' || EXTRACT(YEAR FROM report_date)::text || '-' || LPAD(s::text, 4, '0'),

  -- Complaint code: 5-digit zero-padded
  LPAD(((s * 7 + 13) % 100000)::text, 5, '0'),

  -- NPK
  'NIP' || LPAD(((s % 25) + 1)::text, 3, '0'),

  -- Reporter name (cycle through 25 names)
  (ARRAY[
    'Ahmad Fauzi','Siti Rahayu','Budi Santoso','Dewi Lestari','Eko Prasetyo',
    'Fitri Handayani','Gunawan Wibowo','Hesti Purnama','Irfan Maulana','Joko Widodo',
    'Kartini Sari','Lukman Hakim','Maya Putri','Naufal Rahman','Oktavia Dewi',
    'Putri Amelia','Qodir Abidin','Rina Susanti','Surya Adi','Tina Marlina',
    'Umar Syaifudin','Vina Anggraeni','Wahyu Nugroho','Xena Paramita','Yusuf Ibrahim'
  ])[(s % 25) + 1],

  -- Department (cycle through 7)
  (ARRAY[
    'Bagian Umum','Bagian Keuangan','Bagian Kepegawaian','Bagian Perencanaan',
    'Bagian Hukum','Bagian IT','Bagian Logistik'
  ])[(s % 7) + 1],

  -- Item name (cycle through 20 items)
  (ARRAY[
    'Printer Canon IP2770','Laptop Lenovo ThinkPad','AC Daikin 1.5 PK','Kursi Kantor Ergonomis',
    'Dispenser Miyako','Monitor Samsung 24"','Meja Kerja Besi','Scanner Epson L3210',
    'UPS APC 1200VA','Proyektor Infocus IN119HDG','Keyboard Logitech K120','CCTV Hikvision',
    'Server Rack 42U','Telepon Panasonic KX-TS505','Mesin Fotokopi Kyocera','Router TP-Link Archer',
    'Hard Disk External 1TB','Lampu TL Philips 36W','Filing Cabinet 4 Drawer','Mouse Wireless Logitech'
  ])[(s % 20) + 1],

  -- Quantity (1-5)
  (s % 5) + 1,

  -- Description
  'Deskripsi pengaduan dummy nomor ' || s || '. Barang mengalami kerusakan dan perlu perbaikan segera.',

  -- Status (roughly: 30% pending, 35% processing, 35% completed)
  (ARRAY['pending','processing','completed']::public.complaint_status[])
    [CASE
      WHEN (s * 17 + 3) % 100 < 30 THEN 1   -- pending
      WHEN (s * 17 + 3) % 100 < 65 THEN 2   -- processing
      ELSE 3                                   -- completed
    END],

  -- Admin note (null for pending, text for processing/completed)
  CASE
    WHEN (s * 17 + 3) % 100 < 30 THEN NULL
    ELSE 'Catatan admin: sedang ditindaklanjuti oleh teknisi.'
  END,

  -- reported_at: spread over last 12 months
  report_date,

  -- processed_at: 1-3 days after reported_at (only if not pending)
  CASE
    WHEN (s * 17 + 3) % 100 >= 30
    THEN report_date + ((s % 3) + 1) * interval '1 day'
    ELSE NULL
  END,

  -- completed_at: 3-7 days after reported_at (only if completed)
  CASE
    WHEN (s * 17 + 3) % 100 >= 65
    THEN report_date + ((s % 5) + 3) * interval '1 day'
    ELSE NULL
  END,

  -- created_at = reported_at
  report_date

FROM generate_series(1, 220) AS s,
LATERAL (
  SELECT (NOW() - (random() * interval '365 days'))::timestamptz AS report_date
) AS rd
ON CONFLICT (ticket_number) DO NOTHING;

-- =============================================
-- 4. KOP SURAT SEQUENCE
-- =============================================
INSERT INTO public.kop_surat_sequence (year, last_sequence)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;
