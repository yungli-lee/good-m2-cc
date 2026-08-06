-- PREVIEW ONLY. Replace every placeholder with the exact IDs reported by E2E.
-- The guard deliberately aborts rather than running a broad campaign delete.
begin;
do $$ begin
  if '__EVENT_ID_1__' like '\_\_%' or '__INQUIRY_ID_1__' like '\_\_%' then
    raise exception 'Replace cleanup placeholders with exact Preview E2E IDs';
  end if;
end $$;

delete from public.lead_attributions
where inquiry_id in ('__INQUIRY_ID_1__'::uuid);

delete from public.analytics_events
where event_id in ('__EVENT_ID_1__'::uuid)
  and environment = 'preview'
  and (utm_campaign = 'analytics_phase1_preview_test' or event_name = 'inquiry_created');

delete from public.inquiries
where id in ('__INQUIRY_ID_1__'::uuid)
  and created_at >= '2026-08-06T00:00:00Z'::timestamptz;
commit;
