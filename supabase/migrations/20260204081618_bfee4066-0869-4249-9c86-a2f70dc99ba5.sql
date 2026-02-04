-- Add status column to profiles table for admin approval workflow
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' 
CHECK (status IN ('pending', 'active', 'rejected'));

-- Add email column to profiles for reference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update existing profiles to be active (they were created by existing admins)
UPDATE public.profiles SET status = 'active' WHERE status IS NULL;