-- Add column for completion photo (photo after repair/completion)
ALTER TABLE public.complaints 
ADD COLUMN completion_photo_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.complaints.completion_photo_url IS 'Photo URL of the completed/repaired item';