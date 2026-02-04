-- =====================================================
-- FIX 1: PUBLIC_DATA_EXPOSURE - complaints table
-- =====================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view complaints by ticket number" ON public.complaints;

-- Create a secure RPC function for public ticket lookup
-- This returns ONLY non-sensitive fields needed for status checking
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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate input
  IF ticket_num IS NULL OR length(trim(ticket_num)) < 1 THEN
    RETURN;
  END IF;

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
  WHERE c.ticket_number ILIKE ticket_num
     OR c.ticket_number ILIKE ticket_num || '%'
  LIMIT 1;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.get_complaint_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_complaint_status(text) TO authenticated;

-- =====================================================
-- FIX 2: STORAGE_EXPOSURE - complaint-photos bucket
-- =====================================================

-- Make the bucket private (files still accessible via signed URLs)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'complaint-photos';

-- Drop the overly permissive view policy
DROP POLICY IF EXISTS "Anyone can view complaint photos" ON storage.objects;

-- Create policy so only admins can view photos directly
-- Public users will access photos via the completion_photo_url which uses signed URLs
CREATE POLICY "Admins can view complaint photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'complaint-photos' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Keep the upload policy for public complaint submissions (needed for complaint form)
-- But add file type validation
DROP POLICY IF EXISTS "Anyone can upload complaint photos" ON storage.objects;

CREATE POLICY "Anyone can upload complaint photos with validation"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'complaint-photos' AND
  -- Basic file extension validation (images only)
  (storage.extension(name) = 'jpg' OR 
   storage.extension(name) = 'jpeg' OR 
   storage.extension(name) = 'png' OR 
   storage.extension(name) = 'gif' OR 
   storage.extension(name) = 'webp')
);