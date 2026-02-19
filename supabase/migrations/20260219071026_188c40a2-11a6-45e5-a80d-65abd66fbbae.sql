
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
  
  -- Count existing complaints in the same reported_at year and add 1
  SELECT COUNT(*) + 1 INTO counter 
  FROM public.complaints
  WHERE EXTRACT(YEAR FROM reported_at) = report_year_int;
  
  -- Generate new ticket number
  new_number := LPAD(counter::TEXT, 4, '0') || '/JOR-ADKOR/' || report_month || '/' || report_year;
  
  -- Check for collision and increment if needed (safety net)
  WHILE EXISTS (SELECT 1 FROM public.complaints WHERE ticket_number = new_number) LOOP
    counter := counter + 1;
    new_number := LPAD(counter::TEXT, 4, '0') || '/JOR-ADKOR/' || report_month || '/' || report_year;
  END LOOP;
  
  RETURN new_number;
END;
$function$;
