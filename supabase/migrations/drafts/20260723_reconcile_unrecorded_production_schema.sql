-- DRAFT ONLY. NOT PART OF THE EXECUTABLE MIGRATION SEQUENCE.
-- Target use: isolated staging after explicit approval.
-- Never run this file directly against Production.
--
-- Latest Production catalog evidence confirms that every other effect from
-- 202607070101_email_diagnostics_audit_actions and the ten other unrecorded
-- migrations is already present. Keep this draft limited to these four labels.

alter type public.audit_action add value if not exists 'inquiry_email_sent';
alter type public.audit_action add value if not exists 'inquiry_email_failed';
alter type public.audit_action add value if not exists 'email_test_sent';
alter type public.audit_action add value if not exists 'email_test_failed';
