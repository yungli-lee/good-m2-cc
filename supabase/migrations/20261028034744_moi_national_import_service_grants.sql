grant select,insert,update on public.moi_real_price_transactions to service_role;
grant select,insert,delete on public.moi_transaction_details to service_role;
grant select,insert on public.moi_append_chunk_log to service_role;
grant usage,select on sequence public.moi_real_price_transactions_id_seq,public.moi_transaction_details_id_seq,public.moi_append_chunk_log_id_seq to service_role;
