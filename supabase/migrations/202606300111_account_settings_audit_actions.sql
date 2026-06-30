alter type public.audit_action add value if not exists 'password_changed';
alter type public.audit_action add value if not exists 'password_change_failed';
alter type public.audit_action add value if not exists 'password_reset_email_sent';
