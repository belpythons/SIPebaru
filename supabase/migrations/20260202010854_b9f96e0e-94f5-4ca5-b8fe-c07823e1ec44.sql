-- Add kompartemen column to complaints table
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS kompartemen text;

-- Add photo_url column to complaints table
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for complaint photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaint-photos', 'complaint-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for complaint photos
CREATE POLICY "Anyone can upload complaint photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'complaint-photos');

CREATE POLICY "Anyone can view complaint photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'complaint-photos');

CREATE POLICY "Admins can delete complaint photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'complaint-photos' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Clear existing departments and insert new ones
DELETE FROM public.departments;

-- Insert all departments from the list
INSERT INTO public.departments (name) VALUES
('Kepala Satuan Pengawasan Intern'),
('Sekretaris Perusahaan'),
('Komp. Tata Kelola & Manajemen Risiko'),
('Dep. Manajemen Risiko Korporasi'),
('Staf Tata Kelola & Kepatuhan'),
('Dep. Hukum'),
('Dep. Administrasi Korporat'),
('Dep. Komunikasi Korporat'),
('Dep. Tanggung Jawab Sosial & Lingkungan'),
('Dep. Strategic Delivery Unit'),
('Dep. Audit Bisnis & Keuangan'),
('Dep. Konsultasi & Jaminan Kualitas'),
('Dep. Perencanaan & Monitoring'),
('Komp. Operasi 1'),
('Komp. Operasi 2'),
('Komp. HSE & Teknologi'),
('Komp. Pemeliharaan Pabrik'),
('Dep. Operasi Pabrik 1A'),
('Dep. Operasi Pabrik 2'),
('Dep. Operasi Pabrik 3'),
('Dep. Operasi Pabrik 4'),
('Dep. Operasi Pabrik 5'),
('Dep. Operasi Pabrik 6 / Ex P1'),
('Dep. Operasi Pabrik 7'),
('Dep. Peleburan & Pengapalan'),
('Dep. Operasi Shift'),
('Dep. Proses & Pengelolaan Energi'),
('Dep. Keselamatan & Kesehatan Kerja'),
('Dep. Laboratorium'),
('Dep. Lingkungan Hidup'),
('Dep. Inspeksi Teknik 1'),
('Dep. Inspeksi Teknik 2'),
('Dep. Perencanaan & Pengendalian Pemeliharaan'),
('Dep. Perencanaan & Pengendalian Turn Around'),
('Dep. Pengendalian Pabrik'),
('Dep. Pemeliharaan Mekanik'),
('Dep. Pemeliharaan Instrumen'),
('Dep. Pemeliharaan Listrik'),
('Dep. Bengkel'),
('Komp. Pengembangan & Portofolio Bisnis'),
('Komp. Rantai Pasok'),
('Komp. Transformasi Bisnis'),
('Komp. SBU Jasa Pelayanan Pabrik'),
('Dep. Pengembangan Korporat'),
('Dep. Portofolio Bisnis'),
('Dep. Hubungan Investor'),
('Dep. Perencanaan & Pergudangan'),
('Dep. Pengadaan Barang'),
('Dep. Pengadaan Jasa'),
('Dep. Sistem Manajemen Terpadu & Inovasi'),
('Dep. Riset'),
('Dep. Pengelolaan Pelanggan'),
('Staf Pengelolaan Transformasi Bisnis'),
('AVP IT PKT'),
('Dep. Bisnis & Administrasi'),
('Dep. Teknik & Kontrol Kualitas'),
('Dep. Manufacturing'),
('Dep. Rekayasa & Konstruksi'),
('Komp. Administrasi Keuangan'),
('Komp. Sumber Daya Manusia'),
('Komp. Umum'),
('Dep. Anggaran'),
('Dep. Keuangan'),
('Dep. Akuntansi'),
('Dep. Pelaporan Manajemen'),
('Dep. Administrasi Pemasaran & Penjualan'),
('Dep. Manajemen Pengembangan SDM'),
('Dep. Operasional SDM'),
('Dep. Pelayanan Umum'),
('Dep. Keamanan'),
('Dep. Manajemen Aset');

-- Update ticket number format function to use BR-XXXX format
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE 
      WHEN ticket_number ~ '^BR-[0-9]{4}$' THEN CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO counter FROM public.complaints;
  new_number := 'BR-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$function$;

-- Update RLS policy for complaints to include new columns
DROP POLICY IF EXISTS "Anyone can submit complaints" ON public.complaints;

CREATE POLICY "Anyone can submit complaints"
ON public.complaints
FOR INSERT
WITH CHECK (
  (ticket_number IS NOT NULL) AND
  ((length(ticket_number) >= 1) AND (length(ticket_number) <= 50)) AND
  (reporter_name IS NOT NULL) AND
  ((length(TRIM(BOTH FROM reporter_name)) >= 1) AND (length(TRIM(BOTH FROM reporter_name)) <= 120)) AND
  (department IS NOT NULL) AND
  ((length(TRIM(BOTH FROM department)) >= 1) AND (length(TRIM(BOTH FROM department)) <= 120)) AND
  (item_name IS NOT NULL) AND
  ((length(TRIM(BOTH FROM item_name)) >= 1) AND (length(TRIM(BOTH FROM item_name)) <= 200)) AND
  (quantity IS NOT NULL) AND (quantity > 0) AND (quantity <= 100000) AND
  ((description IS NULL) OR (length(description) <= 2000)) AND
  ((kompartemen IS NULL) OR (length(kompartemen) <= 120))
);

-- Add policy for public to view their own complaint by ticket number
CREATE POLICY "Anyone can view complaints by ticket number"
ON public.complaints
FOR SELECT
USING (true);