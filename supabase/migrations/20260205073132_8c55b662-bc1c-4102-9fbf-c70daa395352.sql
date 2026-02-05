-- Update generate_complaint_code to use only 5 random digits
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

COMMENT ON FUNCTION public.generate_complaint_code() IS 'Generates a unique 5-digit numeric code for complaints';