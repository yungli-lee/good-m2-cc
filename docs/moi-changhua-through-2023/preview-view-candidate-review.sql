-- REVIEW ONLY: NOT APPLIED. Staging niorteztdbuyusemsgwa only.
-- Preserve existing columns, types, owner, ACL and options; no GRANT/timeout changes.
-- Requires explicit authorization and remaining equivalence validation before execution.
CREATE OR REPLACE VIEW public.moi_preview_transactions AS
 SELECT id,
    source_record_key,
    import_batch_id,
    county,
    district,
    address_display,
    community_name,
    transaction_date,
    building_type,
    transaction_type,
    total_price_ntd,
    unit_price_ntd_per_sqm,
    building_area_sqm,
    land_area_sqm,
    parking_price_ntd,
    latitude,
    longitude,
    location_precision,
    raw_record,
    source_updated_at,
    created_at,
    dataset_type,
    source_record_fingerprint,
    road_name,
    land_section,
    target_category,
    building_completion_date,
    building_age_years,
    building_pattern,
    source_period_date,
    floor_display
   FROM moi_real_price_transactions t
  WHERE NOT EXISTS (SELECT 1 FROM public.moi_real_price_transactions c WHERE t.source_record_key LIKE 'moi:%' AND c.source_record_key=substring(t.source_record_key FROM 5)) AND NOT EXISTS (SELECT 1 FROM public.moi_real_price_transactions c WHERE t.source_record_key LIKE 'moi:a:n:%' AND c.source_record_key=replace(t.source_record_key,'moi:a:n:','n:a:') AND c.dataset_type IS NOT DISTINCT FROM t.dataset_type AND c.county IS NOT DISTINCT FROM t.county AND c.district IS NOT DISTINCT FROM t.district AND c.transaction_date IS NOT DISTINCT FROM t.transaction_date AND c.total_price_ntd IS NOT DISTINCT FROM t.total_price_ntd AND c.land_area_sqm IS NOT DISTINCT FROM t.land_area_sqm AND c.building_area_sqm IS NOT DISTINCT FROM t.building_area_sqm);
