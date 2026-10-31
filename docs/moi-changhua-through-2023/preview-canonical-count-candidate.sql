-- REVIEW ONLY: not applied. No CREATE/ALTER/DROP or timeout changes.
-- Candidate count predicate; retain both canonical alias rules and all null-safe comparisons.
SELECT count(*)
FROM public.moi_real_price_transactions t
WHERE t.dataset_type = 'sale' AND t.county = '彰化縣'
AND NOT EXISTS (SELECT 1 FROM public.moi_real_price_transactions c WHERE t.source_record_key LIKE 'moi:%' AND c.source_record_key=substring(t.source_record_key FROM 5)) AND NOT EXISTS (SELECT 1 FROM public.moi_real_price_transactions c WHERE t.source_record_key LIKE 'moi:a:n:%' AND c.source_record_key=replace(t.source_record_key,'moi:a:n:','n:a:') AND c.dataset_type IS NOT DISTINCT FROM t.dataset_type AND c.county IS NOT DISTINCT FROM t.county AND c.district IS NOT DISTINCT FROM t.district AND c.transaction_date IS NOT DISTINCT FROM t.transaction_date AND c.total_price_ntd IS NOT DISTINCT FROM t.total_price_ntd AND c.land_area_sqm IS NOT DISTINCT FROM t.land_area_sqm AND c.building_area_sqm IS NOT DISTINCT FROM t.building_area_sqm);
