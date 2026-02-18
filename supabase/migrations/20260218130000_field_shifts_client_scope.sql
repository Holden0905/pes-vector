-- Add client_id to field_shifts for client-scoped ledger
ALTER TABLE public.field_shifts
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- Populate client_id from field_events for existing rows
UPDATE public.field_shifts fs
SET client_id = fe.client_id
FROM public.field_events fe
WHERE fs.field_event_id = fe.id AND fs.client_id IS NULL;

-- Switch unique constraint to (client_id, user_id, work_date)
DROP INDEX IF EXISTS public.field_shifts_event_user_date_unique;
CREATE UNIQUE INDEX IF NOT EXISTS field_shifts_client_user_date_unique
ON public.field_shifts (client_id, user_id, work_date);
