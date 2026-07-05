alter type public.property_status add value if not exists 'expired';

alter table public.properties
  add column if not exists expired_at timestamptz;

alter type public.audit_action add value if not exists 'property_auto_expired';
