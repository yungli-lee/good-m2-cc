-- Keep the database enum aligned with the property editor and schema.
alter type public.property_type add value if not exists 'industrial_land';
alter type public.property_type add value if not exists 'farmhouse';
