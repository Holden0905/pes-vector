-- Add drift_check and summary to field_shifts
ALTER TABLE public.field_shifts
ADD COLUMN IF NOT EXISTS drift_check boolean NOT NULL DEFAULT false;

ALTER TABLE public.field_shifts
ADD COLUMN IF NOT EXISTS summary text;

-- Unique constraint for upsert (field_event_id, user_id, work_date)
CREATE UNIQUE INDEX IF NOT EXISTS field_shifts_event_user_date_unique
ON public.field_shifts (field_event_id, user_id, work_date);
