-- Preview-only, SELECT-only E2E evidence.
-- Every query is constrained by the dedicated campaign, environment, or exact
-- IDs returned by the Preview API. This file does not modify database state.

-- 1. Campaign events and the Case 1 / complete journeys.
select event_id, event_name, visitor_id, session_id, property_id, utm_source,
       utm_medium, utm_campaign, utm_content, environment, is_bot, is_internal,
       occurred_at, inquiry_id
from public.analytics_events
where environment = 'preview'
  and utm_campaign = 'analytics_phase1_preview_test'
order by occurred_at, received_at;

-- 2. Fixed duplicate request remains one database row.
select event_id, count(*) as row_count
from public.analytics_events
where environment = 'preview'
  and utm_campaign = 'analytics_phase1_preview_test'
  and event_id = '10000000-0000-4000-8000-000000000099'::uuid
group by event_id;

-- 3. Visitor/session journey counts.
select visitor_id, session_id, count(*) as event_count,
       count(*) filter (where event_name = 'page_view') as page_views,
       count(*) filter (where event_name = 'view_property') as property_views,
       count(*) filter (where event_name = 'view_property_media') as media_views,
       count(*) filter (where event_name = 'click_line') as line_clicks,
       count(*) filter (where event_name = 'submit_inquiry') as inquiry_submits
from public.analytics_events
where environment = 'preview'
  and utm_campaign = 'analytics_phase1_preview_test'
group by visitor_id, session_id
order by visitor_id, session_id;

-- 4/5. Inquiry linkage and immutable attribution snapshots.
select i.id as inquiry_id, i.visitor_id, i.session_id, i.property_id,
       i.source_page, i.attribution_status, i.created_at,
       la.id as attribution_id, la.first_source, la.first_medium,
       la.first_campaign, la.lead_source, la.lead_medium, la.lead_campaign,
       la.last_source, la.last_medium, la.last_campaign,
       la.first_touch_event_id, la.lead_touch_event_id,
       la.last_non_direct_event_id, la.first_seen_at, la.inquiry_at
from public.inquiries i
left join public.lead_attributions la on la.inquiry_id = i.id
where i.id = any (array[
  '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
  '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
  'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
  'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
])
order by i.created_at;

-- 6. Attribution status distribution for exact test inquiries.
select attribution_status, count(*) as inquiry_count
from public.inquiries
where id = any (array[
  '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
  '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
  'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
  'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
])
group by attribution_status
order by attribution_status;

-- 7. No campaign event escaped Preview.
select environment, count(*) as event_count
from public.analytics_events
where utm_campaign = 'analytics_phase1_preview_test'
group by environment
order by environment;

-- 8. Event payloads contain none of the prohibited top-level PII keys.
select event_id,
       event_properties ?| array['name','phone','email','message','password','token','cookie','dom','html','form_data']
         as has_sensitive_key
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
  )
order by event_id;

-- 9. Bot/internal rows are excluded from eligible test journeys.
select is_bot, is_internal, count(*) as event_count
from public.analytics_events
where environment = 'preview'
  and utm_campaign = 'analytics_phase1_preview_test'
group by is_bot, is_internal
order by is_bot, is_internal;

-- 10. The four exact E2E inquiries are additive; the original count remains 7.
select
  count(*) as total_inquiries_before_cleanup,
  count(*) filter (where id <> all (array[
    '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
    '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
    'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
    'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
  ])) as original_inquiry_count,
  count(*) filter (where id = any (array[
    '65e701ea-9121-4d5a-b94e-96a6deb0532b'::uuid,
    '2054b3b4-8662-4af9-9ab0-bb32eee037b8'::uuid,
    'ef6b25f8-d01d-479d-84fa-c9e34ef43f0a'::uuid,
    'c001cb95-4410-4275-9180-60df19fa45fe'::uuid
  ])) as e2e_inquiry_count
from public.inquiries;
