-- Seed field_event_checklist_templates (program_type = 'all' for all events)
INSERT INTO public.field_event_checklist_templates (program_type, section, label, sort_order) VALUES
  ('all', 'Pre-Monitoring', 'Sign Out TVA/PDA', 1),
  ('all', 'Pre-Monitoring', 'Print Drawings', 2),
  ('all', 'Pre-Monitoring', 'Check Schedule and Date of Last Run EOP', 3),
  ('all', 'Pre-Monitoring', 'Check Follow-Up Requirements', 4),
  ('all', 'Pre-Monitoring', 'Check Components on Removal for Return to Service', 5),
  ('all', 'Post-Monitoring', 'Verify Reason for Untested Components', 6);
