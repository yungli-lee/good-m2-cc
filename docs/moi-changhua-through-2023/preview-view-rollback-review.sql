-- REVIEW ONLY. Not applied. Existing owner/grants/options must remain unchanged.
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
  WHERE NOT (source_record_key ~~ 'moi:%'::text AND (EXISTS ( SELECT 1
           FROM moi_real_price_transactions canonical
          WHERE canonical.source_record_key = SUBSTRING(t.source_record_key FROM 5)))) AND NOT (source_record_key ~~ 'moi:a:n:%'::text AND (EXISTS ( SELECT 1
           FROM moi_real_price_transactions canonical
          WHERE canonical.source_record_key = replace(t.source_record_key, 'moi:a:n:'::text, 'n:a:'::text) AND NOT canonical.dataset_type IS DISTINCT FROM t.dataset_type AND NOT canonical.county IS DISTINCT FROM t.county AND NOT canonical.district IS DISTINCT FROM t.district AND NOT canonical.transaction_date IS DISTINCT FROM t.transaction_date AND NOT canonical.total_price_ntd IS DISTINCT FROM t.total_price_ntd AND NOT canonical.land_area_sqm IS DISTINCT FROM t.land_area_sqm AND NOT canonical.building_area_sqm IS DISTINCT FROM t.building_area_sqm)));
