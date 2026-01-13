-- Enable Realtime for production_logs table
-- This allows the Frontend (ProductionControl & Dashboard) to receive live updates

alter publication supabase_realtime add table public.production_logs;
