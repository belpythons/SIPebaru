-- =============================================================================
-- Seed Data SIPebaru
-- Data dummy untuk testing, demo, dan chart visualization
-- =============================================================================
-- CATATAN: Tidak ada akun dummy. Gunakan /setup untuk membuat Super Admin pertama.
-- =============================================================================

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
  ('847291', 'Ahmad Fauzi', 'Bagian Umum'),
  ('193847', 'Siti Rahayu', 'Bagian Keuangan'),
  ('562034', 'Budi Santoso', 'Bagian Kepegawaian'),
  ('718493', 'Dewi Lestari', 'Bagian Perencanaan'),
  ('304958', 'Eko Prasetyo', 'Bagian Hukum'),
  ('629174', 'Fitri Handayani', 'Bagian IT'),
  ('485012', 'Gunawan Wibowo', 'Bagian Logistik'),
  ('937261', 'Hesti Purnama', 'Bagian Umum'),
  ('150483', 'Irfan Maulana', 'Bagian Keuangan'),
  ('274936', 'Joko Widodo', 'Bagian Kepegawaian'),
  ('861502', 'Kartini Sari', 'Bagian Perencanaan'),
  ('493718', 'Lukman Hakim', 'Bagian Hukum'),
  ('726305', 'Maya Putri', 'Bagian IT'),
  ('318649', 'Naufal Rahman', 'Bagian Logistik'),
  ('654271', 'Oktavia Dewi', 'Bagian Umum'),
  ('509832', 'Putri Amelia', 'Bagian Keuangan'),
  ('182746', 'Qodir Abidin', 'Bagian Kepegawaian'),
  ('947013', 'Rina Susanti', 'Bagian Perencanaan'),
  ('361829', 'Surya Adi', 'Bagian Hukum'),
  ('875604', 'Tina Marlina', 'Bagian IT'),
  ('420197', 'Umar Syaifudin', 'Bagian Logistik'),
  ('693540', 'Vina Anggraeni', 'Bagian Umum'),
  ('538021', 'Wahyu Nugroho', 'Bagian Keuangan'),
  ('206483', 'Xena Paramita', 'Bagian Kepegawaian'),
  ('741956', 'Yusuf Ibrahim', 'Bagian Perencanaan')
ON CONFLICT (nomor_induk) DO NOTHING;

-- =============================================
-- 3. PENGADUAN DUMMY (300 records via generate_series)
--    Tersebar merata di 12 bulan terakhir
--    Format ticket_number: LPAD(id,4,'0')/JOR-ADKOR/BULAN/TAHUN
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

  -- ticket_number: 0001/JOR-ADKOR/BULAN/TAHUN
  LPAD(s::text, 4, '0') || '/JOR-ADKOR/' ||
  (ARRAY['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGS','SEP','OKT','NOV','DES'])[
    EXTRACT(MONTH FROM report_date)::integer
  ] || '/' ||
  EXTRACT(YEAR FROM report_date)::text,

  -- complaint_code: 5-digit unik (kombinasi s agar tidak bentrok)
  LPAD(((s * 7 + 13) % 100000)::text, 5, '0'),

  -- NPK (cycle through 25 NPK 6-digit)
  (ARRAY[
    '847291','193847','562034','718493','304958',
    '629174','485012','937261','150483','274936',
    '861502','493718','726305','318649','654271',
    '509832','182746','947013','361829','875604',
    '420197','693540','538021','206483','741956'
  ])[(s % 25) + 1],

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

  -- reported_at: distribusi merata ke 12 bulan terakhir
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

FROM generate_series(1, 300) AS s,
LATERAL (
  -- Distribusi merata: s % 12 menentukan bulan ke belakang (0-11),
  -- ditambah variasi hari (1-28) agar tidak semua di tanggal sama
  SELECT (
    date_trunc('month', NOW()) - ((s % 12) || ' months')::interval
    + (((s * 13 + 7) % 28) || ' days')::interval
    + (((s * 11 + 5) % 24) || ' hours')::interval
  )::timestamptz AS report_date
) AS rd
ON CONFLICT (ticket_number) DO NOTHING;

-- =============================================
-- 4. KOP SURAT SEQUENCE
-- =============================================
INSERT INTO public.kop_surat_sequence (year, last_sequence)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;
