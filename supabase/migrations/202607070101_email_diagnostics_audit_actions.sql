alter type public.audit_action add value if not exists 'inquiry_create';
alter type public.audit_action add value if not exists 'inquiry_email_sent';
alter type public.audit_action add value if not exists 'inquiry_email_failed';
alter type public.audit_action add value if not exists 'email_test_sent';
alter type public.audit_action add value if not exists 'email_test_failed';

notify pgrst, 'reload schema';
