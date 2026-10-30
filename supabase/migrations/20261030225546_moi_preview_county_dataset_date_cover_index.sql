-- Preview/staging only: niorteztdbuyusemsgwa.
-- Applied through Supabase MCP; filename matches its recorded migration version.
-- Keep all rows, columns, view predicates, grants and query timeouts unchanged.
-- Covers exact counts and stable date/id pagination without reading wide raw JSON.
SET LOCAL lock_timeout = '2s';
DO $guard$
BEGIN
  IF pg_database_size(current_database()) >= 6950000000 THEN
    RAISE EXCEPTION 'Capacity safety guard: insufficient headroom below 7GB';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid <> pg_backend_pid()
             AND state = 'active' AND backend_type = 'client backend') THEN
    RAISE EXCEPTION 'Other active SQL detected; defer index creation';
  END IF;
END
$guard$;
CREATE INDEX moi_preview_county_dataset_date_cover_idx
ON public.moi_real_price_transactions
(county, dataset_type, transaction_date DESC, id DESC)
INCLUDE (source_record_key, district, target_category, total_price_ntd,
         land_area_sqm, building_area_sqm, building_age_years);

-- Rollback, if this index is no longer wanted:
-- DROP INDEX public.moi_preview_county_dataset_date_cover_idx;
