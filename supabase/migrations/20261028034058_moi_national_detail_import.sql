-- Staging ingestion only. Caller privileges remain in force; no public EXECUTE.
create or replace function public.moi_import_national_chunk(
 p_archive_sha text, p_chunk_sha text, p_file_name text, p_source_period date, p_items jsonb
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare item jsonb; m jsonb; d jsonb; existing public.moi_real_price_transactions%rowtype;
 txid bigint; applied int:=0; preserved int:=0; detail_count int:=0; key text;
begin
 if current_user <> 'postgres' and auth.role() is distinct from 'service_role' then raise exception 'service_role only'; end if;
 if p_archive_sha !~ '^[a-f0-9]{64}$' or p_chunk_sha !~ '^[a-f0-9]{64}$' or p_source_period is null then raise exception 'invalid source'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'invalid batch'; end if;
 -- Same source/chunk is atomic and repeatable, including after a network timeout.
 perform pg_advisory_xact_lock(hashtextextended(p_archive_sha||p_chunk_sha,0));
 if exists(select 1 from moi_append_chunk_log where source_sha256=p_archive_sha and chunk_sha256=p_chunk_sha) then
  return jsonb_build_object('status','already_applied','processed',jsonb_array_length(p_items));
 end if;
 if pg_database_size(current_database())>7000000000 then raise exception 'ingestion_capacity_checkpoint_7GB'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  m:=item->'master';key:=m->>'source_key';
  if key is null or m->>'dataset_type' not in ('sale','presale','rental') or coalesce(m->>'county','')='' then raise exception 'invalid master'; end if;
  perform pg_advisory_xact_lock(hashtextextended(key,1));
  select * into existing from moi_real_price_transactions where source_record_key=key for update;
  if found then
   -- Never overwrite newer sources. Unknown legacy provenance is preserved on disagreement.
   if existing.source_period_date>p_source_period or (existing.source_period_date is null and existing.raw_record is distinct from m->'raw_record') then
    preserved:=preserved+1;continue;
   end if;
   txid:=existing.id;
  else
   insert into moi_real_price_transactions(source_record_key,county,district,transaction_date,dataset_type,target_category,raw_record)
   values(key,m->>'county',m->>'district',(m->>'transaction_date')::date,m->>'dataset_type',m->>'target_category',m->'raw_record') returning id into txid;
  end if;
  update moi_real_price_transactions set county=m->>'county',district=m->>'district',transaction_date=(m->>'transaction_date')::date,
   dataset_type=m->>'dataset_type',target_category=m->>'target_category',address_display=m->>'address_display',
   total_price_ntd=(m->>'amount_ntd')::numeric,unit_price_ntd_per_sqm=(m->>'unit_price')::numeric,
   land_area_sqm=(m->>'land_sqm')::numeric,building_area_sqm=(m->>'building_sqm')::numeric,
   parking_price_ntd=(m->>'parking_price')::numeric,building_pattern=m->>'building_type',
   floor_display=m->>'floor_display',community_name=m->>'community_name',land_section=m->>'land_section',
   building_age_years=(m->>'building_age')::numeric,source_period_date=p_source_period,
   raw_record=m->'raw_record',source_record_fingerprint=m->>'source_fingerprint' where id=txid;
  -- Replace this transaction's authoritative detail set atomically; row positions change between archives.
  delete from moi_transaction_details where transaction_id=txid;
  for d in select value from jsonb_array_elements(item->'details') loop
   if d->>'detail_type' not in ('land','building','parking') then raise exception 'invalid detail type'; end if;
   insert into moi_transaction_details(transaction_id,detail_type,source_detail_key,source_row_hash,detail_area_sqm,
    section_name,parcel_number,building_number,raw_record,ownership_share_numerator,ownership_share_denominator,parking_type,parking_price_ntd,parking_floor)
   values(txid,d->>'detail_type',d->>'source_key',d->>'fingerprint',(d->>'area')::numeric,
    d->>'section',d->>'parcel',d->>'building_number',d->'raw_record',(d->>'share_numerator')::bigint,(d->>'share_denominator')::bigint,
    d->>'parking_type',(d->>'parking_price')::bigint,d->>'parking_floor');
   detail_count:=detail_count+1;
  end loop;
  applied:=applied+1;
 end loop;
 insert into moi_append_chunk_log(source_sha256,chunk_sha256,file_name,master_count,detail_count)
 values(p_archive_sha,p_chunk_sha,p_file_name,applied,detail_count);
 return jsonb_build_object('status','applied','processed',applied+preserved,'applied',applied,'preserved_newer',preserved,'details',detail_count);
end $$;
revoke all on function public.moi_import_national_chunk(text,text,text,date,jsonb) from public,anon,authenticated;
grant execute on function public.moi_import_national_chunk(text,text,text,date,jsonb) to service_role;
