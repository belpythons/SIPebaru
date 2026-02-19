
CREATE OR REPLACE FUNCTION public.generate_ticket_number(_report_date date DEFAULT CURRENT_DATE)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_number TEXT;
  counter INTEGER;
  month_names TEXT[] := ARRAY['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  report_month TEXT;
  report_year TEXT;
  report_year_int INTEGER;
BEGIN
  -- Advisory lock to prevent race conditions on ticket number generation
  PERFORM pg_advisory_xact_lock(1234567890);
  
  -- Get month and year from the provided report date
  report_month := month_names[EXTRACT(MONTH FROM _report_date)::INTEGER];
  report_year := EXTRACT(YEAR FROM _report_date)::TEXT;
  report_year_int := EXTRACT(YEAR FROM _report_date)::INTEGER;
  
  -- Get the next sequential number for THIS YEAR only (reset per year)
  SELECT COALESCE(MAX(
    CASE 
      -- Handle new format: XXXX/JOR-ADKOR/MON/YYYY
      WHEN ticket_number ~ '^[0-9]+/JOR-ADKOR/' THEN 
        CAST(SPLIT_PART(ticket_number, '/', 1) AS INTEGER)
      -- Handle old format: XXXX/ADKOR/Mon/YYYY
      WHEN ticket_number ~ '^[0-9]+/ADKOR/' THEN 
        CAST(SPLIT_PART(ticket_number, '/', 1) AS INTEGER)
      -- Handle old format: BR-XXXX for backward compatibility
      WHEN ticket_number ~ '^BR-[0-9]{4}$' THEN 
        CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO counter 
  FROM public.complaints
  WHERE EXTRACT(YEAR FROM reported_at) = report_year_int;
  
  -- Generate new ticket number: 0001/JOR-ADKOR/MMM/YYYY (4 digits)
  new_number := LPAD(counter::TEXT, 4, '0') || '/JOR-ADKOR/' || report_month || '/' || report_year;
  
  RETURN new_number;
END;
$function$;
