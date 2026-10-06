-- PREVIEW ONLY. Exact-ID cleanup for Conversion Analytics Phase 1 E2E.
-- No dates, wildcards, or campaign-wide deletes are used.
begin;

delete from public.lead_attributions
where inquiry_id = any (array[
  '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
  '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
  'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
  'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
]);

delete from public.analytics_events
where environment = 'preview'
  and event_id = any (array[
    '10000000-0000-4000-8000-000000000001'::uuid,
    '10000000-0000-4000-8000-000000000011'::uuid,
    '10000000-0000-4000-8000-000000000012'::uuid,
    '10000000-0000-4000-8000-000000000013'::uuid,
    '10000000-0000-4000-8000-000000000014'::uuid,
    '10000000-0000-4000-8000-000000000021'::uuid,
    '10000000-0000-4000-8000-000000000022'::uuid,
    '10000000-0000-4000-8000-000000000023'::uuid,
    '10000000-0000-4000-8000-000000000031'::uuid,
    '10000000-0000-4000-8000-000000000099'::uuid,
    '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
    '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
    'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
    'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
  ])
  and (
    utm_campaign = 'analytics_phase1_preview_test'
    or event_name = 'inquiry_created'
  );

delete from public.inquiries
where id = any (array[
    '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
    '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
    'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
    'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
  ])
  and form_type = 'analytics-preview-e2e'
  and source_page like '/properties/property-ms5gs5v7?e2e=%';

commit;

-- Post-cleanup proof: all test rows are gone and the original seven remain.
select count(*) as remaining_test_events
from public.analytics_events
where environment = 'preview'
  and (
    utm_campaign = 'analytics_phase1_preview_test'
    or event_id = any (array[
      '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
      '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
      'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
      'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
    ])
  );

select count(*) as remaining_test_inquiries
from public.inquiries
where id = any (array[
  '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
  '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
  'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
  'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
]);

select count(*) as remaining_test_attributions
from public.lead_attributions
where inquiry_id = any (array[
  '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
  '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
  'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
  'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
]);

select count(*) as original_inquiry_count_after_cleanup
from public.inquiries;
