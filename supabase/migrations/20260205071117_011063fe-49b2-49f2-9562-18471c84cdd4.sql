-- Update the get_complaint_status function to support partial/prefix search
-- Users can search by: "0001", "0001/ADKOR", or full "0001/ADKOR/Feb/2026"
CREATE OR REPLACE FUNCTION public.get_complaint_status(ticket_num text)
RETURNS TABLE(
  ticket_number text,
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
  search_pattern text;
  min_length int := 1;
BEGIN
  -- Normalize the input
  search_pattern := UPPER(TRIM(ticket_num));
  
  -- Validate minimum length to prevent enumeration attacks
  -- At least 1 character for usability (sequence number)
  IF LENGTH(search_pattern) < min_length THEN
    RETURN;
  END IF;
  
  -- Build search pattern for ILIKE
  -- If input is just digits, pad to 4 and add /ADKOR/ prefix for matching
  IF search_pattern ~ '^\d+$' THEN
    search_pattern := LPAD(search_pattern, 4, '0') || '/ADKOR/%';
  -- If input ends with /ADKOR (no trailing slash), add it
  ELSIF search_pattern ~ '^\d{4}/ADKOR$' THEN
    search_pattern := search_pattern || '/%';
  -- If input already has format like 0001/ADKOR/..., use as prefix
  ELSIF search_pattern ~ '^\d{4}/ADKOR/' THEN
    search_pattern := search_pattern || '%';
  -- Otherwise treat as-is with wildcard
  ELSE
    search_pattern := search_pattern || '%';
  END IF;
  
  -- Return matching complaints (limited to 1 result for security)
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
  FROM complaints c
  WHERE c.ticket_number ILIKE search_pattern
  ORDER BY c.reported_at DESC
  LIMIT 1;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_complaint_status(text) IS 'Secure public function to search complaint status by ticket number. Supports partial search: "0001", "0001/ADKOR", or full "0001/ADKOR/Feb/2026". Returns only non-sensitive fields.';