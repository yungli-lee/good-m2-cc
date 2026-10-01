-- Run against staging. Every fixture and update is rolled back.
begin;
insert into public.property_collections(id,slug,title,status) values
 ('bb91ce14-71ad-4654-9891-a09459e00b01','rls-test-draft','Draft fixture','draft'),
 ('bb91ce14-71ad-4654-9891-a09459e00b02','rls-test-published','Published fixture','published'),
 ('bb91ce14-71ad-4654-9891-a09459e00b03','rls-test-archived','Archived fixture','archived');
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$
begin
 if (select count(*) from public.property_collections where slug like 'rls-test-%') <> 1 then raise exception 'anon visibility failed'; end if;
 begin
  insert into public.property_collections(slug,title) values ('rls-test-attack','Attack');
  raise exception 'anon INSERT allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.property_collections set title='Attack' where slug='rls-test-published';
  raise exception 'anon UPDATE allowed';
 exception when insufficient_privilege then null; end;
 begin
  delete from public.property_collections where slug='rls-test-published';
  raise exception 'anon DELETE allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- A signed-in visitor, including forged user_metadata, must have no staff rights.
select set_config('request.jwt.claims','{"role":"authenticated","sub":"bb91ce14-71ad-4654-9891-a09459e00b99","user_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$
declare affected integer;
begin
 if (select count(*) from public.property_collections where slug like 'rls-test-%') <> 1 then raise exception 'viewer visibility failed'; end if;
 begin
  insert into public.property_collections(slug,title,created_by,updated_by) values ('rls-test-attack','Attack',auth.uid(),auth.uid());
  raise exception 'viewer INSERT allowed';
 exception when insufficient_privilege then null; end;
 update public.property_collections set title='Attack',updated_by=auth.uid() where slug='rls-test-published';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'viewer UPDATE allowed'; end if;
 begin
  delete from public.property_collections where slug='rls-test-published';
  raise exception 'viewer DELETE allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Use an existing active staff member without changing their account or session.
do $$
declare staff_id uuid;
begin
 select id into staff_id from public.profiles where role::text in ('editor','admin','owner') and deleted_at is null limit 1;
 if staff_id is null then raise exception 'No active staff profile to test'; end if;
 perform set_config('request.jwt.claims',json_build_object('role','authenticated','sub',staff_id)::text,true);
end $$;
set local role authenticated;
do $$
declare affected integer;
begin
 if (select count(*) from public.property_collections where slug like 'rls-test-%') <> 3 then raise exception 'staff visibility failed'; end if;
 insert into public.property_collections(slug,title,created_by,updated_by) values ('rls-test-staff','Staff created',auth.uid(),auth.uid());
 update public.property_collections set title='Staff updated',status='published',updated_by=auth.uid() where slug='rls-test-draft';
 get diagnostics affected = row_count;
 if affected <> 1 then raise exception 'staff UPDATE failed'; end if;
 begin
  update public.property_collections set slug='rls-test-renamed' where slug='rls-test-draft';
  raise exception 'immutable slug was changed';
 exception when insufficient_privilege then null; end;
 begin
  update public.property_collections set price_min=3000,price_max=2000,updated_by=auth.uid() where slug='rls-test-draft';
  raise exception 'invalid price range allowed';
 exception when check_violation then null; end;
 update public.property_collections set status='archived',updated_by=auth.uid() where slug='rls-test-draft';
 begin
  delete from public.property_collections where slug='rls-test-staff';
  raise exception 'staff DELETE allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.property_collections where slug='rls-test-draft') then raise exception 'archived theme leaked'; end if;
end $$;
reset role;
rollback;
select 'PASS: anon/viewer/staff visibility and CRUD restrictions, publish/archive, immutable slug, price constraints; fixtures rolled back' as result;
