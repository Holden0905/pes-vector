-- Add found_date column to valve_followups (when issue was observed; due date presets use this as base)
ALTER TABLE public.valve_followups
ADD COLUMN IF NOT EXISTS found_date date DEFAULT current_date;
