-- Remove expired consent archives, cascading to messages.
-- Requires pg_cron extension, installed in the Supabase database.
select cron.schedule(
  'concierge-consent-retention-daily',
  '15 3 * * *',
  $$delete from public.concierge_consented_sessions where expires_at < now()$$
);
