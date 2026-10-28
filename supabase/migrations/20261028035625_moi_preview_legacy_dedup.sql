create or replace view public.moi_preview_transactions with (security_invoker=true) as
select t.* from public.moi_real_price_transactions t
where not (t.source_record_key like 'moi:%' and exists(
 select 1 from public.moi_real_price_transactions canonical
 where canonical.source_record_key=substring(t.source_record_key from 5)
));
revoke all on public.moi_preview_transactions from public,anon,authenticated;
grant select on public.moi_preview_transactions to service_role;
