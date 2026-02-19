
-- Drop the trigger that overwrites ticket_number on insert
-- The ticket number is now generated in the application layer with the report date
DROP TRIGGER IF EXISTS trigger_set_ticket_number ON public.complaints;

-- Also drop the trigger function since it's no longer needed
DROP FUNCTION IF EXISTS public.set_ticket_number();
