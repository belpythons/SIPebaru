
-- Add NPK column to complaints table
ALTER TABLE public.complaints ADD COLUMN npk text;

-- Add NPK column to profiles table
ALTER TABLE public.profiles ADD COLUMN npk text;

-- Update the INSERT policy to allow npk
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
  ((kompartemen IS NULL) OR (length(kompartemen) <= 120)) AND
  ((npk IS NULL) OR ((length(TRIM(BOTH FROM npk)) >= 1) AND (length(TRIM(BOTH FROM npk)) <= 50)))
);
