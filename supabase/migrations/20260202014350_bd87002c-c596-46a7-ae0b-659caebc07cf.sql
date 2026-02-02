-- Add completed_at column for tracking when complaint is completed
ALTER TABLE public.complaints 
ADD COLUMN completed_at timestamp with time zone DEFAULT NULL;