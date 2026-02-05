-- Add complaint_code column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'complaints' 
    AND column_name = 'complaint_code'
  ) THEN
    ALTER TABLE public.complaints ADD COLUMN complaint_code TEXT UNIQUE;
  END IF;
END $$;

-- Create function to generate random alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_complaint_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
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
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.complaints WHERE complaint_code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique complaint code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$;

-- Update existing complaints with random codes if they don't have one
UPDATE public.complaints 
SET complaint_code = public.generate_complaint_code()
WHERE complaint_code IS NULL;

-- Make complaint_code NOT NULL after populating existing data
ALTER TABLE public.complaints 
ALTER COLUMN complaint_code SET NOT NULL;

COMMENT ON FUNCTION public.generate_complaint_code() IS 'Generates a unique 5-character alphanumeric code for complaints';