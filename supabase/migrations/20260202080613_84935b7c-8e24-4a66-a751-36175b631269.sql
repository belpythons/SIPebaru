-- Add DELETE policy for admins on complaints table
CREATE POLICY "Admins can delete complaints"
ON public.complaints
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));