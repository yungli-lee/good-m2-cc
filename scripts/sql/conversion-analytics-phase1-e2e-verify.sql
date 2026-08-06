-- Read-only Preview E2E evidence for the dedicated test campaign.
select event_id, event_name, visitor_id, session_id, property_id, utm_source, utm_medium,
       utm_campaign, utm_content, environment, is_bot, is_internal, occurred_at
from public.analytics_events
where utm_campaign = 'analytics_phase1_preview_test'
order by occurred_at, received_at;

select visitor_id, session_id, count(*) as event_count,
       count(*) filter (where event_name = 'page_view') as page_views,
       count(*) filter (where event_name = 'inquiry_created') as inquiry_created_count
from public.analytics_events
where utm_campaign = 'analytics_phase1_preview_test'
group by visitor_id, session_id;

select i.id as inquiry_id, i.visitor_id, i.session_id, i.property_id, i.attribution_status,
       la.id as attribution_id, la.first_source, la.lead_source, la.last_source,
       la.first_touch_event_id, la.lead_touch_event_id, la.last_non_direct_event_id
from public.inquiries i
left join public.lead_attributions la on la.inquiry_id = i.id
where i.id in (
  select distinct inquiry_id from public.analytics_events
  where utm_campaign = 'analytics_phase1_preview_test' and inquiry_id is not null
);

select event_id, count(*) as duplicate_count
from public.analytics_events
where utm_campaign = 'analytics_phase1_preview_test'
group by event_id having count(*) > 1;

select environment, is_bot, is_internal, count(*)
from public.analytics_events
where utm_campaign = 'analytics_phase1_preview_test'
group by environment, is_bot, is_internal;
