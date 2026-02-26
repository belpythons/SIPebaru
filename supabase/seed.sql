-- =============================================================================
-- Seed Data SIPebaru
-- Data dummy untuk testing dan demo
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
-- 3. PENGADUAN (Complaints)
-- Nomor tiket, pelapor, departemen, item, status bervariasi
-- =============================================
INSERT INTO public.complaints (ticket_number, reporter_name, department, item_name, quantity, description, status, admin_note, reported_at, created_at)
VALUES
  -- Pending
  ('PB-20260101-0001', 'Ahmad Fauzi', 'Bagian Umum', 'Printer Canon IP2770', 2, 'Printer macet dan tidak bisa mencetak. Sudah dicoba reset tapi tetap error.', 'pending', NULL, '2026-01-05 08:30:00+07', '2026-01-05 08:30:00+07'),
  ('PB-20260115-0002', 'Siti Rahayu', 'Bagian Keuangan', 'Laptop Lenovo ThinkPad', 1, 'Layar laptop retak setelah terjatuh dari meja. Perlu diganti LCD.', 'pending', NULL, '2026-01-15 09:15:00+07', '2026-01-15 09:15:00+07'),
  ('PB-20260120-0003', 'Budi Santoso', 'Bagian Kepegawaian', 'AC Daikin 1.5 PK', 1, 'AC tidak dingin lagi, sudah 2 minggu. Diduga freon habis.', 'pending', NULL, '2026-01-20 10:00:00+07', '2026-01-20 10:00:00+07'),
  ('PB-20260125-0004', 'Dewi Lestari', 'Bagian Perencanaan', 'Kursi Kantor Ergonomis', 3, 'Roda kursi patah dan sandaran sudah tidak bisa dikunci posisi.', 'pending', NULL, '2026-01-25 14:30:00+07', '2026-01-25 14:30:00+07'),
  ('PB-20260201-0005', 'Eko Prasetyo', 'Bagian Hukum', 'Dispenser Miyako Hot & Cool', 1, 'Tidak bisa memanaskan air lagi. Elemen pemanas rusak.', 'pending', NULL, '2026-02-01 08:00:00+07', '2026-02-01 08:00:00+07'),
  ('PB-20260210-0006', 'Fitri Handayani', 'Bagian IT', 'Monitor Samsung 24"', 2, 'Monitor berkedip-kedip dan kadang mati sendiri.', 'pending', NULL, '2026-02-10 11:30:00+07', '2026-02-10 11:30:00+07'),
  ('PB-20260215-0007', 'Gunawan Wibowo', 'Bagian Logistik', 'Meja Kerja Besi', 1, 'Kaki meja patah. Meja sudah miring dan tidak stabil.', 'pending', NULL, '2026-02-15 13:00:00+07', '2026-02-15 13:00:00+07'),

  -- Processing
  ('PB-20260103-0008', 'Hesti Purnama', 'Bagian Umum', 'Scanner Epson L3210', 1, 'Scanner tidak terdeteksi komputer. Sudah ganti kabel USB.', 'processing', 'Sedang dicek oleh teknisi. Kemungkinan driver perlu diperbarui.', '2026-01-03 09:00:00+07', '2026-01-03 09:00:00+07'),
  ('PB-20260110-0009', 'Irfan Maulana', 'Bagian Keuangan', 'UPS APC 1200VA', 2, 'UPS tidak mau menyala. Baterai sudah lebih dari 2 tahun.', 'processing', 'Baterai pengganti sudah dipesan, estimasi tiba 3 hari.', '2026-01-10 10:45:00+07', '2026-01-10 10:45:00+07'),
  ('PB-20260118-0010', 'Joko Widodo', 'Bagian Kepegawaian', 'Proyektor Infocus IN119HDG', 1, 'Lampu proyektor redup dan gambar buram. Sudah dibersihkan lensa.', 'processing', 'Penggantian lampu sedang diproses. Menunggu persetujuan anggaran.', '2026-01-18 15:00:00+07', '2026-01-18 15:00:00+07'),
  ('PB-20260122-0011', 'Kartini Sari', 'Bagian Perencanaan', 'Keyboard Logitech K120', 5, 'Beberapa tombol keyboard tidak berfungsi (Enter, Space, Backspace).', 'processing', 'Keyboard pengganti sudah tersedia, akan didistribusikan besok.', '2026-01-22 08:30:00+07', '2026-01-22 08:30:00+07'),
  ('PB-20260202-0012', 'Lukman Hakim', 'Bagian Hukum', 'CCTV Hikvision', 3, 'Kamera CCTV lantai 2 tidak bisa diakses dari DVR. Koneksi putus.', 'processing', 'Teknisi jaringan sudah dijadwalkan untuk perbaikan besok pagi.', '2026-02-02 09:30:00+07', '2026-02-02 09:30:00+07'),
  ('PB-20260212-0013', 'Maya Putri', 'Bagian IT', 'Server Rack 42U', 1, 'Kipas pendingin rack berisik dan panas berlebihan.', 'processing', 'Fan module baru sudah diorder. Sementara menggunakan kipas tambahan.', '2026-02-12 16:00:00+07', '2026-02-12 16:00:00+07'),

  -- Completed
  ('PB-20260102-0014', 'Naufal Rahman', 'Bagian Logistik', 'Telepon Panasonic KX-TS505', 2, 'Suara terputus-putus saat menelepon. Kabel sudah dicek.', 'completed', 'Unit telepon sudah diganti dengan yang baru. Masalah teratasi.', '2026-01-02 11:00:00+07', '2026-01-02 11:00:00+07'),
  ('PB-20260108-0015', 'Oktavia Dewi', 'Bagian Umum', 'Mesin Fotokopi Kyocera', 1, 'Paper jam berulang-ulang. Roller sudah aus.', 'completed', 'Roller sudah diganti oleh vendor resmi. Mesin sudah normal.', '2026-01-08 14:00:00+07', '2026-01-08 14:00:00+07'),
  ('PB-20260112-0016', 'Putri Amelia', 'Bagian Keuangan', 'Router TP-Link Archer C80', 1, 'WiFi lambat dan sering disconnect. Sudah restart berkali-kali.', 'completed', 'Router diganti baru. Konfigurasi jaringan sudah diperbarui.', '2026-01-12 10:30:00+07', '2026-01-12 10:30:00+07'),
  ('PB-20260116-0017', 'Qodir Abidin', 'Bagian Kepegawaian', 'Hard Disk External 1TB', 4, 'Hard disk tidak terdeteksi komputer. Dataperlu diselamatkan.', 'completed', 'Data berhasil dipulihkan. Hard disk diganti baru.', '2026-01-16 09:00:00+07', '2026-01-16 09:00:00+07'),
  ('PB-20260121-0018', 'Rina Susanti', 'Bagian Perencanaan', 'Lampu TL Philips 36W', 10, 'Lampu ruangan berkedip dan beberapa sudah mati.', 'completed', 'Semua lampu sudah diganti. Ballast yang rusak juga sudah diperbaiki.', '2026-01-21 13:30:00+07', '2026-01-21 13:30:00+07'),
  ('PB-20260128-0019', 'Surya Adi', 'Bagian Hukum', 'Filling Cabinet 4 Drawer', 2, 'Kunci lemari macet dan laci tidak bisa ditutup rapat.', 'completed', 'Kunci dan rel laci sudah diperbaiki oleh tukang.', '2026-01-28 15:00:00+07', '2026-01-28 15:00:00+07'),
  ('PB-20260205-0020', 'Tina Marlina', 'Bagian IT', 'Mouse Wireless Logitech', 8, 'Mouse tidak responsif. Sensor optik sepertinya rusak.', 'completed', 'Semua mouse sudah diganti unit baru.', '2026-02-05 08:45:00+07', '2026-02-05 08:45:00+07'),
  ('PB-20260208-0021', 'Umar Syaifudin', 'Bagian Logistik', 'Brankas Chubb', 1, 'Kunci kombinasi tidak bisa dibuka. Mekanisme jammed.', 'completed', 'Tukang kunci spesialis sudah memperbaiki. Kombinasi sudah direset.', '2026-02-08 10:00:00+07', '2026-02-08 10:00:00+07'),
  ('PB-20260214-0022', 'Vina Anggraeni', 'Bagian Umum', 'Exhaust Fan Industrial', 3, 'Kipas exhaust berisik dan getaran berlebihan.', 'completed', 'Bearing kipas sudah diganti. Kipas kembali normal tanpa getaran.', '2026-02-14 11:15:00+07', '2026-02-14 11:15:00+07')
ON CONFLICT (ticket_number) DO NOTHING;

-- =============================================
-- 4. KOP SURAT SEQUENCE (Inisialisasi tahun saat ini)
-- =============================================
INSERT INTO public.kop_surat_sequence (year, last_sequence)
VALUES (2026, 0)
ON CONFLICT (year) DO NOTHING;
