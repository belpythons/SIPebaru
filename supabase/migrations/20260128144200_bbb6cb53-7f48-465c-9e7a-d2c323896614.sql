-- Create departments table
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
CREATE POLICY "Anyone can view departments"
ON public.departments
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert departments"
ON public.departments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update departments"
ON public.departments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete departments"
ON public.departments
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing departments from complaints
INSERT INTO public.departments (name)
SELECT DISTINCT department FROM public.complaints
WHERE department IS NOT NULL AND department != ''
ON CONFLICT (name) DO NOTHING;