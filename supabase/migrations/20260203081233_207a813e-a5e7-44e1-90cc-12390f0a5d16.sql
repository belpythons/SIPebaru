-- Update generate_ticket_number to use 4 digits (0001 format)
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER;
  month_names TEXT[] := ARRAY['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  current_month TEXT;
  current_year TEXT;
BEGIN
  -- Get current month abbreviation and year
  current_month := month_names[EXTRACT(MONTH FROM now())::INTEGER];
  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Get the next sequential number (overall count + 1)
  SELECT COALESCE(MAX(
    CASE 
      -- Handle new format: XXXX/ADKOR/Mon/YYYY
      WHEN ticket_number ~ '^[0-9]+/ADKOR/' THEN 
        CAST(SPLIT_PART(ticket_number, '/', 1) AS INTEGER)
      -- Handle old format: BR-XXXX for backward compatibility
      WHEN ticket_number ~ '^BR-[0-9]{4}$' THEN 
        CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO counter FROM public.complaints;
  
  -- Generate new ticket number: 0001/ADKOR/Mon/YYYY (4 digits)
  new_number := LPAD(counter::TEXT, 4, '0') || '/ADKOR/' || current_month || '/' || current_year;
  
  RETURN new_number;
END;
$function$;