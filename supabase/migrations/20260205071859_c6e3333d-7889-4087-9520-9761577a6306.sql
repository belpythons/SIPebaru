-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS public.get_complaint_status(text);

-- Update get_complaint_status to include complaint_code in return
CREATE OR REPLACE FUNCTION public.get_complaint_status(ticket_num text)
RETURNS TABLE(
  ticket_number text,
  complaint_code text,
  item_name text,
  department text,
  kompartemen text,
  status text,
  reported_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz,
  description text,
  completion_photo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  search_term text;
BEGIN
  search_term := UPPER(TRIM(ticket_num));
  
  -- Minimum 3 characters for security
  IF LENGTH(search_term) < 3 THEN
    RETURN;
  END IF;
  
  -- Search by complaint_code (exact match, case-insensitive)
  RETURN QUERY
  SELECT 
    c.ticket_number,
    c.complaint_code,
    c.item_name,
    c.department,
    c.kompartemen,
    c.status::text,
    c.reported_at,
    c.processed_at,
    c.completed_at,
    c.description,
    c.completion_photo_url
  FROM complaints c
  WHERE UPPER(c.complaint_code) = search_term
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_complaint_status(text) IS 'Search complaint by complaint_code (5-char unique code). Requires exact match with minimum 3 characters.';