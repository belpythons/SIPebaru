-- Fix ticket search partial matching vulnerability
-- Require exact ticket number match to prevent enumeration attacks

CREATE OR REPLACE FUNCTION public.get_complaint_status(ticket_num text)
 RETURNS TABLE(ticket_number text, item_name text, department text, kompartemen text, status text, reported_at timestamp with time zone, processed_at timestamp with time zone, completed_at timestamp with time zone, description text, completion_photo_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate input - require at least 10 characters for valid ticket number format
  IF ticket_num IS NULL OR length(trim(ticket_num)) < 10 THEN
    RETURN;
  END IF;

  -- Use exact match only to prevent ticket enumeration
  RETURN QUERY
  SELECT 
    c.ticket_number,
    c.item_name,
    c.department,
    c.kompartemen,
    c.status::text,
    c.reported_at,
    c.processed_at,
    c.completed_at,
    c.description,
    c.completion_photo_url
  FROM public.complaints c
  WHERE c.ticket_number = ticket_num
  LIMIT 1;
END;
$function$;