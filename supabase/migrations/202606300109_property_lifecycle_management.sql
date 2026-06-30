alter table public.properties
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists delete_reason text;

create index if not exists properties_deleted_at_idx
  on public.properties(deleted_at, updated_at desc);

alter type public.audit_action add value if not exists 'delete_property';
alter type public.audit_action add value if not exists 'restore_property';
alter type public.audit_action add value if not exists 'permanent_delete_property';
alter type public.audit_action add value if not exists 'unpublish_property';
alter type public.audit_action add value if not exists 'republish_property';
