do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_assets_usage_type_check'
      and conrelid = 'public.media_assets'::regclass
  ) then
    alter table public.media_assets
      add constraint media_assets_usage_type_check check (
        usage_type in (
          'knowledge_hero',
          'knowledge_inline',
          'knowledge_gallery',
          'property_image',
          'property_cover',
          'property_floor_plan',
          'property_document_image',
          'company_logo',
          'company_line_qr',
          'hero_banner',
          'general'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analytics_events_event_name_check'
      and conrelid = 'public.analytics_events'::regclass
  ) then
    alter table public.analytics_events
      add constraint analytics_events_event_name_check check (
        event_name in (
          'property_view',
          'property_search',
          'knowledge_view',
          'line_click',
          'phone_click',
          'inquiry_submit',
          'featured_property_click',
          'share_click',
          'media_view',
          'admin_login'
        )
      );
  end if;
end $$;

alter table public.analytics_events
  drop constraint if exists analytics_events_search_query_length_check;

alter table public.analytics_events
  add constraint analytics_events_search_query_length_check check (
    search_query is null or char_length(search_query) <= 200
  ) not valid;

alter table public.analytics_events
  add column if not exists os text;

alter type public.audit_action add value if not exists 'media_replace';
